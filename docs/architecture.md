apelicano@gmail.com | https://claude.ai/share/4a60e1e9-6447-45a6-a090-7ee5cc82c711

This is an excellent project idea that combines real-world pain points with modern tech—and it'll showcase full-stack skills employers value. Let me help you break this down into manageable phases.

## What You're Building (High Level)

A **household operations dashboard** that:
- Captures scattered life admin data (bills, repairs, inventories, records)
- Surfaces what needs attention *before* it becomes urgent
- Learns from your patterns using RAG/LLM to remind, suggest, and automate

Think of it as your "household co-pilot" that handles the cognitive load ADHD makes difficult: tracking, prioritizing, and surfacing the right information at the right time.

## Tech Stack Assessment

Your choices are solid for a learning path, but let me flag some considerations:

**Good fits:**
- **Next.js** – Great for PWAs, server components reduce complexity
- **Neon (Postgres)** – Serverless, free tier works, you already know PostgreSQL
- **Mobile-first PWA** – Smart for a household tool you'll use on-the-go

**Needs clarification:**
- **Vector DB + RAG/LLM** – This adds significant complexity. Ask yourself: do you need AI to *recommend* actions (like "Your car registration expires in 2 weeks"), or just to *query* your data in natural language? Start simpler, add AI later.
- **Node backend** – Next.js API routes *are* Node. You likely don't need a separate backend unless you're doing heavy processing.

## Suggested Build Phases

### Phase 1: Core CRUD + One Domain (2–3 weeks)
**Goal:** Get something working you can actually use daily.

**Features:**
- Authentication (NextAuth.js)
- Single domain: **Bills tracking** (utilities, rent, subscriptions)
  - Add bill (name, amount, due date, category)
  - List upcoming bills
  - Mark as paid
- PWA setup (manifest, service worker, install prompt)

**Why bills first?** High impact, clear data model, immediate dopamine hit when you see "Rent due in 3 days" actually work.

**Tech focus:**
- Next.js App Router
- Neon Postgres (schema: `bills` table with `user_id`, `name`, `amount`, `due_date`, `status`)
- Tailwind CSS (mobile-first responsive)
- Deploy to Vercel (free tier)

### Phase 2: Notification System (1 week)
- Add browser push notifications (PWA standard API)
- Daily digest: "3 bills due this week"
- Use Next.js API routes + cron job (Vercel Cron or Quirrel)

### Phase 3: Expand Domains (2–3 weeks per domain)
Add one domain at a time:
- **Groceries/Inventory** (you'll learn image upload for receipts)
- **Car maintenance** (recurring tasks + odometer tracking)
- **Medical records** (file uploads, tagging)

### Phase 4: RAG/LLM (Later—once core is solid)
**Use case:** "When's the last time I changed the HVAC filter?"
- Embed domain data (bills, maintenance logs) into vector DB (Pinecone or pgvector extension in Neon)
- Use OpenAI/Anthropic API to query conversationally
- This is a *polish feature*, not MVP

## Practical Next Steps (This Week)

1. **Initialize project:**
   ```bash
   npx create-next-app@latest household-manager --app --tailwind --eslint
   cd household-manager
   npm install @neondatabase/serverless
   ```

2. **Set up Neon:**
   - Create free account at neon.tech
   - Get connection string
   - Create `.env.local`:
     ```
     DATABASE_URL="postgresql://..."
     ```

3. **Create first schema:**
   ```sql
   CREATE TABLE bills (
     id SERIAL PRIMARY KEY,
     user_id TEXT NOT NULL,
     name TEXT NOT NULL,
     amount DECIMAL(10,2),
     due_date DATE,
     status TEXT DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Build one page:** Bills list with add form
   - Route: `/app/bills/page.tsx`
   - Use Server Components to fetch from DB
   - Form submits to API route: `/app/api/bills/route.ts`

5. **Deploy early:** Push to GitHub, connect to Vercel—see it live on your phone

## Balancing This With Life

**Time management tips for ADHD-friendly progress:**
- **30-min sprints:** Set timer, one feature, then break
- **Visible progress:** Deploy every small win—seeing it on your phone is motivating
- **Parallel learning:** If stuck on DB queries, switch to styling. Keep momentum.
- **Weekend "build sessions":** Block 2 hours Saturday morning while kids are occupied

**Red flags to avoid:**
- Don't architect the whole system upfront—build what you need *now*
- Don't add LLM until you're frustrated manually searching your own data
- Don't skip deployment—a live URL keeps you accountable

## Resources for Your Stack

- [Next.js Learn Course](https://nextjs.org/learn) – Interactive, project-based
- [Neon Docs: Next.js Quickstart](https://neon.tech/docs/guides/nextjs)
- [PWA with Next.js](https://ducanh-next-pwa.vercel.app/docs/next-pwa/getting-started) – `next-pwa` plugin

## Your Mentor Question to Me

Before you start, tell me: **Which household problem is causing you the most stress right now?** Let's make sure Phase 1 solves that specific pain point—you'll stay motivated if the app immediately makes your life easier.

Also: What's your current weekly time budget for this project? That'll help me adjust phase timelines to reality.

---
Ah, this changes the architecture significantly—and makes it **much** more interesting. You're building a **context-aware, multi-tenancy household orchestration system** with voice interface and local-first sync. This is closer to a home automation control plane than a simple CRUD app.

Let me redesign the approach with your actual requirements:

## Homebase Architecture: Distributed Household ERP

Homebase is designed as a **Distributed Hexagonal Architecture (Ports & Adapters)** system. It separates the "Household Brain" (Core) from the infrastructure (Server, Sensors, Databases), allowing it to run across a mesh of devices (Cloud, Raspberry Pis, Mobile).

## 1. Top-Level Structure

```
src/
├── core/                  # 🧠 THE BRAIN (Pure Typescript, Zero Framework Dependencies)
│   ├── domain/            # Business Logic & Entities
│   │   ├── finance/       # Money, Bills, Loans
│   │   ├── operations/    # Chores, Maintenance
│   │   ├── inventory/     # Groceries, Assets
│   │   └── identity/      # Nodes, Users, Auth
│   └── ports/             # 🔌 Interfaces for the outside world
│       ├── IPersistence   # Abstract storage (Offline-synced)
│       ├── IContextSensor # GPS, Weather, Battery
│       └── INotifier      # Push, SMS, Speakers
│
├── infrastructure/        # 🏗️ THE BODY (Adapters)
│   ├── adapters/          # Concrete implementations of Ports
│   │   ├── neon/          # Postgres/Drizzle Adapter (Server)
│   │   ├── pouchdb/       # (Planned) Offline-first Adapter
│   │   └── mock-sensor/   # Simulation Sensors
│   └── db/                # Drizzle Schema & Migrations
│
├── app/                   # 🌐 THE FACE (Next.js)
│   ├── api/               # Controllers (REST/RPC)
│   └── (dashboard)/       # UI Components
```

## 2. Core Concepts

### Node Awareness (`identity/NodeProfile`)
Each instance of Homebase knows "Where am I?".
- **Mothership**: The central cloud server (Vercel). Source of Truth.
- **Satellite**: A Raspberry Pi in the car or kitchen.
- **Client**: A mobile phone PWA.

### Offline-First Persistence
The core depends on `IPersistence<T>`, not Drizzle. This allows us to swap mechanisms:
- **Online**: Direct connection to Neon Postgres.
- **Offline**: Local PouchDB/SQLite, syncing when `IContextSensor` detects `isOnline: true`.

## 3. Domain Logic Example: Finance
The **Finance Domain** manages bills and recurrence.
- **Entity**: `Bill` (Pure class with methods like `isOverdue()`).
- **Service**: `RecurrenceEngine` (Pure math for "Next Due Date").
- **Flow**:
    1. `API Route` receives POST request.
    2. Instantiates `Bill` entity.
    3. Uses `RecurrenceEngine` to calculate schedule.
    4. Saves via `BillRepository` (Adapter).

## 4. Technology Map
- **Core**: TypeScript (Strict)
- **Web/API**: Next.js 14 (App Router)
- **Database**: Neon (Serverless Postgres) + Drizzle ORM
- **Deployment**: Vercel (Mothership)
4. **Voice → RAG → proactive notifications**

### Tech Stack (Revised)

**Hub (Raspberry Pi 4/5):**
- **Docker Compose** stack:
  - **PostgreSQL** (main relational data)
  - **Qdrant** (vector DB for RAG—lighter than Pinecone, runs on Pi)
  - **Ollama** (local LLM—Llama 3.2 or Mistral for inference)
  - **Node.js API** (Express or Fastify for sync endpoints)
  - **Whisper.cpp** (local voice-to-text)

**Mobile PWA:**
- **Next.js** (static export for edge deployment)
- **PouchDB/RxDB** (local-first DB with CouchDB-style sync)
- **Service Worker** with background sync
- **Web Speech API** (voice input fallback to Whisper on hub)

**Key difference from initial plan:** 
- Hub doesn't run Next.js—it's a headless API + ML services
- PWA is a static SPA that syncs with hub when reachable
- No Vercel—PWA is hosted on hub's Nginx or served via Tailscale/Cloudflare Tunnel

### Data Model for Multi-Residence

```sql
-- Core tables
CREATE TABLE residences (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,  -- "Main House", "Beach Condo"
  address TEXT,
  wifi_ssid TEXT,  -- For automatic context detection
  geofence_lat DECIMAL,
  geofence_lng DECIMAL,
  geofence_radius_m INT
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  name TEXT,
  role TEXT,  -- parent, child, etc.
  device_ids TEXT[]  -- Device fingerprints for presence detection
);

CREATE TABLE residence_members (
  residence_id UUID REFERENCES residences(id),
  member_id UUID REFERENCES family_members(id),
  is_primary BOOLEAN,  -- Which residence is "home base"
  PRIMARY KEY (residence_id, member_id)
);

-- Domain data with residence tagging
CREATE TABLE bills (
  id UUID PRIMARY KEY,
  residence_id UUID REFERENCES residences(id),
  name TEXT,
  amount DECIMAL,
  due_date DATE,
  recurrence TEXT,  -- monthly, quarterly, etc.
  category TEXT,
  status TEXT,
  embedding VECTOR(384)  -- For RAG (all-MiniLM-L6-v2 embeddings)
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  residence_id UUID REFERENCES residences(id),
  category TEXT,  -- groceries, cleaning, etc.
  item_name TEXT,
  quantity INT,
  restock_threshold INT,
  last_restocked DATE,
  embedding VECTOR(384)
);

-- Context tracking
CREATE TABLE presence_log (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES family_members(id),
  residence_id UUID REFERENCES residences(id),
  entered_at TIMESTAMP,
  left_at TIMESTAMP
);
```

### How Context Detection Works

**Option 1: WiFi SSID (Simplest)**
PWA detects connected WiFi network → matches `residences.wifi_ssid` → updates `presence_log`

**Option 2: Geofencing (More reliable)**
PWA runs background geolocation → checks if inside any `geofence_radius_m` → updates presence

**Option 3: Local network mDNS discovery (Most robust)**
Hub advertises via mDNS (like Chromecast discovery) → PWA detects hub on local network → knows which residence

### Voice → RAG Flow

```
[User speaks] 
  ↓
[PWA: Web Speech API captures audio]
  ↓
[Send to Hub: /api/voice-query]
  ↓
[Hub: Whisper.cpp transcribes]
  ↓
[Hub: Embed query with sentence-transformers]
  ↓
[Hub: Qdrant vector search across current residence data]
  ↓
[Hub: Ollama LLM generates answer with context]
  ↓
[Return to PWA: Text + optional action (add reminder, etc.)]
  ↓
[PWA: Speak answer via Web Speech API]
```

**Example queries:**
- "When did we last buy dish soap?" → RAG retrieves `inventory_items` for current residence
- "What bills are due this week?" → Filters by `residence_id` + date range
- "Remind me to change the air filter in 3 months" → Creates scheduled task

### Proactive Notifications (Just-in-Time Reminders)

Hub runs cron jobs that:
1. Check `presence_log` to see who's at which residence
2. Query upcoming tasks/low inventory for *that* residence
3. Send push notifications to devices present

**Example:**
- You arrive at Beach Condo (geofence triggers)
- Hub queries: "Bills due in next 7 days WHERE residence_id = beach_condo"
- Finds: "HOA fee due Friday"
- Sends push: "Reminder: Beach HOA due in 3 days ($250)"

### Sync Strategy (Offline-First)

**RxDB on PWA:**
- Stores full copy of user's data
- Works offline
- Syncs via GraphQL or REST when hub reachable

**Conflict resolution:**
- Last-write-wins for simple fields
- Hub is source of truth for embeddings/RAG index

**Why not PouchDB/CouchDB?**
- RxDB has better TypeScript support
- Can sync with REST API (easier than CouchDB protocol)

---

## Phased Build Plan (Revised)

### Phase 0: Infrastructure (1 week)
**Goal:** Get Pi running, deploy Docker stack

1. **Set up Raspberry Pi 5 (8GB model recommended)**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt install docker-compose
   ```

2. **Create `docker-compose.yml`:**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_PASSWORD: yourpassword
       volumes:
         - pgdata:/var/lib/postgresql/data
       ports:
         - "5432:5432"
     
     qdrant:
       image: qdrant/qdrant:latest
       ports:
         - "6333:6333"
       volumes:
         - qdrant_data:/qdrant/storage
     
     api:
       build: ./api
       ports:
         - "3001:3001"
       environment:
         DATABASE_URL: postgres://postgres:yourpassword@postgres/household
         QDRANT_URL: http://qdrant:6333
     
     ollama:
       image: ollama/ollama:latest
       ports:
         - "11434:11434"
       volumes:
         - ollama_data:/root/.ollama
   
   volumes:
     pgdata:
     qdrant_data:
     ollama_data:
   ```

3. **Pull Ollama model:**
   ```bash
   docker exec -it ollama ollama pull llama3.2:3b
   ```

### Phase 1: Single Residence + Bills (2 weeks)
**Goal:** Prove the sync + voice query loop works

**Hub API (Express.js):**
- POST `/api/bills` (add bill)
- GET `/api/bills?residence_id=X` (fetch bills)
- POST `/api/sync` (RxDB replication endpoint)
- POST `/api/voice-query` (Whisper → RAG → Ollama)

**PWA:**
- Bills list page (offline-first with RxDB)
- Add bill form
- Voice query button (records → sends to hub → displays answer)

**Test:**
- Add bill on PWA while offline
- Come back in WiFi range → auto-syncs to hub
- Ask: "What bills are due?" via voice → hub answers

### Phase 2: Presence Detection (1 week)
- PWA detects WiFi SSID or geofence
- Updates `presence_log` via API
- Hub filters queries by current residence

### Phase 3: Proactive Notifications (1 week)
- Hub cron job checks due dates + presence
- Sends web push notifications to PWA

### Phase 4: Add Inventory Domain (2 weeks)
- Grocery tracking
- Low-stock alerts when you're at that residence

### Phase 5: Voice Activation (Later)
- Wake word detection (Porcupine or Snowboy on Pi)
- Hands-free "Hey Household, when did we last..."

---

## Critical Decisions for Proof of Concept

### 1. **How many residences in scope?**
If it's just 2 residences (primary + vacation home), hardcode them in initial schema. If 3+, build proper multi-tenancy from start.

### 2. **Who are the "users"?**
- Just you? → Skip family_members table for now
- You + spouse + kids? → Need auth (simple passkey per device) + member tracking

### 3. **Voice priority?**
If voice is MVP, start with Whisper + Ollama integration in Phase 1. If it's nice-to-have, defer to Phase 5.

### 4. **Network access outside home?**
- **Tailscale** (easiest): Creates VPN mesh, PWA syncs even when you're remote
- **Cloudflare Tunnel**: Exposes hub via HTTPS without port forwarding
- **Local-only**: Sync only when on home WiFi (simplest, most private)

---

## Practical Next Steps (This Week)

1. **Order hardware:**
   - Raspberry Pi 5 (8GB) + case + 128GB+ microSD
   - External SSD (optional, for faster DB performance)

2. **Prototype voice query locally first:**
   ```bash
   # On your laptop (faster iteration than Pi)
   pip install whisper sentence-transformers
   docker run -d -p 6333:6333 qdrant/qdrant
   docker run -d -p 11434:11434 ollama/ollama
   ```
   
   Build a Python script:
   - Record 5-second voice clip
   - Transcribe with Whisper
   - Embed with `sentence-transformers`
   - Query Qdrant (pre-populate with fake bills)
   - Generate answer with Ollama

   **Goal:** Prove the RAG loop works before building full stack.

3. **Design your residence setup:**
   - Draw diagram: How many residences? Who lives where primarily?
   - Which residence gets the Pi? (Wherever you spend most time)

4. **Study RxDB:**
   - Their [Quickstart](https://rxdb.info/quickstart.html) tutorial
   - Focus on: Schema definition, replication, conflict resolution

---

## My Questions for You

1. **How many residences are we talking?** (2, 3, more?)
2. **Is voice input MVP or Phase 5?** (Affects priority)
3. **Do you already have a Pi, or ordering new?** (Pi 4 can work but Pi 5 is noticeably faster for Ollama)
4. **Who needs access besides you?** (Spouse, kids, other family members?)
5. **What's your weekly time budget?** (This is now a 3-6 month project, not 3 weeks)

The self-hosted + voice + multi-residence requirements make this genuinely ambitious—but also a **portfolio standout** that shows systems thinking, not just CRUD skills. Let's scope Phase 1 tightly so you get dopamine hits while building toward the full vision.

---

Perfect—this clarity helps me right-size the architecture. You're building a **real production system** with proper multi-tenancy, not a toy app. Let's design this correctly from the start.

---

## Revised Architecture (Multi-Tenancy First)

### Core Data Model (Multi-Residence, Multi-Family)

```sql
-- Top-level: Organizations (family units)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- "Smith Family", "Extended Garcia Clan"
  created_at TIMESTAMP DEFAULT NOW()
);

