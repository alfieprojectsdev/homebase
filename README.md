# Homebase

**Your household command center. Never forget bills, maintenance, or household tasks again.**

---

## 🏠 Overview

Homebase is a multi-residence household management system designed specifically for **ADHD executive function support**. It provides aggressive, context-aware reminders to prevent catastrophic failures like forgotten utility bills, missed maintenance deadlines, and emergency situations.

### The Problem It Solves

Traditional reminder apps fail for ADHD brains because:
- Notifications are too passive and easy to dismiss
- They don't understand context (which residence you're at)
- They don't escalate urgency appropriately
- They don't learn from patterns or anticipate problems

Homebase is different. It's built around the principle: **"The system catches it, so your brain doesn't have to."**

### Core Philosophy

> "The best system is the one that exists. Done is better than perfect."

Homebase prioritizes **reliability over features**. A simple bill tracker that works 100% of the time beats a sophisticated AI system that fails once and causes an emergency trip during a typhoon.

---

## ✨ Features

### Phase 1 ✅ COMPLETE - Foundation
- ✅ Multi-residence bill tracking (utilities, rent, property taxes, HOA, insurance)
- ✅ **Bill recurrence** (monthly/quarterly/biannual/annual auto-generation)
- ✅ **Password reset flow** (forgot password → email-free Phase 1 → reset password)
- ✅ ADHD-optimized visual urgency system (color-coded by days until due)
- ✅ Authentication with row-level security (JWT + httpOnly cookies)
- ✅ Mobile-first responsive design (44px+ touch targets)
- ✅ Multi-tenancy with organization scoping
- ✅ **Production deployment** (Vercel + Neon Postgres)
- ✅ **Comprehensive E2E testing** (Playwright, 100% pass rate)

### Phase 1.5 ✅ COMPLETE - Alpha Testing Ready
- ✅ Password reset without email (manual token sharing)
- ✅ Recurring bill auto-generation (mark paid → creates next occurrence)
- ✅ Duplicate prevention for recurring bills
- ✅ PelicanoFamily alpha testing accounts (5 users)
- ✅ Production E2E test suite (32 tests, 100% passing)

### 🚧 Pending Review / Worktree Features
- 🏗️ **Heuristics System**: Pattern recognition, anomaly detection, and smart suggestions for bills
- 🏗️ **Chores Management**: Integrated chores tracking with multi-residence support and visual progress bars

### Phase 2-4 (Next)
- 📋 Mission-critical push notifications with SMS fallback
- 📋 Offline-first PWA with background sync
- 📋 Weather-aware travel risk assessment (prevents dangerous trips)
- 📋 Spouse collaboration features

### Phase 5-11 (Planned)
- 📋 Grocery inventory & shopping lists
- 🚗 Vehicle maintenance tracking
- 🏡 Home repairs & improvement projects
- 🏥 Medical records (human + pets)
- 🎓 Educational credentials
- 📚 Book library
- 🔧 Appliance warranties & repairs

