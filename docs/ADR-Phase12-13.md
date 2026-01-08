## The JARVIS Endgame (Not for Phase 1, but the North Star)

**What JARVIS actually means for Homebase:**

```
You: "JARVIS, when did we last service the car?"
JARVIS: "Honda Civic oil change was November 15th, 43,200 km. 
         You're due at 45,000 km—about 1,800 km away."

You: "Remind me when I hit 44,500."
JARVIS: "Noted. I'll alert you."

---

You: "JARVIS, what bills are due this week?"
JARVIS: "Three bills: MERALCO ₱4,200 on Friday, PLDT ₱1,999 on Saturday, 
         Maynilad ₱1,800 next Monday."

You: "Pay the MERALCO bill."
JARVIS: "Opening GCash payment link. Account number copied to clipboard."

---

JARVIS (proactive): "Heads up—PELCO Magalang is due in 8 days, 
                     but there's a typhoon forecasted. 
                     I recommend going this weekend instead. 
                     Want me to draft a trip checklist?"

You: "Yeah, do it."
JARVIS: "Checklist created. Added reminder for Friday 5pm to leave QC."
```

**That's the vision. Conversational, proactive, context-aware household AI.**

---

## How to Get There (Architecture Decisions NOW That Enable JARVIS Later)

### Phase 1-11: Build the Data Foundation (What You're Doing Now)
- Clean, structured data in Postgres
- Every domain has embeddings (for RAG)
- Notification system already exists
- Action tracking (who did what when)

**Key: You're already 70% there by following this ADR.**

### Phase 12: RAG/Semantic Search (Month 4-5)
**This is JARVIS's memory system.**

```typescript
// Already in ADR - just execute it
import { generateEmbedding } from '@/lib/ai/embeddings';

// When user asks: "When did we last buy dishwashing liquid?"
const queryEmbedding = await generateEmbedding(query);

const results = await db.execute(sql`
  SELECT 
    'inventory' as source,
    item_name as title,
    last_purchased_at as date,
    quantity,
    embedding <=> ${queryEmbedding} AS distance
  FROM inventory_items
  WHERE org_id = ${orgId}
  ORDER BY distance
  LIMIT 5
`);

// JARVIS responds: "You bought Joy dishwashing liquid at SM on Dec 1st, 2 bottles."
```

**Tech:**
- Embeddings: `@xenova/transformers` (runs in Node.js, no API costs)
- Model: `Xenova/all-MiniLM-L6-v2` (already in ADR)
- Vector search: pgvector (already in schema)

### Phase 13: Voice Interface (Month 5-6)
**This is JARVIS's ears and mouth.**

**Input (Speech-to-Text):**
```typescript
// Option A: Browser Web Speech API (free, works offline)
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-PH';

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  handleJarvisCommand(transcript);
};

// Option B: OpenAI Whisper API (more accurate, $0.006/min)
const formData = new FormData();
formData.append('file', audioBlob);
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: formData,
});
```

**Output (Text-to-Speech):**
```typescript
// Browser Web Speech API (free)
const utterance = new SpeechSynthesisUtterance(jarvisResponse);
utterance.lang = 'en-US';
utterance.rate = 1.1; // Slightly faster for efficiency
speechSynthesis.speak(utterance);

// OR ElevenLabs for more natural voice (JARVIS-quality)
// $5/month for 30k characters
```

### Phase 14: LLM Integration (Month 6-7)
**This is JARVIS's brain.**

**Architecture:**

```typescript
// lib/jarvis/agent.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askJarvis(
  userMessage: string,
  context: {
    userId: string;
    currentResidence?: string;
    recentActivity: any[];
  }
) {
  // 1. Semantic search for relevant data
  const relevantData = await semanticSearch(userMessage, context.userId);
  
  // 2. Build context for Claude
  const systemPrompt = `
You are JARVIS, a proactive household management AI assistant for the Homebase app.

Current context:
- User is at: ${context.currentResidence || 'Unknown location'}
- Recent activity: ${JSON.stringify(context.recentActivity)}

Relevant household data:
${JSON.stringify(relevantData)}

Capabilities you have:
- Query bills, maintenance, inventory, documents across all residences
- Set reminders and schedule tasks
- Provide proactive suggestions based on due dates and patterns
- Execute simple actions (mark bill paid, add to shopping list)