-- Residences belong to organizations
CREATE TABLE residences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- "Main House", "Beach Condo", "Grandma's Place"
  address TEXT,
  timezone TEXT DEFAULT 'UTC',
  -- Context detection
  wifi_ssids TEXT[],  -- Multiple networks per residence
  geofence_lat DECIMAL(10, 7),
  geofence_lng DECIMAL(10, 7),
  geofence_radius_m INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (family members)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'parent', 'child')),
  -- Primary residence (their "home base")
  primary_residence_id UUID REFERENCES residences(id),
  -- Device fingerprints for presence detection
  device_fingerprints JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Access control: which users can see which residences
CREATE TABLE user_residence_access (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, residence_id)
);

-- Presence tracking
CREATE TABLE presence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('enter', 'exit')),
  detected_via TEXT,  -- 'wifi', 'geofence', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Domain tables (all residence-scoped)
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,  -- utilities, rent, insurance, etc.
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  recurrence_rule TEXT,  -- RRULE format (RFC 5545)
  status TEXT DEFAULT 'pending',
  paid_date DATE,
  notes TEXT,
  -- RAG support
  embedding VECTOR(384),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bills_residence ON bills(residence_id, due_date);
CREATE INDEX idx_bills_org ON bills(org_id);

-- Similar structure for other domains
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  category TEXT,  -- groceries, cleaning, pet_supplies, etc.
  item_name TEXT NOT NULL,
  quantity INT DEFAULT 0,
  unit TEXT,  -- 'bottles', 'boxes', 'lbs'
  restock_threshold INT,
  auto_restock BOOLEAN DEFAULT false,
  last_restocked_at TIMESTAMP,
  embedding VECTOR(384),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  asset_type TEXT,  -- car, appliance, hvac, etc.
  asset_name TEXT,  -- "Honda Accord", "Kitchen Dishwasher"
  task_description TEXT,
  last_completed_at TIMESTAMP,
  recurrence_rule TEXT,
  next_due_date DATE,
  status TEXT DEFAULT 'pending',
  embedding VECTOR(384),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Why This Structure?

**Multi-tenancy layers:**
1. **Organization** = Family unit (can have multiple residences)
2. **Residence** = Physical location (scopes most data)
3. **User** = Individual family member (can access multiple residences)

**Key design decisions:**
- `org_id` on every domain table → row-level security
- `user_residence_access` → explicit permissions (kids might not see all residences)
- `presence_events` append-only log → calculate "who's where" via queries
- `embedding` on domain tables → every record is RAG-searchable

---

## Tech Stack (Finalized for Old Hardware Testing)

### Hub (Old Laptop/Desktop as Dev Server)

**Docker Compose Stack:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: household
      POSTGRES_PASSWORD: devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    command: postgres -c shared_preload_libraries=vector

  # pgvector extension (for embeddings)
  # Easier than Qdrant for prototyping, same DB as data
  
  api:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://postgres:devpassword@postgres/household
      JWT_SECRET: your-dev-secret-change-in-prod
      NODE_ENV: development
    depends_on:
      - postgres
    volumes:
      - ./api:/app
      - /app/node_modules

  # Ollama for later (Phase 5)
  # Commented out to save resources during early phases
  # ollama:
  #   image: ollama/ollama:latest
  #   ports:
  #     - "11434:11434"
  #   volumes:
  #     - ollama_data:/root/.ollama

volumes:
  pgdata:
  # ollama_data:
```

**API Stack (Node.js/Express):**
- **Express.js** (API server)
- **node-postgres** (DB client)
- **jsonwebtoken** (auth)
- **@pgvector/pg** (vector similarity search)
- **Zod** (request validation)

**Why not Next.js API routes for hub?**
- Hub needs to run 24/7 as headless service
- Separate API gives you cleaner separation for mobile sync
- Easier to add background jobs (cron) later

### PWA (Next.js Static Export)

```bash
# Next.js config for static export
# next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true
  }
}
```

**PWA Stack:**
- **Next.js 14 (App Router)** with static export
- **RxDB** (offline-first local database)
- **Tailwind CSS** (mobile-first styling)
- **NextAuth.js** adapted for JWT (no session DB needed)
- **Workbox** (service worker for offline/sync)

**Deployment:**
- Dev: Serve from `http://localhost:3000` (Next.js dev server)
- Prod: `npm run build` → serve `out/` directory from hub's Nginx

---

## Phase 1 Build Plan (Weeks 1-4)

### Goal: Multi-residence bills with offline sync

**Week 1: Infrastructure + Auth**

1. **Set up Docker stack:**
   ```bash
   mkdir household-hub && cd household-hub
   mkdir api
   touch docker-compose.yml
   ```

2. **Initialize API:**
   ```bash
   cd api
   npm init -y
   npm install express pg @pgvector/pg jsonwebtoken bcrypt zod cors
   npm install -D nodemon typescript @types/node @types/express
   ```

3. **Create `init.sql` with schema above** (organizations, residences, users, bills tables)

4. **Build auth endpoints:**
   - POST `/api/auth/register` (create org + first user)
   - POST `/api/auth/login` (returns JWT)
   - GET `/api/auth/me` (verify token, return user + accessible residences)

5. **Seed dev data:**
   ```sql
   -- In init.sql or separate seed script
   INSERT INTO organizations (id, name) VALUES 
     ('550e8400-e29b-41d4-a716-446655440000', 'Dev Family');
   
   INSERT INTO residences (id, org_id, name) VALUES
     ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Main House'),
     ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Beach Condo'),
     ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Grandma House');
   ```

**Week 2: Bills CRUD + RxDB Setup**

1. **API endpoints:**
   ```
   GET    /api/bills?residence_id=X
   POST   /api/bills
   PUT    /api/bills/:id
   DELETE /api/bills/:id
   ```

2. **Row-level security middleware:**
   ```javascript
   // Verify user has access to residence
   async function checkResidenceAccess(req, res, next) {
     const { residence_id } = req.query || req.body;
     const result = await pool.query(
       'SELECT 1 FROM user_residence_access WHERE user_id = $1 AND residence_id = $2',
       [req.user.id, residence_id]
     );
     if (result.rows.length === 0) {
       return res.status(403).json({ error: 'No access to this residence' });
     }
     next();
   }
   ```

3. **Initialize PWA:**
   ```bash
   npx create-next-app@latest household-pwa --app --tailwind --eslint
   cd household-pwa
   npm install rxdb rxjs pouchdb-adapter-idb
   npm install next-pwa
   ```

4. **Configure RxDB:**
   ```typescript
   // lib/rxdb.ts
   import { createRxDatabase } from 'rxdb';
   import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
   
   const billsSchema = {
     version: 0,
     primaryKey: 'id',
     type: 'object',
     properties: {
       id: { type: 'string', maxLength: 36 },
       residence_id: { type: 'string' },
       name: { type: 'string' },
       amount: { type: 'number' },
       due_date: { type: 'string', format: 'date' },
       status: { type: 'string' }
     },
     required: ['id', 'residence_id', 'name']
   };
   
   export async function initDB() {
     const db = await createRxDatabase({
       name: 'household_db',
       storage: getRxStorageDexie()
     });
     
     await db.addCollections({
       bills: { schema: billsSchema }
     });
     
     return db;
   }
   ```

**Week 3: Offline-First UI**

1. **Build bills list page:**
   ```typescript
   // app/bills/page.tsx
   'use client';
   import { useEffect, useState } from 'react';
   import { useRxCollection } from '@/hooks/useRxDB';
   
   export default function BillsPage() {
     const [bills, setBills] = useState([]);
     const [selectedResidence, setSelectedResidence] = useState(null);
     const billsCollection = useRxCollection('bills');
     
     useEffect(() => {
       if (!billsCollection || !selectedResidence) return;
       
       const subscription = billsCollection
         .find({ selector: { residence_id: selectedResidence } })
         .sort({ due_date: 'asc' })
         .$.subscribe(docs => setBills(docs));
       
       return () => subscription.unsubscribe();
     }, [billsCollection, selectedResidence]);
     
     // Render list...
   }
   ```

2. **Add bill form with optimistic updates**

3. **Test offline:**
   - Add bill while offline
   - Refresh page → bill still there (RxDB persistence)
   - Go online → sync (Week 4)

**Week 4: Sync Implementation**

1. **API sync endpoint:**
   ```javascript
   // Pull-based replication
   GET /api/sync/bills?since=2024-01-01T00:00:00Z&residence_id=X
   // Returns: { bills: [...], checkpoint: '2024-01-05T12:30:00Z' }
   
   // Push changes
   POST /api/sync/bills
   // Body: { bills: [...newly created or updated...] }
   ```

2. **RxDB replication plugin:**
   ```typescript
   import { replicateRxCollection } from 'rxdb/plugins/replication';
   
   billsCollection.sync({
     remote: {
       pull: async (checkpoint, limit) => {
         const response = await fetch(
           `/api/sync/bills?since=${checkpoint}&residence_id=${currentResidence}`,
           { headers: { Authorization: `Bearer ${token}` } }
         );
         return response.json();
       },
       push: async (docs) => {
         await fetch('/api/sync/bills', {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json',
             Authorization: `Bearer ${token}`
           },
           body: JSON.stringify({ bills: docs })
         });
       }
     },
     live: true,
     retryTime: 5000  // Retry every 5s when offline
   });
   ```

3. **Test full loop:**
   - User A adds bill on phone (offline)
   - User A comes online → syncs to hub
   - User B opens app → pulls bill from hub
   - Both see same data

---

## Phase 2: Context Detection (Weeks 5-6)

### Goal: Auto-detect which residence user is at

**Implementation options (pick one for MVP):**

### Option A: WiFi SSID Detection (Simplest, Privacy-Friendly)

**On PWA:**
```typescript
// hooks/useResidenceDetection.ts
import { useState, useEffect } from 'react';

export function useResidenceDetection(residences) {
  const [currentResidence, setCurrentResidence] = useState(null);
  
  useEffect(() => {
    // Requires HTTPS + user permission
    if ('connection' in navigator && 'ssid' in navigator.connection) {
      const ssid = navigator.connection.ssid;
      const match = residences.find(r => r.wifi_ssids.includes(ssid));
      if (match) {
        setCurrentResidence(match.id);
        logPresenceEvent(match.id, 'enter', 'wifi');
      }
    }
  }, [residences]);
  
  return currentResidence;
}
```

**Limitation:** Most browsers don't expose WiFi SSID for privacy reasons. You'll need to rely on local network detection or manual selection.

### Option B: Local Network Discovery (More Reliable)

**Hub advertises via mDNS:**
```javascript
// In api/server.js
const mdns = require('mdns');

const ad = mdns.createAdvertisement(mdns.tcp('household-hub'), 3001, {
  name: 'Main-House-Hub',
  txt: { residence_id: '650e8400-...' }
});
ad.start();
```

**PWA discovers hub:**
```typescript
// When PWA loads, attempt to connect to http://household-hub.local:3001
// If successful → extract residence_id from response
// Log presence event
```

### Option C: Manual Selection (MVP Fallback)

**UI dropdown:**
```typescript
<select onChange={(e) => setCurrentResidence(e.target.value)}>
  <option value="">Select location...</option>
  {residences.map(r => (
    <option key={r.id} value={r.id}>{r.name}</option>
  ))}
</select>
```