### Phase 12-13 (Future)
- 🤖 **JARVIS**: Self-hosted conversational AI assistant
- 🗣️ Voice interface with wake word
- 🧠 Proactive suggestions based on patterns
- 🏠 Fully local LLM (no cloud dependencies)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- [Neon](https://neon.tech) account (free tier)
- Vercel account for deployment (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/alfieprojectsdev/homebase.git
cd homebase

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and JWT_SECRET

# Generate JWT secret
openssl rand -base64 32

# Push database schema
npx drizzle-kit push:pg

# (Optional) Seed development data
npm run db:seed

# (Optional) Seed PelicanoFamily alpha testing accounts
npx tsx src/lib/db/seed-pelicano-family.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create your first account.

### Deployment

```bash
# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - JWT_SECRET
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) | Server components, edge runtime, Vercel-optimized |
| **UI** | Tailwind CSS + Shadcn/ui | ADHD-optimized high contrast, large touch targets |
| **Database** | Neon Postgres + Drizzle ORM | Serverless, branching, type-safe queries |
| **Auth** | Custom JWT + httpOnly cookies | Simple, edge-compatible, no external deps |
| **Deployment** | Vercel (Phase 1-11) → Self-hosted (Phase 12+) | Fast iteration → full control |

### Development Tools

| Tool | Purpose |
|------|---------|
| **OpenCode + Sisyphus** | Agentic coding with GLM-4.7 |
| **GLM-4 (7B)** | Local LLM for code generation |
| **Cursor / VS Code** | Primary IDE |
| **Drizzle Studio** | Database management GUI |


### Database Schema (Phase 1.5)

```
organizations (family units)
  ├── residences (Urban Home, Rural Property, etc.)
  ├── users (family members)
  ├── password_reset_tokens (password reset flow)
  └── financial_obligations (bills with recurrence support)
       ├── recurrence_enabled (boolean)
       ├── recurrence_frequency (monthly/quarterly/biannual/annual)
       ├── recurrence_interval (custom intervals)
       └── parent_bill_id (tracks bill lineage)
```

Full schema: See [`/docs/ADR.md`](./docs/ADR.md)

### Key Design Decisions

1. **Multi-tenancy from day one**: Every table scoped by `org_id` for row-level security
2. **Offline-first architecture**: IndexedDB + background sync (Phase 4)
3. **Notification escalation**: Web Push → In-app → SMS → Spouse escalation
4. **Self-hosted endgame**: No vendor lock-in, runs on home server with local LLM

---

## 🏗️ Architecture Patterns

Homebase follows proven enterprise software patterns:

- **Master Data Management (ERP)**: Multi-tenant data isolation by organization
- **Activity Timeline (CRM)**: Complete audit trail of all bill changes  
- **Subscription Management (E-commerce)**: Flexible recurring bill engine
- **Adherence Tracking (Healthcare)**: Non-judgmental progress metrics for ADHD users

See [Pattern Reference](./docs/PATTERNS.md) for implementation details.

---

## 🎯 Use Cases

### 1. Prevent Utility Disconnections

**Problem:** Forgot electric bill → power cut → food spoiled → emergency trip during storm

**Solution:**
- 14 days before: "Electric bill due in 2 weeks - calendar it"
- 7 days before: "Electric bill critical - plan remote property trip"
- 3 days before: "Electric bill + storm forecast = URGENT: pay early"
- If unacknowledged: SMS + spouse notification

### 2. Multi-Residence Context Awareness

**Problem:** At urban residence, forgetting about rural property bills/maintenance

**Solution:**
- Bills tagged by residence
- Location detection prioritizes current residence
- Reminders escalate faster for remote residences (can't quickly fix)

### 3. Spouse Collaboration Without Surveillance

**Problem:** Needs equal visibility without "checking up on you" dynamics

**Solution:**
- Shared activity feed: "X paid electric company"
- Contribution summary (not tracking, just transparency)
- Spouse receives escalation only for critical unacknowledged items

---

## 📱 Screenshots

*(Coming soon - add after Phase 1 UI is complete)*

---

## 🧠 ADHD-Optimized Design Principles

### Visual Urgency
- **Overdue:** Red gradient with pulse animation
- **Due tomorrow:** Red/orange gradient
- **Due in 3 days (critical bills):** Orange
- **Due in 7 days:** Yellow
- **Due later:** White/gray

### Interaction Design
- **Large touch targets** (44px minimum)
- **One-tap actions** ("Pay Now" opens GCash with pre-filled data)
- **Quick capture inbox** (dump thoughts, organize later)
- **No subtle cues** (ADHD brains ignore subtle → use aggressive styling)

### Notification Strategy
- **Require acknowledgment** for critical items (can't dismiss without action)
- **Escalate if ignored** (Web Push → SMS → Spouse → Repeat)
- **Context-aware timing** (send reminders when user is at relevant location)

---

## 🛠️ Development

### Project Structure

```
homebase/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Public auth pages
│   │   ├── (dashboard)/       # Protected dashboard
│   │   └── api/               # API routes
│   ├── lib/
│   │   ├── auth/              # JWT + password utils
│   │   ├── db/                # Drizzle schema + client
│   │   └── notifications/     # Notification engine (Phase 2)
│   ├── components/
│   │   └── ui/                # Shadcn components
│   └── middleware.ts          # Route protection
├── docs/
│   └── ADR.md                 # Architecture Decision Record (complete spec)
├── drizzle/                   # Database migrations
└── public/                    # Static assets + PWA manifest
```

### Key Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run start                  # Start production server

# Database
npx drizzle-kit generate:pg    # Generate migration
npx drizzle-kit push:pg        # Push schema to database
npm run db:seed                # Seed development data
npx drizzle-kit studio         # Open Drizzle Studio (DB GUI)

# Type checking
npm run type-check             # Run TypeScript compiler

# Deployment
vercel                         # Deploy to Vercel
```

### Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
JWT_SECRET="generate-with-openssl-rand-base64-32"

# Phase 2+ (notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Phase 3+ (weather integration)
OPENWEATHER_API_KEY=""

# Phase 12+ (self-hosted JARVIS)
OLLAMA_URL="http://localhost:11434"
```

### Adding New Domains

See full guide in [`/docs/ADR.md`](./docs/ADR.md), but in short:

1. Add table to `src/lib/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate:pg`
3. Create API routes: `src/app/api/[domain]/route.ts`
4. Build UI: `src/app/(dashboard)/[domain]/page.tsx`
5. Add notification logic: `src/lib/notifications/[domain].ts`

---

## 🧪 Testing

### Test Coverage (Current)

**E2E Tests (Playwright):**
- ✅ 32 tests total (100% passing against production)
- ✅ Authentication flows (6 tests)
- ✅ Bills CRUD operations (11 tests)
- ✅ Bill recurrence features (10 tests)
- ✅ Security & multi-tenancy (6 tests)
- ✅ Password reset flow (12 tests - pending deployment)
- ✅ PelicanoFamily alpha testing (5 tests)

**Production URL:** https://homebase-blond.vercel.app

**Alpha Testing Accounts:**
- Organization: PelicanoFamily
- Users: Alfie, Andrej, Bhazel, Arja, Adrienne
- Credentials: [name]@pelicano.family / [Name]@Pelicano

### Running Tests

```bash
# Run all E2E tests against production
BASE_URL="https://homebase-blond.vercel.app" npm run test:e2e

# Run specific test suite
npm run test:e2e -- bills.spec.ts
npm run test:e2e -- password-reset.spec.ts
npm run test:e2e -- pelicano-family.spec.ts

# Open Playwright UI mode
npm run test:e2e:ui
```

### Manual Testing Checklist (Phase 1)

```bash
# Auth flow
- [x] Sign up creates org + residence + user
- [x] Login sets JWT cookie
- [x] Protected routes redirect to /login if not authenticated
- [x] Logout clears session
- [x] Password reset flow (forgot → reset)

# Bills CRUD
- [x] Can add bill (Electric, Water, Internet, etc.)
- [x] Bills list shows correct urgency colors
- [x] Overdue bills appear at top
- [x] Can mark bill as paid
- [x] Paid bills show green badge
- [x] Bills filtered by user's organization only
- [x] Recurring bills auto-generate on mark paid

# Mobile
- [x] Responsive on phone (test actual device)
- [x] Touch targets easy to tap (44px+)
- [x] Text readable without zooming
```

---

## 📚 Documentation

- **[Architecture Decision Record](/docs/ADR.md)** - Complete technical specification (Phases 1-13)
- **[Contributing Guide](/docs/CONTRIBUTING.md)** - How to contribute *(coming soon)*
- **[API Documentation](/docs/API.md)** - API reference *(coming soon)*
- **[Self-Hosting Guide](/docs/SELF_HOSTING.md)** - Deploy on home server (Phase 12+) *(coming soon)*

---

## 🗺️ Roadmap

### 2026 Q1 (Jan-Mar)
- ✅ Phase 1: Bills + Auth + Multi-tenancy
- ✅ Phase 1.5: Bill Recurrence + Password Reset + Alpha Testing
- 🚧 **Heuristics & Chores** (Started early!)
- 📋 Phase 2: Mission-critical notifications (NEXT)
- 📋 Phase 3: Weather integration + trip scheduler
- 📋 Phase 4: Offline PWA

### 2026 Q2 (Apr-Jun)
- 📋 Phase 5: Groceries + inventory
- 📋 Phase 6: Multi-residence context awareness
- 📋 Phase 7: Spouse collaboration

### 2026 Q3 (Jul-Sep)
- 📋 Phase 8-11: Additional domains (vehicles, repairs, medical, documents)
- 📋 Phase 12: RAG + semantic search

### 2026 Q4 (Oct-Dec)
- 🤖 Phase 13: Self-hosted JARVIS with local LLM
- 🗣️ Voice interface
- 🏠 Full homelab deployment

---

## 💡 Philosophy

### Why Build This?

Traditional productivity apps assume:
- ✅ You remember to check them
- ✅ You can prioritize tasks mentally
- ✅ You notice when things become urgent
- ✅ You follow through consistently

**ADHD brains don't work that way.**

Homebase is built on different assumptions:
- ❌ You WON'T remember to check
- ✅ The system WILL interrupt you aggressively
- ✅ Urgency is VISUAL and impossible to miss
- ✅ The system LEARNS and becomes proactive

### Design Inspiration

- **JARVIS (Iron Man)**: Proactive, context-aware, conversational assistant
- **ADHD medication**: Doesn't fix the brain, provides external structure
- **Mission-critical systems**: Redundancy, escalation, fail-safes
- **Home automation**: Ambient intelligence, anticipates needs

### Core Values

1. **Privacy**: Your household data never leaves your control (self-hosted endgame)
2. **Reliability**: Notifications MUST work. SMS fallback, spouse escalation, no single point of failure
3. **Simplicity**: Ship working features > perfect architecture
4. **Extensibility**: Easy to add new domains without rewriting core
5. **Zero subscriptions**: One-time hardware cost > monthly fees forever

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Neon](https://neon.tech) - Serverless Postgres
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Shadcn/ui](https://ui.shadcn.com/) - Accessible components
- [Ollama](https://ollama.ai/) - Local LLM runtime (Phase 13)

Inspired by real-life emergency situations that could have been prevented with better systems.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

## 🤝 Contributing

Contributions welcome! This project is in active development.

**Priority areas:**
- ADHD-focused UX improvements
- Notification reliability
- Self-hosting documentation
- Additional domain implementations

See [CONTRIBUTING.md](/docs/CONTRIBUTING.md) *(coming soon)*

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/alfieprojectsdev/homebase/issues)
- **Discussions:** [GitHub Discussions](https://github.com/alfieprojectsdev/homebase/discussions)
- **Email:** your.email@example.com

---

## ⚠️ Disclaimer

Homebase is a household management tool, not a substitute for:
- Medical treatment for ADHD
- Professional financial advice
- Legal or tax guidance
- Emergency services

Always seek professional help for critical matters.

---

**Built with ❤️ for ADHD brains by someone who gets it.**

---

*Last updated: January 12, 2026*