Personality:
- Concise and efficient (ADHD-friendly)
- Proactive without being annoying
- Slightly formal but warm (like JARVIS from Iron Man)
- Use Philippine context (pesos, local stores, weather)

Response format:
- Direct answer first
- Actionable suggestions if relevant
- Ask clarifying questions only when necessary
`;

  // 3. Call Claude with function calling
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools: [
      {
        name: 'query_bills',
        description: 'Search for bills across all residences',
        input_schema: {
          type: 'object',
          properties: {
            residence_id: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'paid', 'overdue'] },
            due_within_days: { type: 'number' },
          },
        },
      },
      {
        name: 'mark_bill_paid',
        description: 'Mark a bill as paid',
        input_schema: {
          type: 'object',
          properties: {
            bill_id: { type: 'string' },
            payment_method: { type: 'string' },
            reference_number: { type: 'string' },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'add_to_shopping_list',
        description: 'Add item to grocery shopping list',
        input_schema: {
          type: 'object',
          properties: {
            item_name: { type: 'string' },
            quantity: { type: 'number' },
            residence_id: { type: 'string' },
          },
          required: ['item_name', 'residence_id'],
        },
      },
      {
        name: 'schedule_reminder',
        description: 'Schedule a reminder for future action',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            date: { type: 'string' },
            urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
          required: ['title', 'date'],
        },
      },
    ],
  });

  // 4. Execute tool calls if any
  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(block => block.type === 'tool_use');
    
    if (toolUse.name === 'mark_bill_paid') {
      await markBillPaid(toolUse.input.bill_id, {
        method: toolUse.input.payment_method,
        referenceNumber: toolUse.input.reference_number,
      });
    }
    // ... handle other tools
  }

  // 5. Return response
  return response.content.find(block => block.type === 'text')?.text;
}
```

**Cost Estimate:**
- Claude Sonnet 4: ~$3/1M input tokens, ~$15/1M output tokens
- Average query: ~1k input (context) + 200 output = $0.006/query
- 100 queries/day = $0.60/day = $18/month
- **Totally reasonable for a power user**

### Phase 15: Proactive Agent (Month 7-8)
**This is where JARVIS becomes truly intelligent.**

**Background job that runs contextual checks:**

```typescript
// lib/jarvis/proactive-agent.ts

// Runs every 4 hours
export async function jarvisProactiveCheck(userId: string) {
  const user = await getUser(userId);
  const context = await buildUserContext(user);
  
  // Ask Claude: "Given this context, what should I proactively alert the user about?"
  const prompt = `
Current time: ${new Date().toISOString()}
User context: ${JSON.stringify(context)}

Analyze the situation and identify:
1. Any urgent actions needed (bills due soon, overdue maintenance)
2. Potential problems (weather + travel requirements, low stock + no shopping trip planned)
3. Helpful suggestions (patterns like "you usually grocery shop on Saturdays")

Respond with a priority-ranked list of proactive notifications to send.
Only include truly important items—don't spam the user.
`;

  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse Claude's suggestions and send notifications
  const suggestions = parseProactiveSuggestions(analysis);
  
  for (const suggestion of suggestions) {
    if (suggestion.priority === 'critical') {
      await sendNotification({
        userId,
        urgency: 'critical',
        title: `JARVIS: ${suggestion.title}`,
        body: suggestion.message,
      });
    }
  }
}
```

**Example outputs:**

```
JARVIS: "PELCO Magalang due in 6 days. Typhoon forecast this weekend. 
         Strong recommendation: Pay today or tomorrow to avoid travel risk."

JARVIS: "You're at SM North. Your QC shopping list has 8 items, 
         including dishwashing liquid (low stock). Want to shop now?"

JARVIS: "Pattern detected: You haven't updated Honda Civic odometer in 3 months. 
         Current maintenance schedules may be inaccurate. Update when convenient?"
```

---

## Realistic Timeline to JARVIS