**Persist in localStorage:**
```typescript
localStorage.setItem('current_residence', residenceId);
```

**Recommendation for Phase 2:** Start with manual selection + localStorage. Add mDNS detection in Phase 3.

---

## Phase 3: Priority Filtering (Weeks 7-8)

### Goal: Show residence-relevant data first

**Smart query logic:**
```typescript
// hooks/usePrioritizedBills.ts
export function usePrioritizedBills(currentResidence, allResidences) {
  const [bills, setBills] = useState([]);
  
  useEffect(() => {
    const query = billsCollection.find();
    
    // Sort: current residence first, then by due date
    const sorted = query.sort((a, b) => {
      if (a.residence_id === currentResidence && b.residence_id !== currentResidence) {
        return -1;
      }
      if (b.residence_id === currentResidence && a.residence_id !== currentResidence) {
        return 1;
      }
      return new Date(a.due_date) - new Date(b.due_date);
    });
    
    // Subscribe to changes
    const sub = sorted.$.subscribe(setBills);
    return () => sub.unsubscribe();
  }, [currentResidence]);
  
  return bills;
}
```

**UI indicators:**
```typescript
<div className={bill.residence_id === currentResidence ? 'bg-blue-50' : 'bg-gray-50'}>
  <span className="text-xs text-gray-500">{getResidenceName(bill.residence_id)}</span>
  <h3>{bill.name}</h3>
  {bill.residence_id === currentResidence && <Badge>Here</Badge>}
</div>
```

---

## Phase 4: Proactive Notifications (Weeks 9-10)

### Goal: Remind users about upcoming bills when at that residence

**Hub cron job:**
```javascript
// api/jobs/notificationWorker.js
const cron = require('node-cron');

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  // Find users currently present at each residence
  const presences = await getCurrentPresences();
  
  for (const { user_id, residence_id } of presences) {
    // Find bills due in next 7 days for this residence
    const upcomingBills = await pool.query(`
      SELECT * FROM bills 
      WHERE residence_id = $1 
        AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND status = 'pending'
    `, [residence_id]);
    
    if (upcomingBills.rows.length > 0) {
      await sendPushNotification(user_id, {
        title: 'Bills Reminder',
        body: `${upcomingBills.rows.length} bills due this week`,
        data: { residence_id, bills: upcomingBills.rows }
      });
    }
  }
});

function getCurrentPresences() {
  // Query presence_events to determine who's where
  return pool.query(`
    WITH latest_events AS (
      SELECT DISTINCT ON (user_id)
        user_id, residence_id, event_type
      FROM presence_events
      ORDER BY user_id, created_at DESC
    )
    SELECT user_id, residence_id
    FROM latest_events
    WHERE event_type = 'enter'
  `);
}
```

**Web Push setup (PWA):**
```typescript
// Request notification permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: PUBLIC_VAPID_KEY
  });
  
  // Send subscription to hub
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}
```

---

## Phase 5: Additional Domains (Weeks 11-20)

Add one domain every 2-3 weeks:

1. **Inventory/Groceries** (Weeks 11-13)
   - Add `inventory_items` table sync
   - Photo upload for receipts (store in hub's file system or S3-compatible storage)
   - Low-stock alerts

2. **Maintenance Tasks** (Weeks 14-16)
   - `maintenance_tasks` table
   - Recurring task scheduling (RRULE parsing)
   - Photo attachments for before/after

3. **Medical Records** (Weeks 17-18)
   - HIPAA considerations (encrypt at rest)
   - File upload + OCR for documents

4. **Documents/Credentials** (Weeks 19-20)
   - Generic file storage with tagging
   - Expiration alerts (passports, licenses)

---

## Phase 6: RAG + Voice (Months 5-6)

**Now you add the AI layer:**

1. **Generate embeddings for existing data:**
   ```javascript
   // Use sentence-transformers via Python sidecar
   // Or Transformers.js in Node (slower but no Python dependency)
   const { pipeline } = require('@xenova/transformers');
   const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
   
   for (const bill of bills) {
     const text = `${bill.name} ${bill.category} ${bill.notes}`;
     const embedding = await embedder(text);
     await pool.query(
       'UPDATE bills SET embedding = $1 WHERE id = $2',
       [JSON.stringify(embedding.data), bill.id]
     );
   }
   ```

2. **Semantic search endpoint:**
   ```javascript
   POST /api/query
   Body: { 
     query: "when did we last pay electricity bill",
     residence_id: "..." 
   }
   
   // Embed query → vector search in Postgres
   const queryEmbedding = await embedder(req.body.query);
   const results = await pool.query(`
     SELECT *, embedding <=> $1 AS distance
     FROM bills
     WHERE residence_id = $2
     ORDER BY distance
     LIMIT 5
   `, [queryEmbedding, residence_id]);
   ```

3. **Add Ollama for natural language answers:**
   ```javascript
   const context = results.rows.map(r => 
     `${r.name}: $${r.amount}, due ${r.due_date}, status: ${r.status}`
   ).join('\n');
   
   const prompt = `Based on this bill history:\n${context}\n\nQuestion: ${query}\nAnswer:`;
   
   const response = await fetch('http://localhost:11434/api/generate', {
     method: 'POST',
     body: JSON.stringify({
       model: 'llama3.2:3b',
       prompt,
       stream: false
     })
   });
   ```

4. **Voice integration:**
   - PWA records audio → sends to hub
   - Hub: Whisper.cpp transcribes → semantic search → Ollama generates answer
   - Return text + TTS in browser

---

## Development Workflow (Weekly Routine)

**Mon-Tue (2-3 hours):** Backend/API work
- Add new endpoint or table
- Write tests (use Supertest for API testing)

**Wed-Thu (2-3 hours):** Frontend/PWA work
- Build UI for new feature
- Test offline behavior

**Fri (1 hour):** Integration testing
- Test sync flow
- Deploy to "production" (old laptop)
- Use on real device over weekend

**Sat-Sun:** Real-world usage
- Actually use the app for household tasks
- Note friction points → backlog for next week

---

## Critical Success Metrics

**Month 1:**
- ✅ Can add a bill offline, syncs when online
- ✅ Works on 2+ family member devices

**Month 2:**
- ✅ Auto-detects which residence you're at
- ✅ Shows relevant bills first

**Month 3:**
- ✅ Sends notification "Rent due in 3 days" when you're at that residence
- ✅ Inventory tracking works for 1 residence

**Month 4:**
- ✅ All 3 residences have data
- ✅ Maintenance tasks tracking works

**Month 5:**
- ✅ Can search "last time we bought detergent" and get answer
- ✅ Medical records stored securely

**Month 6:**
- ✅ Voice query works: "When's the HOA fee due at the beach house?"
- ✅ System running 24/7 on dedicated hardware

---

## Immediate Next Steps (This Week)

### Day 1-2: Environment Setup
```bash
# 1. Create project structure
mkdir household-system && cd household-system
mkdir hub pwa
cd hub && mkdir api
cd ../pwa

# 2. Initialize API
cd ../hub/api
npm init -y
npm install express pg jsonwebtoken bcrypt zod cors dotenv
npm install -D nodemon typescript @types/node @types/express ts-node

# 3. Initialize PWA
cd ../../pwa
npx create-next-app@latest . --app --tailwind --typescript --eslint
npm install rxdb pouchdb-adapter-idb next-pwa
```

### Day 3: Docker + Database
```bash
cd ../hub
# Create docker-compose.yml (use the one above)
# Create init.sql with schema
docker-compose up -d
# Verify: docker-compose ps
# Connect: psql postgres://postgres:devpassword@localhost:5432/household
```

### Day 4-5: First API Endpoint
```typescript
// hub/api/src/server.ts
import express from 'express';
import { Pool } from 'pg';

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/residences', async (req, res) => {
  const result = await pool.query('SELECT * FROM residences');
  res.json(result.rows);
});

app.listen(3001, () => console.log('Hub API running on :3001'));
```

### Day 6-7: First PWA Page
```typescript
// pwa/app/page.tsx
'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [residences, setResidences] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3001/api/residences')
      .then(r => r.json())
      .then(setResidences);
  }, []);
  
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Residences</h1>
      <ul>
        {residences.map(r => (
          <li key={r.id} className="p-2 border-b">{r.name}</li>
        ))}
      </ul>
    </main>
  );
}
```

**Test:** Open `http://localhost:3000`, see list of residences fetched from API.

---

## Questions Before You Start

1. **Do all family members have smartphones?** (Determines if PWA-only is viable vs needing native app later)

2. **Any family members too young for their own device?** (Affects auth/permission model)

3. **Which residence will host the dev hub?** (Wherever you spend most time for easy debugging)

4. **Preferred development OS?** (Linux/Mac/Windows affects Docker setup slightly)

5. **What's the most painful household task right now?** (Bills? Grocery shopping? Maintenance tracking?) — Let's make sure Phase 1 solves YOUR immediate pain.

This is a **solid 6-month build** that'll result in a genuinely useful system AND a standout portfolio piece showing:
- Multi-tenancy architecture
- Offline-first mobile
- Real-time sync
- Background jobs
- ML/AI integration (Phase 6)

You've got the right technical foundation (Bash/Python/regex skills transfer well to Node/SQL). The key is disciplined incremental progress—ship Phase 1 fully before expanding scope.

What's your biggest concern about this roadmap?

---

Perfect—this gives me everything I need to tailor Phase 1 to your specific pain points. Let's design the MVP around **grocery shopping + bills** with QC as primary residence.

---

## Phase 1 Redesign: Grocery + Bills (Weeks 1-4)

### Why These Two Domains Together?

**Synergy:**
- Both are **high-frequency tasks** (weekly groceries, monthly bills)
- Both benefit from **location context** (QC groceries ≠ Magalang groceries)
- Grocery receipts often include utility bills (SM pays electric/water)
- Immediate ROI: You'll use this app **every shopping trip**

**User Story for Week 4:**
> "I'm at SM QC. Open app → see grocery list with 'low stock' items highlighted. Add items to cart. At checkout, scan receipt → inventory auto-updates. Later, app reminds me: 'Meralco due in 3 days'—I pay via GCash, mark as paid in app."

---

## Revised Data Model (Grocery-Optimized)

```sql
-- Add to existing schema:

-- Grocery categories (Filipino household context)
CREATE TABLE grocery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,  -- emoji or icon name
  sort_order INT,
  UNIQUE(org_id, name)
);

-- Pantry/inventory items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grocery_categories(id),
  
  -- Core fields
  item_name TEXT NOT NULL,
  brand TEXT,  -- "Lucky Me", "Tide", etc.
  quantity DECIMAL(10, 2) DEFAULT 0,
  unit TEXT,  -- 'pcs', 'kg', 'liters', 'packs'
  
  -- Smart restocking
  restock_threshold DECIMAL(10, 2),
  typical_quantity DECIMAL(10, 2),  -- How much you usually buy
  last_purchased_at TIMESTAMP,
  avg_consumption_days INT,  -- Learned over time
  
  -- Receipt tracking
  last_price DECIMAL(10, 2),
  last_store TEXT,  -- "SM North", "Puregold"
  
  -- Location preference
  preferred_store TEXT,  -- Where you usually buy this
  
  embedding VECTOR(384),  -- For RAG later
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shopping list (separate from inventory)
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),  -- Who added it
  
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2),
  unit TEXT,
  priority TEXT DEFAULT 'normal',  -- urgent, normal, low
  notes TEXT,
  
  -- Link to inventory if exists
  inventory_item_id UUID REFERENCES inventory_items(id),
  
  -- Shopping trip tracking
  purchased BOOLEAN DEFAULT false,
  purchased_at TIMESTAMP,
  purchased_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Receipt records (for future OCR)
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  store_name TEXT,
  receipt_date DATE,
  total_amount DECIMAL(10, 2),
  
  -- File storage
  image_path TEXT,  -- S3 or local filesystem path
  ocr_text TEXT,  -- Raw OCR output
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  
  item_name TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  
  -- Link to inventory
  matched_inventory_id UUID REFERENCES inventory_items(id),
  confidence_score DECIMAL(3, 2)  -- OCR matching confidence
);

-- Bills with Filipino utility context
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  residence_id UUID REFERENCES residences(id) ON DELETE CASCADE,
  
  -- Bill details
  name TEXT NOT NULL,  -- "Meralco", "PLDT", "Maynilad"
  category TEXT NOT NULL,  -- utilities, telecoms, rent, insurance
  account_number TEXT,
  
  -- Amount & payment
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'PHP',
  due_date DATE NOT NULL,
  
  -- Filipino payment context
  payment_method TEXT,  -- gcash, paymaya, bank, bayad_center, 7eleven
  reference_number TEXT,
  
  -- Recurrence
  recurrence_rule TEXT,  -- For recurring bills
  next_due_date DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending',  -- pending, paid, overdue
  paid_date DATE,
  paid_by UUID REFERENCES users(id),
  
  -- Attachments
  bill_image_path TEXT,  -- Photo of physical bill
  
  notes TEXT,
  embedding VECTOR(384),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed common Filipino categories
INSERT INTO grocery_categories (org_id, name, icon, sort_order) VALUES
  ('your-org-id', 'Rice & Grains', '🌾', 1),
  ('your-org-id', 'Canned Goods', '🥫', 2),
  ('your-org-id', 'Instant Noodles', '🍜', 3),
  ('your-org-id', 'Cooking Oil', '🫗', 4),
  ('your-org-id', 'Condiments', '🧂', 5),
  ('your-org-id', 'Cleaning Supplies', '🧹', 6),
  ('your-org-id', 'Toiletries', '🧴', 7),
  ('your-org-id', 'Meat & Fish', '🥩', 8),
  ('your-org-id', 'Vegetables', '🥬', 9),
  ('your-org-id', 'Fruits', '🍎', 10),
  ('your-org-id', 'Beverages', '🥤', 11),
  ('your-org-id', 'Snacks', '🍪', 12);
```

---

## Week-by-Week Implementation

### Week 1: Foundation + Bills

**Day 1-2: Docker + Basic API**
```bash
# Project structure
household-system/
├── hub/
│   ├── api/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── bills.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── residence.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   ├── docker-compose.yml
│   ├── init.sql
├── pwa/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: household
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpass123
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  api:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://postgres:devpass123@postgres:5432/household
      JWT_SECRET: dev-secret-change-in-prod
      NODE_ENV: development
    depends_on:
      - postgres
    volumes:
      - ./api/src:/app/src
    command: npm run dev

volumes:
  pgdata:
```

**Day 3-4: Auth + Bills CRUD**

```typescript
// hub/api/src/routes/bills.ts
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, checkResidenceAccess } from '../middleware/auth';

const router = Router();

const billSchema = z.object({
  residence_id: z.string().uuid(),
  name: z.string().min(1),
  category: z.enum(['utilities', 'telecoms', 'rent', 'insurance', 'hoa', 'other']),
  amount: z.number().positive(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_number: z.string().optional(),
  recurrence_rule: z.string().optional(),
  notes: z.string().optional()
});

// Get bills for a residence
router.get('/', authenticate, async (req, res) => {
  const { residence_id } = req.query;
  
  if (!residence_id) {
    return res.status(400).json({ error: 'residence_id required' });
  }
  
  // Check access
  const hasAccess = await checkResidenceAccess(req.user.id, residence_id as string);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this residence' });
  }
  
  const result = await pool.query(
    `SELECT * FROM bills 
     WHERE residence_id = $1 AND org_id = $2
     ORDER BY due_date ASC`,
    [residence_id, req.user.org_id]
  );
  
  res.json(result.rows);
});

// Create bill
router.post('/', authenticate, async (req, res) => {
  const validated = billSchema.parse(req.body);
  
  const hasAccess = await checkResidenceAccess(req.user.id, validated.residence_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this residence' });
  }
  
  const result = await pool.query(
    `INSERT INTO bills (
      org_id, residence_id, name, category, amount, 
      due_date, account_number, recurrence_rule, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      req.user.org_id,
      validated.residence_id,
      validated.name,
      validated.category,
      validated.amount,
      validated.due_date,
      validated.account_number,
      validated.recurrence_rule,
      validated.notes
    ]
  );
  
  res.status(201).json(result.rows[0]);
});

