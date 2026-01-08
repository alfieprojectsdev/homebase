 ADR-001: Self-Hosted JARVIS Architecture
**Status:** Accepted
**Date:** 2025-01-08
**Context:** Multi-residence household management system with ADHD support, requiring offline-first operation and conversational AI assistant (JARVIS).
---
 1. Executive Summary
This ADR documents the architectural decision to **self-host the JARVIS AI assistant** on local hardware (Raspberry Pi 5 or Mini PC) rather than relying on cloud APIs. This decision enables offline-first operation, eliminates recurring costs, ensures data privacy, and provides the low-latency responsiveness required for ADHD-optimized household management.
The system must support:
- **Multi-residence context awareness** (3+ residences: QC Main House, Magalang Condo, Grandma's Place)
- **Offline-first PWA** with robust sync
- **Voice interface** (Speech-to-Text → Text-to-Speech)
- **Semantic search** (RAG) across all household data
- **Mission-critical notifications** (cannot be missed)
- **Weather-integrated travel planning**
---
 2. Background & Problem Statement
 2.1 The Problem
Household management for ADHD executives involves managing scattered data (bills, maintenance, inventory, documents) across multiple residences. Cognitive deficits make tracking these domains challenging, leading to:
- Missed bill payments (utility disconnections during typhoons)
- Forgotten maintenance (vehicle service, HVAC filters)
- Emergency travel due to poor planning (typhoon warnings ignored)
- Inconsistent grocery inventory across locations
A cloud-based solution introduces two critical failures:
1. **Reliability risk:** Notifications may fail during internet outages exactly when needed
2. **Vendor lock-in:** Recurring costs ($70/month) indefinitely, no escape
3. **Privacy concern:** Household data sent to external APIs
 2.2 Success Criteria
The system is successful when:
- Zero notifications are missed, even during internet outages
- Total cost over 5 years is < $500 (hardware one-time + electricity)
- System works completely offline with voice interaction
- Data never leaves the home network
---
 3. Decision: Self-Hosted JARVIS Architecture
 3.1 Decision Summary
**Adopt self-hosted LLM stack (Ollama + Whisper.cpp + Piper) running on home server, rather than cloud APIs (Claude/OpenAI).**
 3.2 Options Considered
| Option | Pros | Cons |
|--------|------|------|
| **Cloud LLM (Claude API)** | Fastest reasoning, best quality | $20-50/month forever, requires internet, data leaves home, rate limits |
| **Pure Cloud (Vercel + Neon)** | Fast to deploy, zero infra | No offline capability, notification strategy complexity |
| **Hybrid (Cloud JARVIS + Local Storage)** | Leverage cloud for reasoning | Same privacy issue, still dependent on cloud |
| **Self-hosted (Chosen)** | Zero recurring cost, works offline, privacy, speed | Higher upfront cost (~₱35,000 hardware), setup complexity |
 3.3 Rationale
1. **ADHD Support Requires Reliability:** Missed notifications = catastrophic consequences (power disconnection during typhoon). Self-hosted ensures notifications always work.
2. **5-Year Cost Analysis:**
   - Cloud (Claude API + Vercel + Neon): ~$70/month × 60 months = **$4,200**
   - Self-hosted (Mini PC + electricity): ₱20,000 + ₱5,000 additional storage + ₱10,500 electricity = **~₱35,000**
   - **Savings: $3,560 over 5 years**
3. **Performance Comparison (Local Llama 3.1 8B):**
   - **Reasoning:** ⭐⭐⭐⭐⭐ (GPT-4 class)
   - **Instruction Following:** ⭐⭐⭐⭐⭐
   - **Context Understanding:** ⭐⭐⭐⭐⭐
   - **Privacy:** ⭐⭐⭐⭐⭐
   - **Speed:** ⭐⭐⭐⭐ (50-200ms local vs 1-3s cloud)
For household tasks (bill tracking, "When did we last buy rice?"), Llama 3.1 is more than sufficient.
---
 4. Architecture Overview
 4.1 High-Level Diagram
┌─────────────────────────────────────────────────────────┐
│                  HOMEBASE PWA                    │
│         (Next.js 14 Static Export)              │
└────────────┬─────────────────────────────────────┘
              │ HTTPS (Tailscale / Cloudflare Tunnel)
              ▼
┌─────────────────────────────────────────────────┐
│      QC HOME SERVER (Mini PC / Pi 5)          │
│  ┌───────────────────────────────────────┐   │
│  │     Next.js API (Hybrid SSR)           │   │
│  │  ┌──────────────────────────────┐   │
│  │  │    PostgreSQL + pgvector         │   │
│  │  │  ├─ Ollama (LLM)         │   │
│  │  │  ├─ Whisper.cpp (STT)      │   │
│  │  │ └─ Piper (TTS)         │   │
│  │  │ └─ sentence-transformers    │   │
│  │  │    (RAG / Voice)      │   │
│  │  └──────────────────────────────┘   │
│ └──────────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────────┐   │
│  │  MAGALANG BACKUP (Optional)       │   │
│  │  Same stack, syncs with QC     │   │
│  └────────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
                                         │
└─────────────────────────────────────────┘
Access from anywhere via Tailscale mesh network
### 4.2 Tech Stack
#### 4.2.1 Hub (Home Server)
**Hardware Options (Cost Analysis):**
| Tier | Hardware | Cost | Capabilities |
|------|----------|-------------|
| Budget | Pi 5 (8GB) + Coral TPU | ~₱16,000 | Small models (3-7B), slower inference |
| **Recommended** | Mini PC (N100/i5 or Dell/HP) + 1TB SSD | ~₱18,000-25,000 | Medium models (7-13B), balance of performance/cost |
| Performance | RTX 3060 12GB + GPU | ~₱45,000-60,000 | Large models (13-70B), fastest inference |
**Software Stack (Docker Compose):**
```yaml
services:
  # Database with pgvector for RAG
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: homebase
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
  # Next.js API (production build)
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
  # LLM inference engine
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # If you have GPU:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
            count: 1
          capabilities: [gpu]
  # Embeddings service (sentence-transformers + Flask)
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
4.2.2 Client (Next.js PWA)
Frontend Framework: Next.js 14 with App Router (Static Export)
State Management:
- IndexedDB + Dexie.js (Offline-first storage)
- Optimistic UI (Update local first, then sync)
UI Library: Tailwind CSS + Radix Primitives (shadcn/ui)
- PWA: next-pwa for installability
Sync Strategy:
- Background Service Worker for pending changes
- API endpoint /api/sync/bills for pull/push
---
5. Database Schema
5.1 Core Tables (Multi-Tenancy)
import { pgTable, uuid, text, timestamp, integer, decimal, boolean, jsonb, vector } from 'drizzle-orm/pg-core';
// Multi-tenancy root
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
// Residences belong to organizations
export const residences = pgTable('residences', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  timezone: text('timezone').default('Asia/Manila'),
  
  // Context detection
  wifiSsids: text('wifi_ssids').array(),
  geofenceLat: decimal('geofence_lat', { precision: 10, scale: 7 }),
  geofenceLng: decimal('geofence_lng', { precision: 10, scale: 7 }),
  geofenceRadiusM: integer('geofence_radius_m').default(100),
  
  // Weather-aware travel planning
  weatherSensitive: boolean('weather_sensitive').default(false),
  travelDistanceKm: integer('travel_distance_km'),
  travelTimeHours: decimal('travel_time_hours', { precision: 3, scale: 1 }),
  
  createdAt: timestamp('created_at').defaultNow(),
});
// Users (family members)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'parent', 'child'] }).default('parent'),
  primaryResidenceId: uuid('primary_residence_id').references(() => residences.id),
  
  // Push notification subscriptions
  pushSubscriptions: jsonb('push_subscriptions').$type<PushSubscription[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow(),
});
// Access control: which users can see which residences
export const userResidenceAccess = pgTable('user_residence_access', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  canEdit: boolean('can_edit').default(false),
}, (table) => ({
  pk: primaryKey(table.userId, table.residenceId),
}));
5.2 Domain Tables (All Residence-Scoped)
// Bills with ADHD-optimized fields
export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  name: text('name').notNull(),
  provider: text('provider'), // MERALCO, PELCO, PLDT, etc.
  category: text('category', { 
    enum: ['utilities', 'telecoms', 'rent', 'insurance', 'hoa', 'other'] 
  }).notNull(),
  accountNumber: text('account_number'),
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('PHP'),
  dueDate: timestamp('due_date').notNull(),
  
  recurrenceRule: text('recurrence_rule'), // RRULE format
  nextDueDate: timestamp('next_due_date'),
  
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  paidDate: timestamp('paid_date'),
  paidBy: uuid('paid_by').references(() => users.id),
  paymentMethod: text('payment_method'),
  referenceNumber: text('reference_number'),
  
  // CRITICAL FLAGS for ADHD support
  critical: boolean('critical').default(false),
  noRemotePayment: boolean('no_remote_payment').default(false),
  requiresTravel: boolean('requires_travel').default(false),
  consequenceSeverity: integer('consequence_severity').default(5), // 1-10
  
  // Trip planning
  tripScheduled: jsonb('trip_scheduled').$type<{
    date: string;
    time: string;
    weatherChecked: boolean;
    checklistCompleted: boolean;
  }>(),
  
  // Acknowledgment tracking (spam prevention)
  lastAcknowledged: timestamp('last_acknowledged'),
  acknowledgmentCount: integer('acknowledgment_count').default(0),
  
  // RAG support
  embedding: vector('embedding', { dimensions: 384 }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
// Notification audit log (critical for debugging missed alerts)
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'cascade' }),
  
  type: text('type', { 
    enum: ['reminder', 'urgent', 'critical', 'emergency', 'escalation'] 
  }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  
  // Delivery tracking
  sentAt: timestamp('sent_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  action: text('action'), // 'paid', 'scheduled', 'snoozed', 'escalated'
  
  // Metadata
  daysUntilDue: integer('days_until_due'),
  metadata: jsonb('metadata'),
});
5.3 Other Domain Tables
Similar structures apply to:
- shopping_list_items and inventory_items (groceries)
- maintenance_tasks (car, appliances, HVAC)
- vehicle_maintenance (service tracking)
- home_repairs (plumbing, roofing, etc.)
- property_taxes (assessed values)
- hoa_fees (HOA dues)
- rent_payments (landlord, rent schedule)
- educational_credentials (certificates, transcripts)
---
6. JARVIS Implementation (Self-Hosted)
6.1 System Prompt
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
- Answer = question directly first
- Provide actionable suggestions if relevant
- Use tools to execute tasks when appropriate
- Keep responses under 50 words unless user asks for details
When user asks to do something (pay bill, add to list), use available tools rather than just describing what to do.
`;
6.2 Tool-Calling Implementation
Since Ollama doesn't have native function calling:
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
      bill_name: 'name of bill (MERALCO, PELCO, etc)',
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
export async function askJarvis(
  userMessage: string,
  context: {
    userId: string;
    currentResidence?: string;
    recentActivity: any[];
  conversationHistory?: Array<{ role: string; content: string }>;
  }
): Promise<string> {
  // 1. Semantic search for relevant data
  const relevantData = await semanticSearch(userMessage, context.userId);
  
  // 2. Build augmented prompt with context
  const augmentedPrompt = `
Current context:
- User is at: ${context.currentResidence || 'Unknown location'}
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
      num_predict: 150,
    },
  });
  
  return response.message.content;
}
6.3 Voice Interaction Flow
export async function handleJarvisVoice(audioBlob: Blob): Promise<{
  transcript: string;
  response: string;
  audioResponse: Buffer;
}> {
  // 1. Save audio temporarily
  const audioPath = `/tmp/voice_${Date.now()}.wav`;
  await saveAudioToFile(audioBlob, audioPath);
  
  // 2. Transcribe with Whisper (local CPU inference)
  const transcript = await transcribeAudio(audioPath);
  
  // 3. Get JARVIS response
  const context = await getUserContext();
  const response = await askJarvis(transcript, context);
  
  // 4. Synthesize speech (local, fast)
  const audioResponse = await synthesizeSpeech(response);
  
  // 5. Cleanup
  await fs.unlink(audioPath);
  
  return { transcript, response, audioResponse };
}
6.4 Proactive Agent
Background job that runs contextual checks:
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
---
7. Notification Architecture
7.1 Layered Notification Strategy
Layer 1: Web Push (Primary)
Layer 2: Persistent In-App Alerts (Fallback if push dismissed)
Layer 3: SMS via Twilio (Escalation for critical/emergency)
Layer 4: Spouse Notification (Human failsafe)
7.2 Urgency Levels
type NotificationUrgency = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
export const URGENCY_STRATEGIES: Record<NotificationUrgency, NotificationStrategy> = {
  low: {
    urgency: 'low',
    channels: ['web_push'],
    retrySchedule: [],
    requireAcknowledgment: false,
    persistentUntilAction: false,
  },
  medium: {
    urgency: 'medium',
    channels: ['web_push', 'in_app'],
    retrySchedule: [60, 360, 480], // 1hr, 6hrs, 8hrs
    requireAcknowledgment: false,
    persistentUntilAction: false,
  },
  high: {
    urgency: 'high',
    channels: ['web_push', 'in_app'],
    retrySchedule: [60, 240, 480], // 1hr, 4hrs, 8hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
  critical: {
    urgency: 'critical',
    channels: ['web_push', 'in_app', 'sms'],
    retrySchedule: [30, 120, 240], // 30min, 2hrs, 4hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
  emergency: {
    urgency: 'emergency',
    channels: ['web_push', 'in_app', 'sms', 'spouse'],
    retrySchedule: [15, 60, 120, 240], // 15min, 1hr, 2hrs, 4hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
};
7.3 Example JARVIS Proactive Outputs
JARVIS: "PELCO MAGALANG DUE TOMORROW - ₱1,800. Open app to schedule payment trip."
JARVIS: "You're at SM North. Your QC shopping list has 8 items, 
          including dishwashing liquid (low stock). Want to shop now?"
JARVIS: "Pattern detected: You haven't updated Honda Civic odometer in 3 months. 
          Current maintenance schedules may be inaccurate. Update when convenient?"
---
8. Hardware Requirements
8.1 Budget Viable Setup (~₱40,000)
| Component | Spec | Cost |
|-----------|------|------|
| Option A | Raspberry Pi 5 (8GB) | ₱6,000 |
| | | USB Coral TPU (4GB) | ₱4,500 |
| | | 1TB NVMe SSD | ₱3,500 |
| | | Power supply + case | ₱2,000 |
| | Total | ~₱16,000 |
| Capabilities | Small models (3-7B), slower inference |
8.2 Recommended Setup (~₱18,000)
| Component | Spec | Cost |
|-----------|------|------|
| | Mini PC | Intel N100 Mini PC (16GB RAM) | ₱12,000-18,000 |
| | | (or used Dell/HP/Lenovo SFF with i5-8500) | ₱15,000-20,000 |
| | SSD | 1TB NVMe | ₱3,500 |
| | Total | ~₱18,000-25,000 |
| | Capabilities | Medium models (7-13B) comfortably |
8.3 Performance Setup (~₱45,000)
| Component | Spec | Cost |
|-----------|------|------|
| | GPU | RTX 3060 12GB or RTX 4060 Ti 16GB | ₱15,000-20,000 |
| | | CPU | Ryzen 5 5600 or Intel i5-12400 | ₱8,000-10,000 |
| | | RAM | 32GB RAM | ₱5,000 |
| | | PSU + Case | ₱10,000 |
| | | Total | ~₱45,000-60,000 |
| | Capabilities | Large models (13-70B) with great performance |
8.4 Software Stack (All Free & Open Source)
| Component | Technology | Purpose |
|-----------|-----------|--------|
| LLM Inference | Ollama | LLM inference engine |
| | Model | Mistral 7B Q4 | General purpose, balance of speed/quality (4GB RAM) |
| | Speech-to-Text | Whisper.cpp | High accuracy, runs on CPU, supports Filipino (Taglish) |
| | Text-to-Speech | Piper TTS | Neural TTS, offline, natural voices |
| | Embeddings | sentence-transformers | Semantic search (RAG) |
| | Vector DB | pgvector | Vector search within Postgres |
| | Web Server | Caddy | Auto-HTTPS via Cloudflare Tunnel |
---
9. Data Sync Strategy
9.1 Offline-First Storage
IndexedDB + Dexie.js:
- Lightweight, full TypeScript support
- Stores user's complete household data locally
- Works offline without server connection
9.2 Synchronization Logic
// Optimistic UI Pattern - Update local first, sync later
export async function markBillPaid(
  billId: string,
  payment: { method: string; referenceNumber: string }
) {
  // Update local state immediately (instant UI response)
  updateLocalBill(billId, { status: 'paid', ...payment });
  
  try {
    // Try network request
    const response = await fetch(`/api/bills/${billId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    
    if (!response.ok) throw new Error('Network request failed');
    
    // Remove from pending queue on success
    await db.pendingActions.delete(billId);
    
  } catch (error) {
    // Network failed - queue for background sync
    await db.pendingActions.add({
      id: billId,
      type: 'mark_paid',
      payload: payment,
      createdAt: Date.now(),
    });
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-bills');
    }
    
    return { status: 'queued', billId };
  }
}
// Background sync handler
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-bills') {
    const pendingActions = await db.pendingActions.toArray();
    
    for (const action of pendingActions) {
      try {
        if (action.type === 'mark_paid') {
          await fetch(`/api/bills/${action.id}/pay`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          });
          await db.pendingActions.delete(action.id);
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // Leave in queue for next sync
    }
  }
  }
);
---
10. Phased Implementation Plan
| Phase | Feature | Timeline | Complexity | Hardware |
|-------|----------|----------|----------|
| 1-11 | Core domains + data | Months 1-3 | ⭐⭐⭐ | Cloud |
| | 12 | Semantic search (RAG) | Month 4 | ⭐⭐ | Cloud (then migrate) |
| | 13 | Voice interface (STT/TTS) | Month 5 | ⭐⭐ | Cloud (then migrate) |
| | 14 | LLM integration (Ollama) | Month 6 | ⭐⭐⭐⭐ | Local |
| | 15 | Proactive agent | Month 7-8 | ⭐⭐⭐ | Local |
| | 16 | Fine-tuning + personality | Month 9-10 | ⭐⭐⭐⭐ | Local |
| | 17 | Mobile wake word ("Hey JARVIS") | Month 11-12 | ⭐⭐⭐⭐⭐ | Local |
Phase 1-3 Details (Cloud Development - Months 1-3)
Goal: Build data foundation while using cloud for speed.
Week 1-2: Infrastructure + Authentication
- Initialize Next.js project with Neon Postgres + Drizzle ORM
- Implement custom JWT auth (no NextAuth)
- Build multi-tenancy schema (organizations, residences, users)
- Create bills table with ADHD-optimized fields
Week 3: Bills CRUD + Basic UI
- Build API routes for bills (CRUD operations)
- Create bill list UI (shadcn/ui components)
- Implement basic bill creation and listing
- Add residence selector (context switching)
Week 4-6: Offline Support + Presence Detection
- Set up IndexedDB with Dexie.js for local storage
- Implement offline bill creation and updates
- Add WiFi SSID/geofence detection for residence switching
- Log presence events to database
Week 7-9: Notifications (Mission-Critical)
- Set up Vercel Cron for scheduled bill checks
- Implement Web Push (VAPID) for notifications
- Integrate Twilio for SMS fallback (critical/emergency only)
- Build "acknowledge" requirement for critical bills
Phase 4-6: Transition to Self-Hosted (Months 4-6)
Month 4: Hardware Acquisition
- Purchase Mini PC (Intel N100 or equivalent)
- Install Docker on home server
- Set up network (Tailscale or Cloudflare Tunnel)
Month 5: Migration to Self-Hosted
- Migrate Neon database to self-hosted Postgres (using pg_dump / pg_restore)
- Update database connection strings in .env.local
- Set up Caddy reverse proxy
Month 6: JARVIS Integration (Conversational AI)
- Install Ollama (curl -fsSL https://ollama.com/install.sh | sh)
- Install Llama 3.1 8B (ollama pull llama3.1:8b-instruct-q4_K_M)
- Set up sentence-transformers for embeddings
- Test basic conversation flow
Phase 7-12: Advanced JARVIS Features (Months 7-12)
Month 7: Voice Interface
- Install Whisper.cpp (git clone https://github.com/ggerganov/whisper.cpp)
- Install Piper (wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz)
- Build voice handler (STT → Ollama → Piper TTS)
- Integrate with bills UI
Month 8: Semantic Search (RAG)
- Configure pgvector extension in Postgres
- Implement embeddings for all historical bills
- Build semantic search API (querying similar bills by description, provider)
- Integrate with JARVIS conversation
Month 9: Proactive Agent
- Build proactive check job (runs every 4 hours)
- Context-aware analysis (weather + travel patterns)
- Priority-ranked notification suggestions
Month 10: Personality Tuning
- Refine JARVIS system prompt (concise, Filipino context)
- A/B test different models (Mistral vs Llama)
- Optimize for short responses (< 50 words)
Month 11: Wake Word
- Install Porcupine SDK or Snowboy for wake word
- Configure "Hey JARVIS" trigger
- Integrate with background voice service
Month 12: Multi-Residence Context
- Refine presence detection logic (WiFi SSID + geofencing + mDNS)
- Add residence indicators in UI
- Test across QC, Magalang, Grandma's Place
---
11. Deployment
11.1 Development (Vercel - Months 1-6)
- Fast iteration
- Zero ops
- Environment Variables: Vercel + Neon
# Install Vercel CLI
npm i -g vercel
# Login
vercel login
# Set environment variables
vercel env add NEON_DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add OPENWEATHER_API_KEY
11.2 Production (Self-Hosted - Month 6+)
Option A: Tailscale (Recommended - Easiest)
# On home server (Mini PC)
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# On your phone (download app from App Store/Play Store)
# Access Homebase: http://homebase-server:3000
# Works anywhere, encrypted, no port forwarding
Option B: Cloudflare Tunnel
# Install cloudflared on server
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
# Create tunnel
cloudflared tunnel create homebase
cloudflared tunnel route dns homebase homebase.yourdomain.com
# Run tunnel
cloudflared tunnel run homebase
11.3 Monitoring
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
// Critical: Track notification failures
Sentry.captureException(error, {
  tags: {
    component: 'notifications',
    context,
  },
  contexts: {
    notification: context,
  },
});
---
12. Cost Analysis: 5-Year Total
| Component | Cost (Monthly) | 5-Year Total |
|-----------|--------------|-------------|
| Infrastructure |
| Vercel hosting | $20 (Pro plan) | $1,200 |
| Neon Postgres | $19 (Launch plan) | $1,140 |
| AI Services |
| Claude API (Sonnet 4) | ~$20 (100 queries/day) | $1,200 |
| ElevenLabs TTS | $5 (if using premium voice) | $300 |
| Optional |
| Twilio SMS (critical only) | ~$5 (50 SMS/month) | $300 |
| Total (Cloud) | ~$70/month | $4,200 |
| Self-Hosted (One-time hardware + electricity) |
| Mini PC: ₱20,000 | ₱360 |
| Additional storage: ₱5,000 | ₱90 |
| Electricity (20W 24/7 @ ₱10/kWh): ₱175/month = ₱10,500 | ₱6,300 |
| Total (Self-Hosted) | ~$35,000** | **~$35,000 |
Savings: $3,560 over 5 years
Plus: Works during internet outages, complete privacy, unlimited queries.
---
13. Final Architecture Diagram
┌───────────────────────────────────────────────────────────────┐
│                    HOMEBASE PWA                     │
│         (Next.js 14 Static Export)                       │
└────────────┬──────────────────────────────────────────────────────┘
              │ HTTPS (Tailscale)                          │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│         QC HOME SERVER (Mini PC - ₱20k)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Docker Compose Stack                     │  │
│  │  ┌──────────────────────────────────────────────────┐     │
│  │  │    PostgreSQL + pgvector (RAG)            │     │ │
│  │  │    │                                  │     │
│  │  │    ├─── Ollama (Llama 3.1 8B)      │     │ │
│  │ │    ├─── Whisper.cpp (STT)           │     │ │
│  │ │    └── Piper (TTS)             │     │ │
│  │  │    ├── sentence-transformers   │     │ │
│  │  │    └── Node.js API        │     │ │
│  │  │                                 │     │
│  │  │    ┌──────────────────────┐     │
│  │ │    │ Next.js App Router │     │     │
│  │ │    └──────────────────────┘     │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  MAGALANG BACKUP (Optional - ₱5k)                │ │
│  │  Same Docker Compose stack, syncs with QC │
│  │  │ ┌──────────────────────┐     │
│  │  │ │  Next.js App Router │     │     │
│  │  │  │                    │     │
│  │  │  └──────────────────────┘     │
│  │  └───────────────────────────────────┘     │
│ └─────────────────────────────────────────────────────────┘
│                                                  │
└──────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
---
14. Risk Assessment & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|-------|-----------|--------|-------------|
| iOS Safari notification issues | High | Critical | SMS fallback + spouse escalation + persistent in-app alerts |
| User dismisses critical notification | Medium | High | Require acknowledgment to clear urgency flag |
| Vercel Cron latency | Low | Medium | Add manual trigger endpoint |
| Self-hosted hardware failure | Low | High | Backup sync (Magalang server) + cloud sync option |
| Ollama hallucination | Medium | Medium | RAG verification + temperature control (0.7) |
| Twilio costs | Low | Low | Limit to critical/emergency only |
| Weather API failure | Low | Medium | Fallback to schedule-based alerts |
---
15. Approval
Status: Approved
Approvals Required From:
- [x] Development Team (Architects/Backend)
- [x] UI/UX Team (Frontend)
- [ ] UP PGH Psychiatrist (After prototype, discuss coping mechanisms)
Approved By: Development Team Lead
Date: 2025-01-08