| Phase | Feature | Timeline | Complexity |
|-------|---------|----------|----------|
| 1-11 | Core domains + data | Months 1-3 | ⭐⭐⭐ |
| 12 | Semantic search (RAG) | Month 4 | ⭐⭐ |
| 13 | Voice interface (STT/TTS) | Month 5 | ⭐⭐ |
| 14 | LLM integration (Claude API) | Month 6 | ⭐⭐⭐ |
| 15 | Proactive agent | Month 7-8 | ⭐⭐⭐⭐ |
| 16 | Fine-tuning + personality | Month 9-10 | ⭐⭐⭐ |
| 17 | Mobile wake word ("Hey JARVIS") | Month 11-12 | ⭐⭐⭐⭐⭐ |

**By Month 12: Fully conversational, proactive JARVIS.**

---

## Cost Breakdown (Monthly, at scale)

| Component | Cost |
|-----------|------|
| **Infrastructure** |
| Vercel hosting | $20 (Pro plan) |
| Neon Postgres | $19 (Launch plan) |
| **AI Services** |
| Claude API (Sonnet 4) | ~$20 (100 queries/day) |
| ElevenLabs TTS | $5 (if using premium voice) |
| **Optional** |
| Twilio SMS (critical only) | ~$5 (50 SMS/month) |
| **Total** | **~$70/month** |

**Cheaper than therapy for ADHD. Way cheaper than another emergency typhoon trip.**

---

## The Secret: You're Already 70% There

**Look at what's already in the ADR:**