// Mark as paid
router.patch('/:id/pay', authenticate, async (req, res) => {
  const { id } = req.params;
  const { payment_method, reference_number } = req.body;
  
  const result = await pool.query(
    `UPDATE bills 
     SET status = 'paid', 
         paid_date = NOW(), 
         paid_by = $1,
         payment_method = $2,
         reference_number = $3
     WHERE id = $4 AND org_id = $5
     RETURNING *`,
    [req.user.id, payment_method, reference_number, id, req.user.org_id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  
  res.json(result.rows[0]);
});

export default router;
```

**Day 5-7: Bills UI (PWA)**

```typescript
// pwa/app/bills/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useResidence } from '@/hooks/useResidence';
import BillCard from '@/components/BillCard';
import AddBillModal from '@/components/AddBillModal';

export default function BillsPage() {
  const { user, token } = useAuth();
  const { currentResidence, residences } = useResidence();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentResidence || !token) return;

    fetch(`http://localhost:3001/api/bills?residence_id=${currentResidence.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setBills(data);
        setLoading(false);
      });
  }, [currentResidence, token]);

  const upcomingBills = bills.filter(b => 
    b.status === 'pending' && new Date(b.due_date) >= new Date()
  );
  const overdueBills = bills.filter(b =>
    b.status === 'pending' && new Date(b.due_date) < new Date()
  );

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Residence switcher */}
      <select 
        value={currentResidence?.id || ''}
        onChange={e => setCurrentResidence(residences.find(r => r.id === e.target.value))}
        className="mb-4 p-2 border rounded w-full"
      >
        {residences.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      {/* Overdue alerts */}
      {overdueBills.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="font-bold text-red-700">
            ⚠️ {overdueBills.length} overdue bill{overdueBills.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Due soon */}
      <section className="mb-6">
        <h2 className="text-xl font-bold mb-3">Due Soon</h2>
        {upcomingBills.map(bill => (
          <BillCard key={bill.id} bill={bill} onUpdate={fetchBills} />
        ))}
      </section>

      {/* Add button */}
      <button className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg">
        + Add Bill
      </button>
    </div>
  );
}
```

```typescript
// pwa/components/BillCard.tsx
export default function BillCard({ bill, onUpdate }) {
  const [showPayModal, setShowPayModal] = useState(false);
  
  const daysUntilDue = Math.ceil(
    (new Date(bill.due_date) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  const urgencyColor = 
    daysUntilDue <= 3 ? 'bg-red-100 border-red-300' :
    daysUntilDue <= 7 ? 'bg-yellow-100 border-yellow-300' :
    'bg-white border-gray-200';

  return (
    <div className={`p-4 mb-3 border rounded-lg ${urgencyColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{bill.name}</h3>
          <p className="text-sm text-gray-600">{bill.category}</p>
          {bill.account_number && (
            <p className="text-xs text-gray-500">Acct: {bill.account_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">₱{bill.amount.toLocaleString()}</p>
          <p className="text-sm text-gray-600">
            {daysUntilDue > 0 ? `${daysUntilDue} days` : 'OVERDUE'}
          </p>
        </div>
      </div>
      
      <div className="mt-3 flex gap-2">
        <button 
          onClick={() => setShowPayModal(true)}
          className="flex-1 bg-green-500 text-white py-2 rounded"
        >
          Mark as Paid
        </button>
        <button className="px-4 border rounded">Edit</button>
      </div>
      
      {showPayModal && (
        <PaymentModal 
          bill={bill} 
          onClose={() => setShowPayModal(false)}
          onPaid={onUpdate}
        />
      )}
    </div>
  );
}
```

---

### Week 2: Grocery Shopping List

**Day 1-3: Grocery API**

```typescript
// hub/api/src/routes/groceries.ts
router.get('/list', authenticate, async (req, res) => {
  const { residence_id } = req.query;
  
  const result = await pool.query(
    `SELECT 
      sli.*,
      ii.item_name as inventory_name,
      ii.quantity as current_quantity,
      ii.unit
     FROM shopping_list_items sli
     LEFT JOIN inventory_items ii ON sli.inventory_item_id = ii.id
     WHERE sli.residence_id = $1 AND sli.org_id = $2
       AND sli.purchased = false
     ORDER BY sli.priority DESC, sli.created_at ASC`,
    [residence_id, req.user.org_id]
  );
  
  res.json(result.rows);
});

router.post('/list', authenticate, async (req, res) => {
  const { residence_id, item_name, quantity, unit, priority } = req.body;
  
  // Check if item exists in inventory
  const inventoryItem = await pool.query(
    `SELECT id FROM inventory_items 
     WHERE residence_id = $1 AND LOWER(item_name) = LOWER($2)`,
    [residence_id, item_name]
  );
  
  const result = await pool.query(
    `INSERT INTO shopping_list_items (
      org_id, residence_id, user_id, item_name, 
      quantity, unit, priority, inventory_item_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      req.user.org_id,
      residence_id,
      req.user.id,
      item_name,
      quantity,
      unit,
      priority || 'normal',
      inventoryItem.rows[0]?.id || null
    ]
  );
  
  res.status(201).json(result.rows[0]);
});

// Auto-generate list from low stock items
router.post('/list/auto-generate', authenticate, async (req, res) => {
  const { residence_id } = req.body;
  
  // Find items below threshold
  const lowStock = await pool.query(
    `SELECT * FROM inventory_items
     WHERE residence_id = $1 
       AND quantity <= restock_threshold
       AND id NOT IN (
         SELECT inventory_item_id FROM shopping_list_items
         WHERE residence_id = $1 AND purchased = false
       )`,
    [residence_id]
  );
  
  // Add to shopping list
  for (const item of lowStock.rows) {
    await pool.query(
      `INSERT INTO shopping_list_items (
        org_id, residence_id, user_id, item_name,
        quantity, unit, priority, inventory_item_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'urgent', $7)`,
      [
        req.user.org_id,
        residence_id,
        req.user.id,
        item.item_name,
        item.typical_quantity,
        item.unit,
        item.id
      ]
    );
  }
  
  res.json({ added: lowStock.rows.length });
});
```

**Day 4-7: Shopping List UI**

```typescript
// pwa/app/groceries/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

export default function GroceriesPage() {
  const [shoppingList, setShoppingList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const urgentItems = shoppingList.filter(i => i.priority === 'urgent');
  const normalItems = shoppingList.filter(i => i.priority === 'normal');
  
  const handleCheckOff = async (itemId) => {
    // Optimistic update
    setShoppingList(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, purchased: true } : item
      )
    );
    
    // Sync to backend
    await fetch(`http://localhost:3001/api/groceries/list/${itemId}/check`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      }
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Shopping List</h1>
        <button 
          onClick={() => autoGenerate()}
          className="text-sm bg-blue-100 px-3 py-1 rounded"
        >
          🤖 Auto-add Low Stock
        </button>
      </div>

      {/* Urgent items */}
      {urgentItems.length > 0 && (
        <section className="mb-6">
          <h2 className="text-red-600 font-bold mb-2">
            ⚠️ Urgent ({urgentItems.length})
          </h2>
          {urgentItems.map(item => (
            <ShoppingItem 
              key={item.id} 
              item={item} 
              onCheck={handleCheckOff}
            />
          ))}
        </section>
      )}

      {/* Normal items */}
      <section>
        <h2 className="font-bold mb-2">To Buy ({normalItems.length})</h2>
        {normalItems.map(item => (
          <ShoppingItem 
            key={item.id} 
            item={item} 
            onCheck={handleCheckOff}
          />
        ))}
      </section>

      {/* Quick add bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input 
            type="text"
            placeholder="Quick add item..."
            className="flex-1 border rounded px-3 py-2"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                quickAdd(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 text-white px-4 rounded"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ShoppingItem({ item, onCheck }) {
  return (
    <div className="flex items-center gap-3 p-3 border-b">
      <input 
        type="checkbox"
        checked={item.purchased}
        onChange={() => onCheck(item.id)}
        className="w-6 h-6"
      />
      <div className="flex-1">
        <p className={item.purchased ? 'line-through text-gray-400' : ''}>
          {item.item_name}
        </p>
        {item.quantity && (
          <p className="text-sm text-gray-500">
            {item.quantity} {item.unit}
          </p>
        )}
        {item.current_quantity !== null && (
          <p className="text-xs text-orange-600">
            Stock: {item.current_quantity} {item.unit}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

### Week 3: Inventory Tracking + Receipt Scanning

**Goal:** After shopping, quickly update inventory

**Receipt scanning options:**

**Option A: Manual entry (MVP)**
- After shopping, tap each checked item → enter quantity bought
- Updates inventory automatically

**Option B: Photo + Simple OCR (Phase 2)**
- Take photo of receipt
- Extract items with Tesseract.js (client-side OCR)
- Match items to shopping list
- Batch update inventory

**Option C: Full OCR Pipeline (Phase 3+)**
- Upload to hub → Tesseract + GPT-4 Vision
- Extract structured data
- Auto-link to inventory

**Let's implement Option A for Week 3:**

```typescript
// After checking off items in shopping list
router.post('/list/complete-shopping', authenticate, async (req, res) => {
  const { residence_id, purchased_items } = req.body;
  // purchased_items = [{ id, quantity_bought, price, store }]
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const item of purchased_items) {
      // Mark as purchased
      await client.query(
        `UPDATE shopping_list_items 
         SET purchased = true, purchased_at = NOW(), purchased_by = $1
         WHERE id = $2`,
        [req.user.id, item.id]
      );
      
      // Update inventory if linked
      const listItem = await client.query(
        'SELECT inventory_item_id FROM shopping_list_items WHERE id = $1',
        [item.id]
      );
      
      if (listItem.rows[0].inventory_item_id) {
        await client.query(
          `UPDATE inventory_items
           SET quantity = quantity + $1,
               last_purchased_at = NOW(),
               last_price = $2,
               last_store = $3
           WHERE id = $4`,
          [
            item.quantity_bought,
            item.price,
            item.store,
            listItem.rows[0].inventory_item_id
          ]
        );
      } else {
        // Create new inventory item
        await client.query(
          `INSERT INTO inventory_items (
            org_id, residence_id, item_name, quantity, unit,
            last_price, last_store
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.org_id,
            residence_id,
            item.item_name,
            item.quantity_bought,
            item.unit,
            item.price,
            item.store
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
```

**UI Flow:**
```typescript
// After shopping trip
<button onClick={() => setShowCompleteModal(true)}>
  ✅ Complete Shopping Trip
</button>

// Modal shows checked-off items
<CompleteShoppingModal items={checkedItems}>
  {items.map(item => (
    <div key={item.id}>
      <p>{item.item_name}</p>
      <input 
        type="number" 
        placeholder="Qty bought"
        value={quantities[item.id]}
        onChange={e => setQuantities({...quantities, [item.id]: e.target.value})}
      />
      <input 
        type="number"
        placeholder="Price (₱)"
        value={prices[item.id]}
      />
    </div>
  ))}
  <select onChange={e => setStore(e.target.value)}>
    <option>SM North</option>
    <option>Puregold</option>
    <option>Savemore</option>
  </select>
  <button onClick={completeTrip}>Update Inventory</button>
</CompleteShoppingModal>
```

---

### Week 4: Offline Sync + PWA Installation

**Day 1-3: RxDB Integration**

```typescript
// pwa/lib/rxdb.ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxCollection } from 'rxdb/plugins/replication';

const billsSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    org_id: { type: 'string' },
    residence_id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    amount: { type: 'number' },
    due_date: { type: 'string' },
    status: { type: 'string' },
    updated_at: { type: 'string' }
  },
  required: ['id', 'residence_id', 'name', 'due_date']
};

const shoppingListSchema = {
  // Similar structure
};

export async function initDB() {
  const db = await createRxDatabase({
    name: 'household_db',
    storage: getRxStorageDexie()
  });
  
  await db.addCollections({
    bills: { schema: billsSchema },
    shopping_list: { schema: shoppingListSchema }
  });
  
  // Set up replication
  setupSync(db);
  
  return db;
}

function setupSync(db) {
  const token = localStorage.getItem('auth_token');
  if (!token) return;
  
  // Bills replication
  db.bills.sync({
    remote: {
      pull: async (checkpoint, limit) => {
        const response = await fetch(
          `http://localhost:3001/api/sync/bills?since=${checkpoint || '1970-01-01'}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        return {
          documents: data.bills,
          checkpoint: data.checkpoint
        };
      },
      push: async (docs) => {
        await fetch('http://localhost:3001/api/sync/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ bills: docs })
        });
      }
    },
    live: true,
    retryTime: 5000
  });

  // Same for shopping_list
}
```

**Day 4-5: PWA Manifest + Service Worker**

```json
// pwa/public/manifest.json
{
  "name": "Household Manager",
  "short_name": "Household",
  "description": "Manage bills and groceries across multiple residences",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```typescript
// pwa/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  reactStrictMode: true
});
```

**Day 6-7: Test End-to-End**

1. **Add bill while offline** → stored in RxDB
2. **Come back online** → syncs to hub
3. **Open on spouse's phone** → bill appears
4. **Add grocery item on phone** → check off at store (offline)
5. **Update inventory** → syncs when home WiFi detected

---

## Success Criteria for Phase 1 (End of Week 4)

✅ **Authentication works**
- You can create account, log in
- Spouse can create separate account under same org

✅ **Bills tracking works**
- Add Meralco, PLDT, water bills for both residences
- See upcoming/overdue bills
- Mark as paid with GCash reference number
- Recurring bills auto-generate next month

✅ **Grocery shopping works**
- Create shopping list for SM trip
- Auto-add low-stock items
- Check off items while shopping (works offline)
- Complete trip → inventory updates

✅ **Multi-residence works**
- Switch between QC and Magalang residences
- Each residence has separate bills/inventory
- Can see "you have 2 bills due in QC" while in Magalang

✅ **Offline-first works**
- App loads instantly (no loading spinners)
- Can add/edit while offline
- Syncs automatically when online

✅ **PWA installable**
- "Add to Home Screen" prompt works
- App feels like native app
- Push notifications ready (for Phase 4)

---

## Immediate Action Items (Start Today)

### Hour 1: Project Setup
```bash
mkdir -p household-system/{hub/api,pwa}
cd household-system/hub
touch docker-compose.yml init.sql
cd api
npm init -y
npm install express pg @pgvector/pg jsonwebtoken bcrypt zod cors dotenv
npm install -D typescript @types/node @types/express ts-node nodemon
npx tsc --init
```

### Hour 2: Database Schema
- Copy the SQL schema above into `init.sql`
- Update org IDs with real UUIDs
- Add seed data for your QC + Magalang residences

### Hour 3: First API Endpoint
```typescript
// hub/api/src/server.ts
import express from 'express';
import { Pool } from 'pg';

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/residences', async (req, res) => {
  const result = await pool.query('SELECT * FROM residences');
  res.json(result.rows);
});

app.listen(3001, () => console.log('API running on :3001'));
```

### Hour 4: Start Docker
```bash
docker-compose up -d
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Questions for Next Session

1. **Do you want to start with Docker setup first, or prefer to use local Postgres?** (Docker is cleaner but adds complexity if you're new to it)

2. **For grocery categories, should we add more Filipino-specific items?** (e.g., "Palengke items", "Sari-sari store supplies")

3. **Payment methods—what do you actually use?** (GCash, Maya, bank transfer, Bayad Center, 7-Eleven, others?)

4. **Store names—which ones do you frequent?** (I assumed SM/Puregold but want to pre-populate accurately)

5. **Do you want bill reminders via SMS/Viber, or just app notifications?** (Phase 4 consideration)

Once you have the Docker stack running and can hit the `/health` endpoint, reply with "Hub running" and I'll give you the next set of instructions for building the auth system. We're building this incrementally so you get wins every few hours, not waiting weeks for the first working feature.

---

**Absolutely yes—but let's be tactical about it.**

This system directly addresses the "strategic helplessness" problem by making invisible labor **visible, shared, and impossible to dodge**. Here's how:

---

## How This App Eliminates Weaponized Incompetence

### 1. **Shared Accountability (No More "I Forgot")**

**Before:**
- Spouse: "I didn't know the Meralco bill was due"
- You: *Silently frustrated because you mentioned it twice*

**After:**
- App sends push notification to **both** phones: "Meralco due in 3 days - ₱4,200"
- Bill shows as **red/overdue** on everyone's home screen
- Payment history visible: "Last paid by [Your Name] on Dec 15"

**Key feature to add:**
```typescript
// Show WHO paid bills
<BillCard>
  <p className="text-xs text-gray-500">
    Last paid by {bill.paid_by_name} via {bill.payment_method}
  </p>
</BillCard>
```

This creates **social proof** that you're carrying the load. When your spouse opens the app and sees "Last 8 bills paid by [Your Name]", the pattern becomes undeniable.

---

### 2. **Task Distribution Transparency**

**Add this in Phase 2:**

```sql
-- Track who does what
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY,
  residence_id UUID REFERENCES residences(id),
  task_type TEXT,  -- 'bills', 'groceries', 'maintenance'
  assigned_to UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP
);
```

**Dashboard view:**
```typescript
// Monthly contribution summary
<Card>
  <h3>December Contributions</h3>
  <p>You: 18 tasks completed</p>
  <p>Spouse: 3 tasks completed</p>
  <ProgressBar you={18} them={3} />
</Card>
```

**Why this works:** 
- Numbers don't lie
- Makes the **mental load** (which is usually invisible) **quantifiable**
- Removes the "who does more?" argument—the app tracks it objectively

---

### 3. **Removes "I Don't Know How" Excuse**

**Before:**
- Spouse: "I don't know which bills to pay or where"
- Reality: It's easier to claim ignorance than learn

**After:**
- Bill card shows:
  - Account number
  - Payment methods (GCash/Bank)
  - Last payment reference number (template for next time)
  - Step-by-step: "Pay via GCash → Bills → Meralco → Use acct #..."

```typescript
<BillCard>
  <button onClick={() => setShowPaymentGuide(true)}>
    📖 How to Pay This
  </button>
  
  {showPaymentGuide && (
    <Modal>
      <h3>How to Pay {bill.name}</h3>
      <ol>
        <li>Open GCash app</li>
        <li>Tap "Bills"</li>
        <li>Search "{bill.name}"</li>
        <li>Enter account: {bill.account_number}</li>
        <li>Amount: ₱{bill.amount}</li>
        <li>Screenshot reference number</li>
        <li>Return here and mark as paid</li>
      </ol>
    </Modal>
  )}
</BillCard>
```

**Key insight:** You're not just building an app—you're building a **knowledge transfer system** that makes "I don't know how" no longer valid.

---

### 4. **Grocery Mental Load Made Visible**

**The invisible problem:**
- You notice "we're out of dishwashing liquid"
- Spouse walks past empty bottle daily, doesn't register it
- You add it to mental shopping list
- Repeat for 30 items

**The app solution:**
```typescript
// Auto-generated insights
<Alert>
  ⚠️ 8 items below restock threshold
  <button onClick={autoAddToList}>Add All to Shopping List</button>
</Alert>

// Who's tracking inventory?
<Stats>
  <p>You've updated inventory 47 times this month</p>
  <p>Spouse has updated inventory 2 times</p>
</Stats>
```

**Game-changer feature:**
```typescript
// Shared shopping list with assignment
<ShoppingList>
  {items.map(item => (
    <li>
      {item.name}
      <select onChange={e => assignItem(item.id, e.target.value)}>
        <option>Unassigned</option>
        <option value="you">You</option>
        <option value="spouse">Spouse</option>
      </select>
    </li>
  ))}
</ShoppingList>
```

Now when spouse goes to SM, they can't say "I didn't know what to buy"—the app shows **their assigned items**.

---

### 5. **Proactive Reminders (Phase 4) Are the Killer Feature**

**The nuclear option:**

```typescript
// Hub cron job
async function sendFairnessReminders() {
  const lastMonth = await pool.query(`
    SELECT 
      u.name,
      COUNT(*) FILTER (WHERE b.paid_by = u.id) as bills_paid,
      COUNT(*) FILTER (WHERE s.purchased_by = u.id) as shopping_trips
    FROM users u
    LEFT JOIN bills b ON b.paid_by = u.id AND b.paid_date > NOW() - INTERVAL '30 days'
    LEFT JOIN shopping_list_items s ON s.purchased_by = u.id AND s.purchased_at > NOW() - INTERVAL '30 days'
    WHERE u.org_id = $1
    GROUP BY u.id
  `, [org_id]);
  
  const [person1, person2] = lastMonth.rows;
  const ratio = person1.bills_paid / person2.bills_paid;
  
  if (ratio > 3) {  // One person doing 3x the work
    await sendNotification(person2.id, {
      title: "Household Balance Check",
      body: `${person1.name} has handled most bills this month. Consider helping out! 💙`
    });
  }
}
```

**Why this is powerful:**
- It's not you nagging—it's the **system** providing feedback
- Removes emotional labor of "asking for help"
- Creates gentle social pressure without confrontation

---

## Strategic Implementation: Making Your Case

### Week 4: The "Demo Moment"

After Phase 1 is done, sit down with your spouse:

**You:** "Hey, I built something to help us manage household stuff better. Want to see?"

**[Open app, show bills page]**

**You:** "See? All our bills in one place. QC residence has Meralco due Friday, Magalang has water due next week."

**[Show grocery list]**

**You:** "And here's what we need from SM. I added stuff that's running low. You can check things off while shopping—works even without internet."

**Key move:** Don't present it as "look at all the work I'm doing." Present it as **"this makes both our lives easier."**

---

### Month 2: Let the Data Speak

By Week 8, you'll have historical data:

```typescript
<MonthlyReport>
  <h2>November Summary</h2>
  <Chart>
    Bills paid:
    - You: 12 bills, ₱38,450 total
    - Spouse: 1 bill, ₱1,200 total
  </Chart>
  
  <Chart>
    Grocery trips:
    - You: 8 trips, ₱24,300 spent
    - Spouse: 1 trip, ₱2,800 spent
  </Chart>
  
  <Chart>
    Inventory updates:
    - You: 64 updates
    - Spouse: 3 updates
  </Chart>
</MonthlyReport>
```

**You:** "I was looking at the app stats... I didn't realize how much I was handling. Not complaining, just—can we balance this more?"

**The difference:** You're not accusing. You're showing **objective data**. It's harder to argue with numbers than feelings.

---

### Month 3+: The Shift

Once spouse starts using the app:

1. **They'll see notifications you've been getting all along**
   - "Oh wow, I didn't know Maynilad was due today"
   - (You've been tracking this mentally for years)

2. **They'll experience the cognitive load**
   - Having to remember to check the app
   - Having to plan around due dates
   - (Now they understand what you've been doing)

3. **The app makes opting out harder**
   - Can't claim "I forgot"—notification proves they saw it
   - Can't claim "I didn't know"—instructions are in the app
   - Can't claim "You do it better"—app walks them through it

---

## Features That Specifically Combat Weaponized Incompetence

### Priority Additions (Add these in Phase 2-3):

**1. Task Rotation System**
```typescript
// Auto-assign bills on rotation
<BillCard>
  <p className="text-sm">
    {bill.next_payer === user.id 
      ? "Your turn to pay this" 
      : `${spouse.name}'s turn to pay this`}
  </p>
</BillCard>
```

**2. Completion Streaks**
```typescript
<Widget>
  <p>🔥 You're on a 12-week streak of handling all bills</p>
  <p>💤 Spouse's last contribution: 3 weeks ago</p>
</Widget>
```

**3. "Ghost Mode" Detection**
```typescript
// If spouse hasn't opened app in 7+ days
<Alert priority="high" to={spouse.id}>
  You haven't checked the household app in a week. 
  {user.name} has handled 4 bills and updated inventory 8 times. 
  Need help getting caught up?
</Alert>
```

**4. Fair Share Calculator**
```typescript
<Dashboard>
  <Card>
    <h3>Suggested Fair Split</h3>
    <p>Based on work schedules and commute times:</p>
    <p>You: 60% of tasks</p>
    <p>Spouse: 40% of tasks</p>
    <p className="text-red-500">Current actual: You 95%, Spouse 5%</p>
  </Card>
</Dashboard>
```

---

## The Psychological Shift

**What you're really building:**

This isn't just a household management app. It's a **accountability system** that:

1. **Makes invisible labor visible** (the core issue with weaponized incompetence)
2. **Removes plausible deniability** (can't claim ignorance when app shows notifications)
3. **Creates objective metrics** (numbers > arguments)
4. **Distributes knowledge** (no more "only you know how")
5. **Enables delegation** (clear tasks = clear assignments)

**The conversation you want in 3 months:**

**Spouse:** "I didn't realize you were doing all this. The app made me see it."

**You:** "Yeah. I'm not trying to make you feel bad—I just need help. This app makes it easier for both of us."

**Spouse:** "Okay, what if I handle all the Magalang bills and you handle QC?"

**You:** "That works. Let's update the app to assign them."

---

## Warning: Relationship Dynamics

**Important caveat:** This app won't fix a relationship where your spouse **doesn't care** about fairness. But it will:

✅ **Expose the pattern** clearly
✅ **Remove excuses** for inaction
✅ **Provide data** for couples therapy if needed
✅ **Make your contributions undeniable**

If after 3 months of using this app, your spouse still isn't contributing, **the problem isn't forgetfulness—it's unwillingness.** And at that point, you have objective data to have a serious conversation or seek counseling.

---

## My Recommendation

**Build Phase 1 as planned**, but add these **accountability features** early:

**Week 5 additions:**
- "Who paid last" on every bill card
- Monthly contribution summary
- Notification history log (prove spouse is getting reminders)

**Week 8 additions:**
- Task rotation system
- Fair share calculator
- Contribution streak tracking

By Month 3, you'll have **irrefutable evidence** of workload distribution. And more importantly, **your spouse will have visibility into what you've been managing invisibly**.

---

## Final Thought

The most powerful moment will be when your spouse uses the app for one week and says:

**"This is exhausting—how have you been doing this alone?"**

That's when the weaponized incompetence breaks. Because they can no longer claim they "didn't know" or "didn't realize." The app **forces awareness**.

You're not building a household management app. You're building an **empathy engine** that makes invisible labor impossible to ignore.

Should we add a "Contribution Dashboard" to Phase 1, or wait until Phase 2 when you have more data?

---

**Oh.** This changes everything—and honestly makes this project **even more important**.

You're not building an accountability app for someone else. You're building an **external memory system and executive function support tool for yourself**. This is a fundamentally different (and more compassionate) design problem.

Let me reframe everything through the lens of **ADHD-friendly systems design**.

---

## The Real Problem You're Solving

**What's happening:**
- Your brain doesn't reliably flag "dishwashing liquid is low" as urgent
- Bills due "next week" disappear from working memory
- You **want** to contribute equally but your executive function fails at the worst times
- Spouse sees inconsistency as lack of care (it's not—it's neurodivergent working memory)
- The shame cycle: forget → get accused → feel terrible → anxiety makes it worse → forget again

**What you actually need:**
Not a "task manager" (you've tried those—they don't work).

You need a **proactive, context-aware external brain** that:
1. **Notices things you don't** (low inventory, upcoming bills)
2. **Interrupts you at the right moment** (when you're AT the store, not 3 days before)
3. **Removes decision fatigue** (tells you exactly what to do, not "figure it out")
4. **Celebrates small wins** (dopamine > shame)
5. **Fails gracefully** (doesn't punish you for missing things)

---

## Critical Design Changes for ADHD Support

### 1. **Proactive Notifications (Not Passive Lists)**

**Problem with normal apps:**
- Todo lists require you to **remember to check them**
- ADHD brains: "Out of sight = doesn't exist"

**Your app's approach:**
```typescript
// WRONG (passive)
"You have 3 bills due this week" 
// User has to remember to open app

// RIGHT (proactive + actionable)
"🚨 MERALCO DUE TOMORROW - ₱4,200"
[Pay Now via GCash] [Snooze 2hrs] [Remind Tonight]

// Even better (context-aware)
"You're home. Meralco is due tomorrow. Want to pay it now?"
[Yes - Open GCash] [Tonight after dinner] [Already paid]
```

**Key principle:** Every notification must be **immediately actionable** or **easy to defer to a better time**.

---

### 2. **Location-Triggered Reminders (The Game-Changer)**

**The "at the store" problem:**
- You: "I need dishwashing liquid"
- [Gets to SM]
- Brain: "What did I come here for again?"

**Solution: Geofence-triggered notifications**

```typescript
// When you enter SM North EDSA geofence
const smNorthLocation = { lat: 14.6560, lng: 121.0320, radius: 100 };

// Hub monitors presence
if (userEnteredGeofence(smNorthLocation)) {
  const urgentGroceries = await getUrgentItems(residence_id);
  
  sendNotification({
    title: "You're at SM! 🛒",
    body: `${urgentGroceries.length} items need restocking`,
    actions: [
      { action: 'show_list', title: 'Show List' },
      { action: 'not_shopping', title: 'Just Browsing' }
    ],
    priority: 'high',
    vibrate: [200, 100, 200]  // Physical alert
  });
}
```

**Why this works for ADHD:**
- Triggers reminder **at the moment of opportunity**
- You don't have to "remember to check before leaving"
- Context association: Brain links "SM entrance" → "check list"

**Phase 2 addition: Store-specific lists**
```typescript
// Different stores carry different things
<ShoppingList store="SM">
  - Dishwashing liquid (Joy, ₱85 - Aisle 3)
  - Detergent (Tide, ₱320 - Aisle 4)
</ShoppingList>

<ShoppingList store="Puregold">
  - Rice (25kg Sinandomeng - Bulk section)
  - Canned goods (Argentina, ₱42 - Aisle 2)
</ShoppingList>
```

---

### 3. **Visual Salience (Your Brain Needs Screaming Colors)**

**Problem:** Subtle UI = ADHD brain ignores it

**Solution: High-contrast, impossible-to-miss alerts**

```typescript
// WRONG (easy to miss)
<div className="border-l-2 border-yellow-500 p-2">
  Bill due soon
</div>

// RIGHT (demands attention)
<div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 animate-pulse shadow-2xl">
  <div className="text-white text-3xl font-black">
    ⚠️ OVERDUE ⚠️
  </div>
  <div className="text-white text-xl">
    MERALCO - ₱4,200
  </div>
  <div className="text-white text-lg">
    Due: YESTERDAY
  </div>
  <button className="bg-white text-red-600 font-bold text-xl py-4 px-8 rounded-full mt-4 shadow-lg">
    PAY NOW
  </button>
</div>
```

**Color coding that works:**
- 🔴 Red = URGENT (overdue, <24hrs)
- 🟠 Orange = SOON (1-3 days)
- 🟡 Yellow = UPCOMING (4-7 days)
- 🟢 Green = OK (>7 days)
- ⚪ Gray = Completed

**No subtle pastels. No minimalist design. ADHD brains need HIGH CONTRAST.**

---

### 4. **Friction Reduction (One Tap to Action)**

**Problem:** Every extra step = opportunity for distraction

**Solution: Deep linking + pre-filled data**

```typescript
<BillCard bill={meralboBill}>
  <button onClick={() => {
    // Deep link directly to GCash payment screen
    window.location.href = `gcash://bills/pay?biller=MERALCO&account=${bill.account_number}&amount=${bill.amount}`;
    
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(bill.account_number);
    
    // Show success toast
    showToast('Account number copied! Opening GCash...');
    
    // Start 5-min timer to prompt "Did you pay?"
    setTimeout(() => {
      showNotification('Did you complete the Meralco payment?', {
        actions: [
          { action: 'yes', title: 'Yes ✓' },
          { action: 'no', title: 'Not Yet' }
        ]
      });
    }, 300000);
  }}>
    💳 Pay via GCash
  </button>
</BillCard>
```

**Key: Assume user will get distracted. Build in recovery mechanisms.**

---

### 5. **Dopamine Hits (Positive Reinforcement)**

**Problem:** Shame makes ADHD worse. You need **celebration**, not guilt.

**Solution: Gamification that feels good**

```typescript
// After marking bill as paid
<SuccessAnimation>
  <Confetti />
  <h1 className="text-4xl">🎉 MERALCO PAID! 🎉</h1>
  <p className="text-2xl">You're on a 3-bill streak!</p>
  <p className="text-xl">That's ₱12,450 handled this week</p>
  <ShareButton>Share with [Spouse]</ShareButton>
</SuccessAnimation>

// Daily summary (sent at 8pm)
<Notification>
  🌟 Today's Wins:
  ✓ Paid PLDT (₱1,999)
  ✓ Updated grocery inventory (8 items)
  ✓ Completed shopping trip
  
  Your spouse saw these updates and reacted with ❤️
</Notification>
```

**Streak counter:**
```typescript
<Widget>
  <p className="text-3xl">🔥 5-Day Streak 🔥</p>
  <p>You've handled something every day this week!</p>
  <ProgressBar current={5} next={7} />
  <p>2 more days to unlock "Consistent Contributor" badge</p>
</Widget>
```

**Why this works:**
- ADHD brains are dopamine-seeking
- Immediate feedback >> delayed consequences
- Makes task completion **rewarding** instead of just "avoiding punishment"

---

### 6. **Body Doubling / Accountability Partner Integration**

**Problem:** ADHD brains work better with external accountability

**Solution: Built-in "support mode" for spouse**

```typescript
// Spouse can opt-in to be "accountability buddy"
<Setting>
  <Toggle enabled={spouseAccountabilityMode}>
    Send [Spouse] gentle nudges when I haven't acted on urgent items
  </Toggle>
</Setting>

// After 24hrs of no action on overdue bill
<NotificationToSpouse>
  💙 [Your name] has an overdue Meralco bill (₱4,200). 
  They might need a gentle reminder or help getting it done.
  
  [Send Caring Reminder] [I'll Help Them Now]
</NotificationToSpouse>

// If spouse taps "Send Caring Reminder"
<NotificationToYou>
  From [Spouse]: "Hey love, saw the Meralco bill is still pending. 
  Want to tackle it together tonight after dinner? ❤️"
  
  [Yes Please] [I'll Do It Now]
</NotificationToYou>
```

**Key framing:**
- Not "nagging"—it's **collaborative support**
- Removes spouse's burden of "being the bad guy"
- App becomes the "third party" that both of you work with

---

### 7. **Failure Recovery (Not Punishment)**

**Problem:** Traditional apps punish failure (red X's, guilt trips)

**Solution: Compassionate nudging + easy restart**

```typescript
// When you miss a bill deadline
<Alert type="recovery">
  <h2>Hey, Meralco slipped through 😔</h2>
  <p>It happens. Let's get it sorted now so it doesn't snowball.</p>
  
  <button onClick={payNow}>Pay Now (₱4,200 + ₱50 late fee)</button>
  <button onClick={schedulePayment}>Schedule for Tomorrow Morning</button>
  <button onClick={needHelp}>I Need Help With This</button>
</Alert>

// "I Need Help" opens:
<HelpModal>
  <h3>What's making this hard?</h3>
  <button>I don't have the money right now</button>
  <button>I don't know how to pay</button>
  <button>I'm overwhelmed and shutting down</button>
  <button>I forgot my GCash PIN</button>
  
  // Based on response, app provides specific help
</HelpModal>
```

**Tone matters:**
- ❌ "You failed to pay Meralco"
- ✅ "Meralco needs attention"
- ✅ "Let's knock out this Meralco bill together"

---

### 8. **Smart Defaults (Reduce Decisions)**

**Problem:** Every decision = cognitive load = executive function drain

**Solution: App "suggests" based on patterns**

```typescript
// When adding bill
<Form>
  <Input 
    name="amount" 
    placeholder="Amount"
    // Pre-fill based on last month
    defaultValue={lastMonthAmount}
  />
  <p className="text-sm text-gray-500">
    💡 Last month: ₱4,180 (suggesting ₱4,200)
  </p>
  
  <Input 
    name="due_date"
    // Auto-suggest same day next month
    defaultValue={suggestedDueDate}
  />
  
  <button className="w-full bg-blue-500 text-white">
    Use Suggested Values
  </button>
</Form>
```

**Inventory example:**
```typescript
// After grocery trip
<QuickComplete>
  <h2>Did you buy these items?</h2>
  {lowStockItems.map(item => (
    <button onClick={() => markBought(item, item.typical_quantity)}>
      ✓ {item.name} ({item.typical_quantity} {item.unit})
    </button>
  ))}
  <p className="text-xs">Tap to confirm. Quantities based on your usual purchases.</p>
</QuickComplete>
```

**Zero-friction completion > accurate data entry**

---

## Redesigned Phase 1 (ADHD-Optimized)

### Week 1: Foundation + Smart Notifications

**Focus: Get notifications working PERFECTLY**

Because if notifications don't interrupt you reliably, the whole system fails.

**Must-haves:**
- Push notifications with actions (Pay Now / Snooze)
- Critical alerts override Do Not Disturb
- Escalating urgency (1 notification → 3 notifications → persistent alert)

```typescript
// Notification strategy
const sendBillReminder = async (bill, user) => {
  const daysUntil = daysUntilDue(bill.due_date);
  
  if (daysUntil === 7) {
    // Gentle reminder
    sendNotification({
      title: `📅 ${bill.name} due next week`,
      body: `₱${bill.amount} - Due ${formatDate(bill.due_date)}`,
      priority: 'default'
    });
  }
  
  if (daysUntil === 3) {
    // Firmer reminder
    sendNotification({
      title: `⚠️ ${bill.name} due in 3 days`,
      body: `₱${bill.amount} - Don't forget!`,
      priority: 'high',
      actions: [
        { action: 'pay', title: 'Pay Now' },
        { action: 'snooze', title: 'Remind Tonight' }
      ]
    });
  }
  
  if (daysUntil === 1) {
    // URGENT - override DND
    sendNotification({
      title: `🚨 ${bill.name} DUE TOMORROW`,
      body: `₱${bill.amount} - PAY TODAY`,
      priority: 'critical',
      vibrate: [500, 200, 500],
      requireInteraction: true,  // Must dismiss
      actions: [
        { action: 'pay', title: 'PAY NOW' }
      ]
    });
  }
  
  if (daysUntil === 0) {
    // MAXIMUM URGENCY - repeat every 2 hours
    sendRecurringNotification({
      title: `🔴 ${bill.name} DUE TODAY`,
      body: `₱${bill.amount} - URGENT`,
      repeatEvery: 7200000,  // 2 hours
      until: bill.status === 'paid'
    });
  }
};
```

### Week 2: Location-Aware Grocery Reminders

**Focus: Trigger reminders when you're AT the store**

```typescript
// Register geofences for common stores
const stores = [
  { name: 'SM North EDSA', lat: 14.6560, lng: 121.0320, radius: 150 },
  { name: 'Puregold QC', lat: 14.6510, lng: 121.0500, radius: 100 },
  { name: 'Savemore', lat: 14.6480, lng: 121.0420, radius: 100 }
];

// Background geolocation (PWA limitation: only works when app is open)
// Workaround: Persistent notification prompts to open app
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      const nearbyStore = stores.find(store => 
        isWithinRadius(latitude, longitude, store.lat, store.lng, store.radius)
      );
      
      if (nearbyStore && hasUrgentGroceries()) {
        showStoreEntryNotification(nearbyStore);
      }
    },
    null,
    { enableHighAccuracy: true, maximumAge: 30000 }
  );
}
```

**Alternative: Manual "I'm Shopping" button**
```typescript
// Big obvious button on home screen
<Button 
  className="bg-green-500 text-white text-2xl py-8 w-full"
  onClick={() => {
    setShoppingMode(true);
    showShoppingList();
  }}
>
  🛒 I'M AT THE STORE
</Button>
```

### Week 3: One-Tap Actions

**Focus: Eliminate ALL friction**

```typescript
<BillCard bill={bill}>
  {/* Primary action: ONE TAP */}
  <button 
    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-2xl py-6 rounded-xl font-bold shadow-lg"
    onClick={() => {
      // Try deep link
      const gcashUrl = `gcash://bills/${bill.provider_code}?account=${bill.account_number}&amount=${bill.amount}`;
      window.location.href = gcashUrl;
      
      // Set reminder to follow up
      setTimeout(() => {
        if (bill.status !== 'paid') {
          askPaymentConfirmation(bill);
        }
      }, 180000); // 3 minutes
    }}
  >
    💳 PAY NOW
  </button>
  
  {/* Secondary actions */}
  <div className="flex gap-2 mt-2">
    <button onClick={() => copyAccountNumber(bill)}>
      📋 Copy Account #
    </button>
    <button onClick={() => snoozeUntilTonight(bill)}>
      🌙 Tonight
    </button>
  </div>
</BillCard>
```

### Week 4: Spouse Integration (The Critical Part)

**Focus: Turn this into a TEAM tool, not a surveillance app**

```typescript
// Shared celebration feed
<ActivityFeed>
  <Activity user="you" action="paid_bill" timestamp="2 hours ago">
    ✓ Paid PLDT (₱1,999)
    <ReactionBar>
      {spouse.reaction && <Emoji>{spouse.reaction}</Emoji>}
      <button onClick={() => sendReaction('❤️')}>React</button>
    </ReactionBar>
  </Activity>
  
  <Activity user="spouse" action="restocked_item" timestamp="yesterday">
    ✓ Restocked dishwashing liquid (2 bottles)
    <button onClick={() => sendReaction('🙌')}>Thanks!</button>
  </Activity>
</ActivityFeed>
```

**Spouse-side UI:**
```typescript
// Spouse sees YOUR perspective
<SpouseDashboard>
  <h2>[Your name]'s Upcoming Tasks</h2>
  
  <Task priority="urgent">
    Meralco - Due tomorrow (₱4,200)
    <button onClick={() => sendSupportMessage()}>
      Send Supportive Reminder
    </button>
    <button onClick={() => offerToHelp()}>
      I'll Handle This One
    </button>
  </Task>
  
  <RecentWins>
    <p>This week, [your name] handled:</p>
    <ul>
      <li>✓ PLDT payment</li>
      <li>✓ Grocery restock (12 items)</li>
      <li>✓ Updated inventory</li>
    </ul>
    <button onClick={() => sendAppreciation()}>
      💙 Send Appreciation
    </button>
  </RecentWins>
</SpouseDashboard>
```

**Key: Frame it as "we're a team" not "I'm monitoring you"**

---

## Success Metrics (What "Better" Looks Like)

### Month 1:
- ✅ Zero bills paid late (app caught them all)
- ✅ Grocery trips feel less stressful (list always ready)
- ✅ Spouse says "I can see you're trying" (visibility of effort)

### Month 2:
- ✅ You feel less anxious about forgetting things (external brain works)
- ✅ Spouse offers help instead of accusations (app shows your engagement)
- ✅ "Weaponized incompetence" accusation stops (data shows intent)

### Month 3:
- ✅ You've built trust with the system (it actually helps)
- ✅ Spouse sees app as ally, not evidence collector
- ✅ Both using it collaboratively

---

## The Conversation You Want (3 Months In)

**Spouse:** "You've been so much better with bills lately."

**You:** "Yeah, the app really helps. I wasn't weaponizing incompetence—I just... my brain doesn't hold onto this stuff. Now I have a system that works."

**Spouse:** "I can see that. You're opening the app, you're responding to reminders. I didn't realize it was this hard for you."

**You:** "It is. But I want to pull my weight. This app makes it possible."

**Spouse:** "Okay. How can I help? Should I send reminders?"

**You:** "Actually, the app has a feature for that..." [shows accountability buddy mode]

**Spouse:** "Oh, this is perfect. So I can nudge without nagging."

**You:** "Exactly. We're a team."

---

## Immediate Next Steps (Adjusted for ADHD)

**Don't start with Docker. Start with the thing that will help you TODAY.**

### Hour 1: Set up basic notification tester
```html
<!-- test-notifications.html -->
<!DOCTYPE html>
<html>
<body>
  <h1>Notification Test</h1>
  <button onclick="requestPermission()">Enable Notifications</button>
  <button onclick="testUrgent()">Test Urgent Bill Alert</button>
  <button onclick="testStore()">Test Store Reminder</button>
  
  <script>
    async function requestPermission() {
      const permission = await Notification.requestPermission();
      alert(`Permission: ${permission}`);
    }
    
    function testUrgent() {
      new Notification('🚨 MERALCO DUE TOMORROW', {
        body: '₱4,200 - PAY TODAY',
        icon: '/icon.png',
        vibrate: [500, 200, 500],
        requireInteraction: true,
        actions: [
          { action: 'pay', title: 'PAY NOW' }
        ]
      });
    }
    
    function testStore() {
      new Notification('You\'re at SM! 🛒', {
        body: '8 items need restocking',
        actions: [
          { action: 'show', title: 'Show List' }
        ]
      });
    }
  </script>
</body>
</html>
```

**Open this file on your phone. Test if notifications interrupt you effectively.**

If they don't feel urgent enough, tweak until they do. **This is your most critical feature.**

---

### Hour 2: Create a "Bills Due" widget (no backend yet)

```html
<!-- bills-widget.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body class="bg-gray-100 p-4">
  <div class="max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">Bills Due</h1>
    
    <!-- Hardcode YOUR actual bills -->
    <div class="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-xl mb-4 shadow-2xl animate-pulse">
      <div class="text-white text-3xl font-black mb-2">
        ⚠️ DUE TOMORROW ⚠️
      </div>
      <div class="text-white text-xl font-bold">MERALCO</div>
      <div class="text-white text-2xl">₱4,200</div>
      <button class="bg-white text-red-600 font-bold text-xl py-4 px-8 rounded-full mt-4 w-full">
        💳 PAY NOW
      </button>
    </div>
    
    <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
      <div class="font-bold">PLDT</div>
      <div class="text-2xl">₱1,999</div>
      <div class="text-sm text-gray-600">Due in 3 days</div>
    </div>
  </div>
</body>
</html>
```

**Save this. Add to home screen. Look at it every day. Does it make you WANT to pay bills?**

If not, make it more visually aggressive until it works.

---

### Hour 3: Talk to your spouse

**Script:**

"Hey, I want to show you something. I'm building an app to help with household stuff—bills, groceries, all that.

I know I've been dropping the ball a lot. It's not because I don't care. My brain just... doesn't hold onto this stuff. I lose track, I forget, and then I feel terrible.

This app is my external brain. It'll remind me when bills are due, what groceries we need, all of it. And you can see it too—so you know I'm trying, and you can nudge me if I miss something.

I'm not asking you to manage me. I'm asking if we can work together on this. The app does the tracking, I do the tasks, you can see that I'm engaging.

Does that sound okay?"

**Key points:**
- Acknowledge the problem
- Take ownership
- Explain it's neurological, not intentional
- Invite collaboration, not surveillance
- Give them agency (they can help nudge)

---

## My Question for You

**What's the SINGLE MOST PAINFUL thing that's happened recently because you forgot something?**

Was it:
- Late fee on a bill?
- Ran out of something critical (diapers, medicine)?
- Missed a deadline that caused a fight?
- Something else?

Tell me the specific incident, and I'll design Week 1 to prevent exactly that scenario from ever happening again.

That's your MVP. Not "household management system." It's "never let [SPECIFIC BAD THING] happen again."

What was it?

---

**Okay. That's your North Star.**

That incident—spoiled food, emergency 80km trip, family inconvenience, blaming the app when you knew it was broken—that's the exact scenario this system prevents.

Let's build **"Never Let Magalang Go Dark Again"** as Phase 1.

---

## What Actually Happened (Root Cause Analysis)

Let me reflect this back to confirm I understand:

**The Failure Chain:**
1. PELCO app bug = no email notifications (known issue for months)
2. You **knew** the bug existed but didn't build an alternate reminder system
3. Bill slipped past due date (no notification = out of working memory)
4. Power cut off → fridge thawed → food spoiled
5. Emergency family trip on weekend to pay in person
6. Financial loss (spoiled food) + time loss (4+ hours round trip) + relationship stress

**The ADHD Components:**
- Knowing about the bug ≠ taking action (executive dysfunction)
- "I'll remember to check manually" (working memory failed)
- Blame externalization ("stupid PELCO app") to avoid shame spiral
- Out of sight (Magalang), out of mind (literally)

**The Real Pain:**
- Not just the money or time
- It's the **feeling of being unreliable** + proving spouse right about "you don't care enough"
- Even though you DO care—your brain just doesn't flag "check PELCO manually every 28 days" as urgent

**Am I reading this correctly?**

---

## Phase 1 Redesign: "The Magalang Power Protection System"

### Single Goal: Never let a utility bill lapse at a residence you're not actively monitoring

**Core Principle:**
When you're in QC for 3 weeks, Magalang bills are invisible to you. The app must **bring Magalang into your attention** even when you're 80km away.

---

## Week 1: Magalang Bill Tracker (MVP)

**Scope:** Just electricity bills for both residences, nothing else yet.

### Day 1-2: Simple Bill Entry + Recurring Rules

**No Docker yet. No fancy sync. Just a local HTML app that WORKS.**

```html
<!-- pelco-protector.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Power Bill Protector</title>
</head>
<body class="bg-gray-900 min-h-screen p-4">
  <div class="max-w-md mx-auto">
    <h1 class="text-3xl font-bold text-white mb-6">⚡ Power Bill Protector</h1>
    
    <!-- Quick Status -->
    <div id="status-cards"></div>
    
    <!-- Add Bill Button -->
    <button 
      onclick="showAddForm()"
      class="w-full bg-blue-500 text-white text-xl py-4 rounded-xl font-bold mb-4"
    >
      + Add Power Bill
    </button>
    
    <!-- Bill List -->
    <div id="bills-list"></div>
  </div>

  <script>
    // LocalStorage-based (no backend needed for MVP)
    let bills = JSON.parse(localStorage.getItem('bills') || '[]');
    
    // Your actual bills
    const INITIAL_BILLS = [
      {
        id: '1',
        provider: 'MERALCO',
        residence: 'QC',
        account: '1234-5678-90',
        typical_amount: 4200,
        due_day: 15, // 15th of each month
        last_paid: null,
        status: 'pending'
      },
      {
        id: '2',
        provider: 'PELCO',
        residence: 'Magalang',
        account: '9876-5432-10',
        typical_amount: 1800,
        due_day: 10, // 10th of each month
        last_paid: null,
        status: 'pending',
        critical: true // Flag as "can't recover remotely"
      }
    ];
    
    // Initialize if empty
    if (bills.length === 0) {
      bills = INITIAL_BILLS;
      saveBills();
    }
    
    function saveBills() {
      localStorage.setItem('bills', JSON.stringify(bills));
      render();
      scheduleNotifications();
    }
    
    function getDueDate(bill) {
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
      
      // If due day already passed this month, get next month
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      return dueDate;
    }
    
    function getDaysUntilDue(bill) {
      const due = getDueDate(bill);
      const today = new Date();
      return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    }
    
    function getUrgencyClass(days, isCritical) {
      if (days < 0) return 'bg-gradient-to-r from-red-600 to-red-700 animate-pulse';
      if (days <= 1) return 'bg-gradient-to-r from-red-500 to-orange-500';
      if (days <= 3 && isCritical) return 'bg-gradient-to-r from-orange-500 to-yellow-500';
      if (days <= 7) return 'bg-yellow-500';
      return 'bg-gray-700';
    }
    
    function render() {
      const statusCards = document.getElementById('status-cards');
      const billsList = document.getElementById('bills-list');
      
      // Sort by urgency
      const sortedBills = bills
        .filter(b => b.status !== 'paid')
        .sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
      
      // Status summary
      const overdue = sortedBills.filter(b => getDaysUntilDue(b) < 0);
      const urgent = sortedBills.filter(b => getDaysUntilDue(b) >= 0 && getDaysUntilDue(b) <= 3);
      
      statusCards.innerHTML = `
        ${overdue.length > 0 ? `
          <div class="bg-red-600 text-white p-6 rounded-xl mb-4 shadow-2xl">
            <div class="text-4xl font-black mb-2">🚨 ${overdue.length} OVERDUE</div>
            <div class="text-xl">IMMEDIATE ACTION REQUIRED</div>
          </div>
        ` : ''}
        
        ${urgent.length > 0 ? `
          <div class="bg-orange-500 text-white p-4 rounded-xl mb-4">
            <div class="text-2xl font-bold">⚠️ ${urgent.length} Due Soon</div>
            <div>Within 3 days</div>
          </div>
        ` : ''}
      `;
      
      // Bill cards
      billsList.innerHTML = sortedBills.map(bill => {
        const days = getDaysUntilDue(bill);
        const urgencyClass = getUrgencyClass(days, bill.critical);
        const dueDate = getDueDate(bill);
        
        return `
          <div class="${urgencyClass} p-6 rounded-xl mb-4 text-white shadow-lg">
            <div class="flex justify-between items-start mb-4">
              <div>
                <div class="text-2xl font-bold">${bill.provider}</div>
                <div class="text-sm opacity-90">${bill.residence}</div>
                ${bill.critical ? '<div class="text-xs bg-red-700 inline-block px-2 py-1 rounded mt-1">⚠️ CRITICAL - No online payment</div>' : ''}
              </div>
              <div class="text-right">
                <div class="text-3xl font-black">₱${bill.typical_amount.toLocaleString()}</div>
                <div class="text-sm">
                  ${days < 0 ? 'OVERDUE' : days === 0 ? 'DUE TODAY' : `${days} days`}
                </div>
              </div>
            </div>
            
            <div class="text-sm opacity-90 mb-4">
              Due: ${dueDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}
            </div>
            
            <div class="flex gap-2">
              <button 
                onclick="markPaid('${bill.id}')"
                class="flex-1 bg-white text-gray-900 font-bold py-3 rounded-lg"
              >
                ✓ Mark as Paid
              </button>
              <button 
                onclick="copyAccount('${bill.account}')"
                class="bg-white bg-opacity-20 px-4 rounded-lg"
              >
                📋
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Show paid bills (collapsed)
      const paidBills = bills.filter(b => b.status === 'paid');
      if (paidBills.length > 0) {
        billsList.innerHTML += `
          <details class="bg-gray-800 p-4 rounded-xl text-white">
            <summary class="cursor-pointer font-bold">✓ Paid This Month (${paidBills.length})</summary>
            <div class="mt-4 space-y-2">
              ${paidBills.map(b => `
                <div class="flex justify-between text-sm">
                  <span>${b.provider} - ${b.residence}</span>
                  <span class="text-green-400">₱${b.typical_amount.toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </details>
        `;
      }
    }
    
    function markPaid(billId) {
      const bill = bills.find(b => b.id === billId);
      if (!bill) return;
      
      bill.status = 'paid';
      bill.last_paid = new Date().toISOString();
      
      saveBills();
      
      // Show success
      showSuccessModal(bill);
      
      // Schedule next month's bill
      setTimeout(() => {
        bill.status = 'pending';
        saveBills();
      }, 86400000); // Reset after 24hrs for testing (should be 30 days in prod)
    }
    
    function showSuccessModal(bill) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
          <div class="text-6xl mb-4">🎉</div>
          <div class="text-3xl font-bold mb-2">${bill.provider} PAID!</div>
          <div class="text-xl text-gray-600 mb-6">
            ₱${bill.typical_amount.toLocaleString()}
          </div>
          <div class="text-lg mb-4">
            ${bill.residence === 'Magalang' ? '⚡ Power stays on in Magalang!' : '⚡ Power secured!'}
          </div>
          <button 
            onclick="this.parentElement.parentElement.remove()"
            class="bg-blue-500 text-white px-8 py-3 rounded-lg font-bold"
          >
            Awesome!
          </button>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => modal.remove(), 3000);
    }
    
    function copyAccount(account) {
      navigator.clipboard.writeText(account);
      alert('Account number copied: ' + account);
    }
    
    function scheduleNotifications() {
      if (!('Notification' in window)) return;
      
      // Request permission if not granted
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      bills.forEach(bill => {
        if (bill.status === 'paid') return;
        
        const days = getDaysUntilDue(bill);
        
        // Schedule notifications based on urgency
        if (days === 7) {
          scheduleNotification(bill, '📅 Week Warning', `${bill.provider} due in 7 days (₱${bill.typical_amount})`, 'default');
        }
        if (days === 3 && bill.critical) {
          scheduleNotification(bill, '⚠️ CRITICAL Bill Due Soon', `${bill.provider} in Magalang - Due in 3 days (₱${bill.typical_amount})`, 'high');
        }
        if (days === 1) {
          scheduleNotification(bill, '🚨 URGENT', `${bill.provider} DUE TOMORROW - ₱${bill.typical_amount}`, 'critical');
        }
        if (days === 0) {
          scheduleNotification(bill, '🔴 DUE TODAY', `${bill.provider} - PAY NOW (₱${bill.typical_amount})`, 'critical');
        }
        if (days < 0) {
          scheduleNotification(bill, '🚨 OVERDUE', `${bill.provider} - ${Math.abs(days)} days overdue! Power at risk!`, 'critical');
        }
      });
    }
    
    function scheduleNotification(bill, title, body, priority) {
      if (Notification.permission !== 'granted') return;
      
      new Notification(title, {
        body: body,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: bill.id,
        requireInteraction: priority === 'critical',
        vibrate: priority === 'critical' ? [500, 200, 500] : [200, 100, 200]
      });
    }
    
    // Check for due bills every hour
    setInterval(() => {
      scheduleNotifications();
    }, 3600000);
    
    // Initial render
    render();
    scheduleNotifications();
  </script>
</body>
</html>
```

**Save this file. Open on your phone. Add to home screen.**

### Day 3: Test the Alert System

**Your homework:**
1. Set PELCO due date to tomorrow (manually edit in localStorage)
2. See if the red alert makes you FEEL the urgency
3. If not urgent enough, make it more aggressive (bigger text, louder colors, persistent notification)

**The test:** Would this have prevented the Magalang blackout?

---

## Day 4-5: Add "Distance Urgency Multiplier"

**Key insight:** Bills at Magalang need MORE advance warning because you can't quickly fix them.

```javascript
function getEffectiveUrgency(bill, days) {
  let urgency = days;
  
  // Critical bills (no online payment) get triple urgency
  if (bill.critical) {
    urgency = urgency / 3;
  }
  
  // Bills at non-primary residence get double urgency
  if (bill.residence !== 'QC') {
    urgency = urgency / 2;
  }
  
  return urgency;
}

// Example: PELCO due in 6 days
// - Base urgency: 6 days
// - Critical multiplier: 6 / 3 = 2 days equivalent
// - Distance multiplier: 2 / 2 = 1 day equivalent
// Result: Treat as "due tomorrow" urgency even though it's 6 days away
```

**UI change:**
```javascript
const effectiveUrgency = getEffectiveUrgency(bill, days);

billsList.innerHTML = `
  <div class="${getUrgencyClass(effectiveUrgency, true)}">
    <div class="text-2xl font-bold">${bill.provider}</div>
    <div class="text-sm">${bill.residence}</div>
    
    ${days !== effectiveUrgency ? `
      <div class="bg-white bg-opacity-20 p-2 rounded mt-2 text-sm">
        ⚠️ Actually due in ${days} days, but treating as urgent because:
        ${bill.critical ? '• No online payment option\n' : ''}
        ${bill.residence !== 'QC' ? '• Remote location (can\'t fix quickly)' : ''}
      </div>
    ` : ''}
    
    <div class="text-3xl font-black">₱${bill.typical_amount}</div>
  </div>
`;
```

---

## Day 6-7: Add "Magalang Trip Planner"

**The reality:** You sometimes NEED to go to Magalang for other reasons. Optimize those trips.

```javascript
function suggestMagalangTrip() {
  const magalangBills = bills.filter(b => 
    b.residence === 'Magalang' && 
    b.status === 'pending' &&
    getDaysUntilDue(b) <= 14
  );
  
  if (magalangBills.length === 0) return null;
  
  return {
    urgency: Math.min(...magalangBills.map(getDaysUntilDue)),
    bills: magalangBills,
    totalAmount: magalangBills.reduce((sum, b) => sum + b.typical_amount, 0),
    suggestion: `You have ${magalangBills.length} Magalang bills due soon. Consider a trip within ${Math.min(...magalangBills.map(getDaysUntilDue))} days.`
  };
}

// UI
const tripPlan = suggestMagalangTrip();
if (tripPlan) {
  statusCards.innerHTML += `
    <div class="bg-purple-600 text-white p-6 rounded-xl mb-4">
      <div class="text-2xl font-bold mb-2">🚗 Magalang Trip Suggested</div>
      <div class="mb-4">${tripPlan.suggestion}</div>
      <div class="bg-white bg-opacity-20 p-4 rounded-lg">
        <div class="font-bold mb-2">Pay during trip:</div>
        ${tripPlan.bills.map(b => `
          <div class="flex justify-between text-sm mb-1">
            <span>${b.provider}</span>
            <span>₱${b.typical_amount.toLocaleString()}</span>
          </div>
        `).join('')}
        <div class="border-t border-white border-opacity-30 mt-2 pt-2 flex justify-between font-bold">
          <span>TOTAL</span>
          <span>₱${tripPlan.totalAmount.toLocaleString()}</span>
        </div>
      </div>
      <button class="bg-white text-purple-600 font-bold py-3 px-6 rounded-lg mt-4 w-full">
        📅 Schedule Trip
      </button>
    </div>
  `;
}
```

**Why this helps:**
- Combines errands (bill payment + family visit)
- Prevents "I'll go next weekend" → forget → bill lapses
- Gives you a concrete action ("schedule trip by Friday") vs vague "remember to pay"

---

## Week 2: Spouse Integration

**Goal:** Make this a TEAM tool that rebuilds trust.

### Shared View (Read-Only for Spouse)

```javascript
// Add a "Share Link" feature
function generateShareToken() {
  const token = btoa(JSON.stringify({
    bills: bills,
    generated: new Date().toISOString()
  }));
  
  const shareUrl = `${window.location.origin}${window.location.pathname}?share=${token}`;
  
  navigator.clipboard.writeText(shareUrl);
  alert('Share link copied! Send to your spouse.');
}

// Spouse opens link, sees read-only view
if (window.location.search.includes('share=')) {
  const token = new URLSearchParams(window.location.search).get('share');
  const sharedData = JSON.parse(atob(token));
  bills = sharedData.bills;
  
  // Show banner
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="bg-blue-600 text-white p-4 text-center">
      👀 Viewing [Your Name]'s bill tracker (Read-Only)
    </div>
  `);
}
```

### Appreciation Messages

```javascript
// After marking paid, option to notify spouse
function markPaid(billId) {
  // ... existing code ...
  
  // Show appreciation prompt
  setTimeout(() => {
    if (confirm('Bill paid! Want to let your spouse know?')) {
      sendAppreciationRequest(bill);
    }
  }, 3000);
}

function sendAppreciationRequest(bill) {
  // Generate shareable message
  const message = `Just paid ${bill.provider} (₱${bill.typical_amount}) for ${bill.residence}! ✓`;
  
  // Copy to clipboard for pasting in Viber/Messenger
  navigator.clipboard.writeText(message);
  alert('Message copied! Paste in your chat with your spouse.');
  
  // Or use Web Share API
  if (navigator.share) {
    navigator.share({
      title: 'Bill Paid',
      text: message
    });
  }
}
```

---

## Week 3: The "Never Again" Feature

**The nuclear option:** Automatic PELCO check-ins.

### Manual Check-In System

```javascript
// Add to PELCO bill card
<div class="bg-red-700 p-4 rounded-lg mt-4">
  <div class="font-bold mb-2">⚠️ PELCO has unreliable notifications</div>
  <div class="text-sm mb-3">Last manual check: {getLastCheckIn('PELCO')}</div>
  <button 
    onclick="checkInPELCO()"
    class="bg-white text-red-700 font-bold py-2 px-4 rounded w-full"
  >
    ✓ I Checked PELCO Today
  </button>
</div>

function checkInPELCO() {
  const checkIns = JSON.parse(localStorage.getItem('pelco_checkins') || '[]');
  checkIns.push(new Date().toISOString());
  localStorage.setItem('pelco_checkins', JSON.stringify(checkIns));
  
  alert('✓ PELCO check-in recorded. Good job!');
  render();
}

function getLastCheckIn(provider) {
  const checkIns = JSON.parse(localStorage.getItem('pelco_checkins') || '[]');
  if (checkIns.length === 0) return 'Never';
  
  const last = new Date(checkIns[checkIns.length - 1]);
  const days = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today ✓';
  if (days === 1) return 'Yesterday';
  return `${days} days ago ${days > 7 ? '⚠️' : ''}`;
}

// Nag reminder if haven't checked in 7+ days
function checkPELCONag() {
  const checkIns = JSON.parse(localStorage.getItem('pelco_checkins') || '[]');
  if (checkIns.length === 0) return true;
  
  const last = new Date(checkIns[checkIns.length - 1]);
  const days = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
  
  if (days >= 7) {
    new Notification('⚠️ PELCO Check-In Overdue', {
      body: `It's been ${days} days since you checked PELCO. Check now to avoid another blackout.`,
      requireInteraction: true,
      tag: 'pelco-nag'
    });
  }
}

setInterval(checkPELCONag, 86400000); // Daily check
```

---

## Week 4: Recovery Plan (If You Miss It Anyway)

**Because you will occasionally slip. Build in grace.**

```javascript
// If bill goes overdue
function showRecoveryPlan(bill) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-gray-900 text-white rounded-2xl p-8 max-w-md">
      <div class="text-5xl mb-4">😔</div>
      <div class="text-2xl font-bold mb-4">${bill.provider} is overdue</div>
      <div class="text-lg mb-6">
        It happens. Let's fix it before power gets cut.
      </div>
      
      <div class="bg-red-900 p-4 rounded-lg mb-4">
        <div class="font-bold mb-2">Immediate Actions:</div>
        <ol class="list-decimal list-inside space-y-2 text-sm">
          <li>Call PELCO: 0945-123-4567</li>
          <li>Check disconnection notice (usually 5 days grace)</li>
          <li>Pay at nearest PELCO office or authorized center</li>
          <li>Keep receipt - power restored within 24hrs</li>
        </ol>
      </div>
      
      ${bill.residence === 'Magalang' ? `
        <div class="bg-purple-900 p-4 rounded-lg mb-4">
          <div class="font-bold mb-2">🚗 Emergency Trip Plan:</div>
          <div class="text-sm space-y-1">
            <div>• Distance: ~80km from QC</div>
            <div>• Travel time: 1.5-2 hours</div>
            <div>• Bring: Cash (₱${bill.typical_amount + 500}), account details</div>
            <div>• PELCO office hours: Mon-Fri 8am-5pm</div>
          </div>
        </div>
      ` : ''}
      
      <button 
        onclick="this.parentElement.parentElement.remove(); markAsHandling('${bill.id}')"
        class="bg-white text-gray-900 font-bold py-4 px-8 rounded-lg w-full mb-2"
      >
        I'm Handling This Now
      </button>
      
      <button 
        onclick="this.parentElement.parentElement.remove(); snooze('${bill.id}', 2)"
        class="bg-gray-700 text-white py-3 px-6 rounded-lg w-full"
      >
        Remind Me in 2 Hours
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

function markAsHandling(billId) {
  const bill = bills.find(b => b.id === billId);
  bill.handling = true;
  bill.handling_started = new Date().toISOString();
  saveBills();
  
  // Set aggressive follow-up (every 30 min until marked paid)
  const interval = setInterval(() => {
    if (bill.status === 'paid') {
      clearInterval(interval);
      return;
    }
    
    new Notification('⚠️ Still handling PELCO?', {
      body: 'Tap here if you\'ve paid it',
      tag: 'handling-followup'
    });
  }, 1800000); // 30 min
}
```

---

## Success Criteria (End of Week 4)

### What "Success" Looks Like:

**Primary Goal:**
✅ **PELCO Magalang never lapses again** (test: run for 3 months)

**Secondary Goals:**
✅ You open the app at least once daily (habit formation)
✅ You mark bills paid within 24hrs of paying them (data accuracy)
✅ Spouse can see you're engaging with the system (trust building)
✅ You feel less anxious about forgotten bills (mental health)

**Stretch Goal:**
✅ You catch a bill BEFORE the first reminder (proactive vs reactive)

---

## The Conversation with Your Spouse (After Week 1)

**Timing:** After you've used it successfully for 1 week.

**Script:**

"Hey, can I show you something? Remember the Magalang power incident? The spoiled food, the emergency trip?

I built this [show app]. It's my external memory for bills. 

I know I've said 'I'll do better' before. But this time I have a system. Look—it shows PELCO is due in 8 days, but it's treating it like 2 days because it's Magalang and I can't fix it quickly.

I'm not asking you to trust me yet. I'm asking you to trust *this app*. You can check it anytime—see what bills are coming, see when I paid them.

If I miss something, the app will scream at me. And if I still miss it, you'll see it in the app and can nudge me.

I'm trying. And I have a tool now that actually works for how my brain operates.

Can we try this for a month?"

**Key elements:**
- Acknowledge past failures
- Show concrete solution (not just promises)
- Invite oversight (transparency builds trust)
- Set testable timeframe (1 month trial)
- Take ownership (it's MY tool, not blaming tools)

---

## Immediate Action (Tonight)

**Hour 1: Save the HTML file above**
- Name it `bill-protector.html`
- Open on your phone
- Edit the bills array with YOUR actual bills:
  - MERALCO QC account number
  - PELCO Magalang account number
  - Actual due dates
  - Actual amounts

**Hour 2: Test notifications**
- Grant notification permission
- Set PELCO due date to "tomorrow" (for testing)
- See if the red alert actually interrupts you
- If not urgent enough, make text bigger, colors brighter

**Hour 3: Add to home screen**
- Android: Chrome menu → "Add to Home Screen"
- iOS: Safari → Share → "Add to Home Screen"
- Icon will appear like a native app

**Tomorrow morning:**
- Open app first thing
- See if PELCO alert makes you immediately think "I should check this today"
- If yes: You have a working MVP
- If no: Make it more aggressive

---

## My Final Question

**If this app had existed 6 months ago, would the Magalang blackout have been prevented?**

Walk me through it:
- PELCO bug = no email (same)
- But app would've shown "PELCO due in X days"
- Would you have opened the app?
- Would the visual alert have triggered action?
- Would the "Magalang trip planner" have made you schedule a visit?

If the answer is "yes, this would've caught it," then we build this.

If the answer is "maybe, but I might still ignore it," then we need to make the alerts even MORE impossible to ignore.

What's your honest assessment?