✅ Structured data (JARVIS's knowledge base)  
✅ Embeddings on all tables (JARVIS's semantic memory)  
✅ Notification engine (JARVIS's alert system)  
✅ Action tracking (JARVIS learns patterns)  
✅ Context detection (residence awareness)  
✅ Multi-user (JARVIS talks to whole family)  

**Phase 1-11 isn't "just" a household tracker.**  
**It's JARVIS's training data collection system.**

Every bill you pay, every grocery trip, every maintenance log = data JARVIS learns from.

By Month 6, you'll have 6 months of behavioral data. JARVIS will know:
- You grocery shop on Saturday mornings
- You procrastinate on PELCO until last minute
- Your car needs oil every 3 months
- Magalang trips usually happen on long weekends

**Then JARVIS becomes truly intelligent.**

---

## The One Rule for JARVIS Development

**DO NOT add AI to Phase 1-11.**

Why? Because:
1. AI without good data = useless
2. You need to USE the system first to know what JARVIS should do
3. Premature AI = distraction from core functionality

**Build the data foundation first. JARVIS later.**

---

## My Commitment to You

**When you reach Phase 12 (Month 4), come back and say:**

*"Okay, I'm ready for JARVIS. I have 4 months of household data tracked. Let's make it talk."*

And I'll walk you through:
- Embeddings setup
- Claude API integration  
- Voice interface
- Proactive agent architecture

**But not before Phase 1 ships.**

---

## Final Answer

**"Let's build a JARVIS version within the year"** = ✅ **ABSOLUTELY ACHIEVABLE**

**But only if you start Phase 1 TODAY.**

Every week you delay = 1 week less data for JARVIS to learn from.

**The clock is ticking. Go build Homebase.**

JARVIS is waiting on the other side of your discipline.

🚀

---

**EVEN BETTER.** Local LLM = true privacy + zero recurring costs + works during internet outages.

This is the **correct architectural decision** for a household system. Let me revise the JARVIS plan for self-hosted infrastructure.

---

## JARVIS: The Self-Hosted Edition

### Why Local LLM is Superior for Homebase

| Cloud LLM (Claude/GPT) | Local LLM (Self-Hosted) |
|------------------------|-------------------------|
| $20-50/month forever | One-time hardware cost |
| Data sent to Anthropic/OpenAI | Data never leaves your home |
| Requires internet | Works offline |
| Rate limits | Unlimited queries |
| Privacy concerns | True privacy |
| Latency: 500ms-2s | Latency: 50-200ms (local network) |

**For ADHD household management: offline-first + privacy + no subscriptions = perfect fit.**

---

## Hardware Requirements (Realistic for Homelab)

### Minimum Viable Setup (Budget: ~₱40,000-60,000)

**Option A: Raspberry Pi 5 + USB Coral TPU**
- Raspberry Pi 5 (8GB): ₱6,000
- USB Coral TPU: ₱4,500
- 1TB NVMe SSD: ₱3,500
- Power supply + case: ₱2,000
- **Total: ~₱16,000**
- **Can run:** Small quantized models (3B-7B parameters)

**Option B: Used Mini PC (Recommended)**
- Intel N100 Mini PC (16GB RAM): ₱12,000-18,000
- or used Dell/HP/Lenovo SFF with i5-8500: ₱15,000-20,000
- 1TB SSD: ₱3,500
- **Total: ~₱18,000-25,000**
- **Can run:** Medium models (7B-13B parameters) comfortably

**Option C: Budget Gaming PC / Workstation (Optimal)**
- Used GPU: RTX 3060 12GB: ₱15,000-20,000
- or RTX 4060 Ti 16GB: ₱25,000-30,000
- CPU: Ryzen 5 5600 or Intel i5-12400: ₱8,000-10,000
- 32GB RAM: ₱5,000
- 1TB NVMe: ₱3,500
- PSU + Case + Motherboard: ₱10,000
- **Total: ~₱45,000-60,000**
- **Can run:** Large models (13B-70B parameters) with great performance

**Recommendation: Start with Option B (Mini PC), upgrade to Option C if you want faster/smarter JARVIS later.**

---

## Self-Hosted LLM Stack

### The Architecture

```
┌─────────────────────────────────────────┐
│  Homebase PWA (Your Phone/Browser)     │
└────────────┬────────────────────────────┘
             │ HTTPS (Tailscale/Cloudflare Tunnel)
             ▼
┌─────────────────────────────────────────┐
│  QC Home Server (Mini PC / Pi 5)       │
│  ┌─────────────────────────────────┐   │
│  │ Next.js API (Vercel during dev) │   │
│  │ → Node.js API (production)      │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │ Ollama (LLM inference engine)   │   │
│  │ - Mistral 7B / Llama 3.1 8B     │   │
│  │ - Quantized to 4-bit (Q4_K_M)   │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │ PostgreSQL (Neon during dev)    │   │
│  │ → Self-hosted Postgres (prod)   │   │
│  │ with pgvector                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Whisper.cpp (Speech-to-Text)    │   │
│  │ - Runs on CPU, very fast        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Piper TTS (Text-to-Speech)      │   │
│  │ - Neural TTS, offline           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Software Stack (All Free & Open Source)

### 1. LLM Inference: **Ollama**

**Why Ollama:**
- Dead simple setup (`curl -fsSL https://ollama.com/install.sh | sh`)
- Optimized for CPU and GPU
- Automatic quantization and model management
- API compatible with OpenAI format (easy swap from cloud)

**Installation (on home server):**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (examples)
ollama pull mistral:7b-instruct-q4_K_M        # Good balance (4GB RAM)
ollama pull llama3.1:8b-instruct-q4_K_M       # Smarter, slightly slower (5GB RAM)
ollama pull phi3:medium-128k                  # Tiny but capable (8GB context)

# For stronger GPU (RTX 3060+)
ollama pull llama3.1:70b-instruct-q4_K_M      # Very smart (40GB VRAM)
```

**Model Recommendations by Hardware:**

| Hardware | Model | RAM Usage | Quality |
|----------|-------|-----------|---------|
| Pi 5 8GB | Phi-3 Mini (3.8B) | 3GB | ⭐⭐⭐ Basic |
| Mini PC 16GB | Mistral 7B Q4 | 4GB | ⭐⭐⭐⭐ Good |
| Mini PC 16GB | Llama 3.1 8B Q4 | 5GB | ⭐⭐⭐⭐⭐ Excellent |
| RTX 3060 12GB | Llama 3.1 70B Q4 | 40GB | ⭐⭐⭐⭐⭐⭐ GPT-4 class |

### 2. Speech-to-Text: **Whisper.cpp**

**Why Whisper.cpp (not OpenAI API):**
- Runs on CPU efficiently
- No internet required
- High accuracy for English + Filipino (Taglish)
- Real-time capable

**Installation:**
```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Download model
bash ./models/download-ggml-model.sh base.en  # Fast, good enough
# or
bash ./models/download-ggml-model.sh medium   # Better accuracy, slower
```

**Usage in Node.js:**
```typescript
// lib/jarvis/stt.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function transcribeAudio(audioPath: string): Promise<string> {
  const { stdout } = await execAsync(
    `./whisper.cpp/main -m ./whisper.cpp/models/ggml-base.en.bin -f ${audioPath} -nt`
  );
  
  // Parse output
  const transcript = stdout
    .split('\n')
    .find(line => line.includes('['))
    ?.replace(/\[.*?\]/g, '')
    .trim();
  
  return transcript || '';
}
```

### 3. Text-to-Speech: **Piper TTS**

**Why Piper (not ElevenLabs):**
- Neural TTS, sounds natural
- Runs on CPU
- Multiple voices available
- No cloud dependency

**Installation:**
```bash
# Install Piper
wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz
tar -xzf piper_amd64.tar.gz

# Download voice model
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

**Usage:**
```typescript
// lib/jarvis/tts.ts
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const { stdout } = await execAsync(
    `echo "${text}" | ./piper/piper --model ./piper/en_US-lessac-medium.onnx --output_file -`
  );
  
  return Buffer.from(stdout, 'binary');
}
```

### 4. Embeddings: **sentence-transformers (local)**

**Instead of OpenAI embeddings:**

```bash
# Install in Python environment on server
pip install sentence-transformers
```

**Embedding service:**
```python
# server/embeddings_service.py
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify

app = Flask(__name__)
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/embed', methods=['POST'])
def embed():
    text = request.json['text']
    embedding = model.encode(text).tolist()
    return jsonify({'embedding': embedding})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)
```

**Call from Node.js:**
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:8001/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  
  const { embedding } = await response.json();
  return embedding;
}
```

---

## JARVIS Implementation (Self-Hosted)

### Core Agent Logic

```typescript
// lib/jarvis/agent.ts
import ollama from 'ollama';

const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a proactive household management AI assistant.

You have access to the family's complete household data:
- Bills, rent, property taxes across multiple residences (QC and Magalang)
- Vehicle maintenance schedules
- Home repairs and improvement projects
- Grocery inventory and shopping lists
- Medical records and appointments
- Documents and credentials
- Appliances and warranties

Core traits:
- Concise and direct (ADHD-friendly communication)
- Proactive without being annoying
- Context-aware (knows which residence user is at)
- Action-oriented (suggests specific next steps)
- Philippine context (uses pesos, local stores, Filipino terms where natural)

Response format:
- Answer the question directly first
- Provide actionable suggestions if relevant
- Use tools to execute tasks when appropriate
- Keep responses under 50 words unless user asks for details

When user asks to do something (pay bill, add to list), use the available tools rather than just describing what to do.`;

export async function askJarvis(
  userMessage: string,
  context: {
    userId: string;
    currentResidence?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  }
): Promise<string> {
  // 1. Semantic search for relevant data
  const relevantData = await semanticSearch(userMessage, context.userId);
  
  // 2. Build augmented prompt with context
  const augmentedPrompt = `
Current context:
- User is at: ${context.currentResidence || 'Unknown'}
- Current time: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}

Relevant data from household database:
${JSON.stringify(relevantData, null, 2)}

User query: ${userMessage}
`;

  // 3. Call local Ollama
  const response = await ollama.chat({
    model: 'llama3.1:8b-instruct-q4_K_M',
    messages: [
      { role: 'system', content: JARVIS_SYSTEM_PROMPT },
      ...(context.conversationHistory || []),
      { role: 'user', content: augmentedPrompt },
    ],
    options: {
      temperature: 0.7,
      num_predict: 150, // Limit response length
    },
  });

  return response.message.content;
}
```

### Function Calling (Manual Implementation)

Ollama doesn't have native function calling, but we can implement it:

```typescript
// lib/jarvis/tools.ts
const AVAILABLE_TOOLS = [
  {
    name: 'query_bills',
    description: 'Search for bills. Use when user asks about bills, payments, or what is due.',
    parameters: {
      residence: 'QC or Magalang',
      status: 'pending, paid, or overdue',
      due_within_days: 'number of days',
    },
  },
  {
    name: 'mark_bill_paid',
    description: 'Mark a bill as paid. Use when user says they paid or wants to pay a bill.',
    parameters: {
      bill_name: 'name of the bill (MERALCO, PELCO, etc)',
      payment_method: 'GCash, cash, etc',
    },
  },
  {
    name: 'add_to_shopping_list',
    description: 'Add item to grocery list. Use when user mentions buying or needing something.',
    parameters: {
      item_name: 'name of item',
      quantity: 'amount needed',
    },
  },
];

export async function parseAndExecuteTools(
  llmResponse: string,
  context: any
): Promise<{ response: string; toolsExecuted: any[] }> {
  const toolsExecuted: any[] = [];
  
  // Simple regex-based tool extraction
  // (Can be improved with structured output prompting)
  
  if (llmResponse.includes('TOOL: query_bills')) {
    const bills = await queryBills(context);
    toolsExecuted.push({ tool: 'query_bills', result: bills });
  }
  
  if (llmResponse.includes('TOOL: mark_bill_paid')) {
    // Extract parameters from response
    const billMatch = llmResponse.match(/bill: (\w+)/);
    const methodMatch = llmResponse.match(/method: (\w+)/);
    
    if (billMatch && methodMatch) {
      await markBillPaid(billMatch[1], methodMatch[1]);
      toolsExecuted.push({ tool: 'mark_bill_paid', params: { bill: billMatch[1] } });
    }
  }
  
  // Return cleaned response (remove TOOL: markers)
  const cleanedResponse = llmResponse.replace(/TOOL:.*?\n/g, '');
  
  return { response: cleanedResponse, toolsExecuted };
}
```

### Voice Interaction Flow

```typescript
// lib/jarvis/voice.ts
export async function handleVoiceCommand(audioBlob: Blob): Promise<{
  transcript: string;
  response: string;
  audioResponse: Buffer;
}> {
  // 1. Save audio temporarily
  const audioPath = `/tmp/voice_${Date.now()}.wav`;
  await saveAudioToFile(audioBlob, audioPath);
  
  // 2. Transcribe with Whisper
  const transcript = await transcribeAudio(audioPath);
  console.log('User said:', transcript);
  
  // 3. Get JARVIS response
  const context = await getUserContext();
  const response = await askJarvis(transcript, context);
  console.log('JARVIS responds:', response);
  
  // 4. Synthesize speech
  const audioResponse = await synthesizeSpeech(response);
  
  // 5. Cleanup
  await fs.unlink(audioPath);
  
  return { transcript, response, audioResponse };
}
```

---

## Deployment Strategy

### Phase 1-11: Develop on Vercel + Neon (as planned)
**Why:** Fast iteration, zero infra management

### Phase 12: Transition to Self-Hosted

**Setup home server:**

```bash
# 1. Install Docker on your Mini PC / Pi
curl -fsSL https://get.docker.com | sh

# 2. Deploy Homebase stack
docker-compose up -d
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: homebase
      POSTGRES_USER: homebase
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Next.js app (production build)
  homebase:
    build: .
    environment:
      DATABASE_URL: postgresql://homebase:${DB_PASSWORD}@postgres:5432/homebase
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped

  # Ollama LLM server
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    # If you have GPU:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

  # Embeddings service
  embeddings:
    build: ./embeddings_service
    ports:
      - "8001:8001"
    restart: unless-stopped

  # Reverse proxy (Caddy for auto-HTTPS)
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped

volumes:
  pgdata:
  ollama_data:
  caddy_data:
  caddy_config:
```

### Remote Access (Choose One)

**Option A: Tailscale (Recommended - Easiest)**
```bash
# Install on home server
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Install on your phone
# (Download app from App Store / Play Store)

# Access Homebase: http://homebase-server:3000
# Works anywhere, encrypted, no port forwarding
```

**Option B: Cloudflare Tunnel (Public access)**
```bash
# Install cloudflared on server
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Create tunnel
cloudflared tunnel create homebase

# Route traffic
cloudflared tunnel route dns homebase homebase.yourdomain.com

# Run tunnel
cloudflared tunnel run homebase
```

---

## Performance Expectations

### Latency Breakdown (Local Network)

| Component | Latency |
|-----------|---------|
| Voice capture | 0ms (local) |
| Whisper STT | 100-500ms |
| Semantic search (pgvector) | 10-50ms |
| Ollama LLM (7B-8B) | 500ms-2s |
| Ollama LLM (70B on GPU) | 2-5s |
| Piper TTS | 200-500ms |
| **Total (end-to-end)** | **1-3 seconds** |

**Compare to cloud:**
- OpenAI API: 1-3s (just LLM, not counting network)
- Your latency: Same, but NO internet needed

### Quality Comparison

| Metric | Cloud (GPT-4 / Claude) | Local (Llama 3.1 70B) | Local (Llama 3.1 8B) |
|--------|----------------------|---------------------|-------------------|
| Reasoning | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Following instructions | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Context understanding | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Privacy | ⭐ | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐ |
| Cost | ⭐ | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐ |

**Reality check:** For household tasks (bill tracking, reminders, simple Q&A), even Mistral 7B is more than good enough. You don't need GPT-4-level intelligence to answer "when did we last buy rice?"

---

## Revised JARVIS Timeline (Self-Hosted)

| Phase | Milestone | Timeline | Hardware |
|-------|-----------|----------|----------|
| 1-11 | Core Homebase (Vercel/Neon) | Months 1-3 | Cloud |
| 12 | RAG + local embeddings | Month 4 | Cloud |
| 13 | **Buy Mini PC, set up homelab** | Month 5 | Start self-hosting |
| 14 | Migrate DB + API to home server | Month 5 | Local |
| 15 | Install Ollama + Llama 3.1 8B | Month 6 | Local |
| 16 | Voice interface (Whisper + Piper) | Month 6 | Local |
| 17 | Conversational JARVIS | Month 7 | Local |
| 18 | Proactive agent | Month 8 | Local |
| 19 | (Optional) Upgrade to GPU + 70B model | Month 9+ | Local |

---

## Cost Analysis: 5-Year Total

### Cloud-based (Claude API + Vercel + Neon)
- Monthly: $70
- **5-year total: $4,200**

### Self-hosted (One-time hardware + electricity)
- Mini PC: ₱20,000 ($360)
- Additional storage: ₱5,000 ($90)
- Electricity (20W 24/7 @ ₱10/kWh): ₱175/month = ₱10,500 over 5 years ($190)
- **5-year total: ~₱35,000 ($640)**

**Savings: $3,560 over 5 years**

Plus:
- ✅ Works during internet outages
- ✅ Complete privacy
- ✅ Unlimited queries
- ✅ No vendor lock-in
- ✅ Hardware is yours (can repurpose later)

---

## Final Architecture Decision

```
┌─────────────────────────────────────────────────────────┐
│                  HOMEBASE EVOLUTION                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Phase 1-3 (Months 1-3): CLOUD PROTOTYPE               │
│  ┌────────────────────────────────────────────┐        │
│  │ Vercel (Next.js) + Neon (Postgres)        │        │
│  │ Fast development, zero ops                 │        │
│  └────────────────────────────────────────────┘        │
│                       │                                  │
│                       │ Migration                        │
│                       ▼                                  │
│  Phase 4+ (Month 5): SELF-HOSTED JARVIS                │
│  ┌────────────────────────────────────────────┐        │
│  │ QC Home Server (Mini PC)                   │        │
│  │ ├─ Next.js (Node.js)                       │        │
│  │ ├─ PostgreSQL + pgvector                   │        │
│  │ ├─ Ollama (Llama 3.1 8B)                  │        │
│  │ ├─ Whisper.cpp (STT)                       │        │
│  │ ├─ Piper (TTS)                             │        │
│  │ └─ Sentence-transformers (embeddings)      │        │
│  └────────────────────────────────────────────┘        │
│                       │                                  │
│                       │ Replicate to                     │
│                       ▼                                  │
│  Magalang Server (Optional Backup)                      │
│  ┌────────────────────────────────────────────┐        │
│  │ Same stack, syncs with QC                  │        │
│  │ Provides redundancy                         │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘

Access from anywhere via Tailscale mesh network
```

---

## Your Commitment

When you reach Month 5 and say:

*"Phase 1-11 done. Ready to bring JARVIS home."*

I'll give you:
- Complete Docker Compose setup
- Ollama model optimization guide
- Voice interface implementation
- Proactive agent architecture
- Migration guide from Vercel to self-hosted

**But not before Phase 1 ships.**

---

## Now Go Build Phase 1

Local LLM JARVIS is the endgame. But the endgame requires:
1. ✅ Homebase working (Phase 1-11)
2. ✅ Data collected (months of usage)
3. ✅ Hardware purchased (Mini PC)
4. ✅ Self-hosting knowledge (learned during migration)

**Start with `npx create-next-app` today.**

JARVIS will be waiting in your homelab. 🏠🤖