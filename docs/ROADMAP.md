# Homebase Roadmap

An ADHD-friendly household management system that catches important tasks before they become catastrophic failures.

**Core Philosophy:** "The system catches it, so your brain doesn't have to."

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Shipped & stable |
| 🚧 | In progress (active development) |
| 🗓 | Planned (roadmap committed) |
| 💡 | Exploring (optional, investigating) |

---

## Core Platform Phases

| Phase | Name | Status | Scope |
|-------|------|--------|-------|
| 1 | Bills + Auth + PWA | ✅ | Core CRUD, authentication, push-ready infrastructure |
| 2 | Notifications + Heuristics | ✅ | Web push, SMS (stubbed), urgency scoring, ML-free insights |
| 3 | Weather + Context | 🗓 | Weather API integration, location-aware reminders, seasonal patterns |
| 4 | Offline-First PWA | 🗓 | Service workers, offline-first sync, installable to home screen |
| 5 | Groceries + Recipes | 🗓 | Inventory tracking, recipe generation, meal planning |
| 6 | Car Maintenance | 🗓 | Maintenance scheduling, odometer tracking, parts inventory |
| 7 | Chores System | 🚧 | Task assignment, progress tracking, streaks, reminders |
| 8 | Community Features | 🗓 | Task sharing, household coordination, multi-user workflows |
| 9 | Medical Records | 🗓 | Appointment scheduling, document uploads, health tracking |
| 10 | Financial Planning | 🗓 | Budget forecasting, spending analysis, savings goals |
| 11 | Voice Interface | 🗓 | Voice commands, natural language queries, speech-to-task |
| 12 | Self-Hosted JARVIS | 🗓 | Local Ollama LLM, on-premises deployment, full offline operation |
| 13 | Mesh Network | 🗓 | Multi-device sync, Raspberry Pi satellite nodes, distributed processing |

---

## Platform: Phase 1 — Bills + Auth + PWA ✅

**Shipped.** Core bills tracking with authentication and PWA infrastructure.

- Multi-residence household management (org → residence → users)
- Bills CRUD with status tracking (pending, paid, overdue)
- Custom JWT authentication with httpOnly cookies
- Recurrence system (monthly, quarterly, biannual, annual)
- PWA setup (manifest, installable to home screen)
- Deploy-ready on Vercel

**Learn more:** See `/docs/CODE_REVIEW_PHASE1.md`

---

## Platform: Phase 2 — Notifications + Heuristics ✅

**Shipped.** Notification system and intelligent suggestions.

- Web Push via VAPID (95%+ delivery on mobile browsers)
- Daily briefing cron job (9 AM UTC via Vercel)
- Seven heuristic endpoints (urgency scoring, amount/due-date prediction, auto-categorization)
- Forget-risk probability (ADHD behavior modeling)
- Budget forecasting and anomaly detection
- SMS notifications stubbed (ready for Phase 3)
- CompositeNotifier pattern for multi-channel delivery

**Learn more:** See `/docs/HEURISTICS.md` and `/docs/homebase-phase-strategy.md`

---

## Platform: Phase 3 — Weather + Context 🗓

**Planned.** Location-aware reminders and seasonal intelligence.

- OpenWeatherMap API integration
- Geofence-based reminder optimization (e.g., "remind before you leave home")
- Seasonal adjustment of bill predictions
- Bad weather escalation (earlier notifications if storms/snow forecasted)
- GPS context sensing (IContextSensor port ready in core)

**Timeline:** Month 5-6 (after Phase 4)

---

## Platform: Phase 4 — Offline-First PWA 🗓

**Planned.** True offline operation with background sync.

- Service worker caching strategy (network-first with fallback)
- Background Sync API for bill updates when offline
- Persistent SQLite-backed storage (via WatermelonDB or PouchDB)
- Offline bill/chore viewing and editing
- Sync conflict resolution (last-write-wins)

**Timeline:** Month 6-7

---

## Platform: Phase 5 — Groceries + Recipes 🗓

**Planned.** Grocery inventory and meal planning (Phase 1.7 prototype exists).

- Grocery inventory tracking (quantity, expiration, location)
- Receipt image upload and OCR parsing
- Recipe generation (Anthropic Claude API)
- Weekly meal planning with shopping list auto-generation
- Integration with bills (weekly grocery cost forecasting)
- Filipino cuisine focus

**Timeline:** Month 7-8

---

## Platform: Phase 6 — Car Maintenance 🗓

**Planned.** Vehicle lifecycle tracking.

- Odometer tracking and maintenance scheduling
- Parts inventory (oil, filters, tires, batteries)
- Service record history
- Maintenance deadline reminders
- Cost tracking per vehicle

**Timeline:** Month 9-10

---

## Platform: Phase 7 — Chores System 🚧

**In progress.** Household task management with gamification.

- Task creation and assignment (to household members)
- Progress tracking (percentage or step-based)
- Streak tracking per person (ADHD dopamine boost)
- Recurring chores with flexible scheduling
- Leaderboard and completion stats
- Snoozable/dismissible notifications
- Feedback system (snooze, reassign, mark complete)

**Timeline:** Month 3-4 (parallel with Phase 2)

**Learn more:** See `/docs/CHORE-plan.md`

---

## Platform: Phase 8 — Community Features 🗓

**Planned.** Multi-user coordination and task sharing.

- Task assignment workflows
- Comments and status updates on shared chores
- Notification per person (not per residence)
- Approval workflows for parent/manager roles
- Task delegation (reassign mid-progress)

**Timeline:** Month 11-12

---

## Platform: Phase 9 — Medical Records 🗓

**Planned.** Health and appointment tracking.

- Doctor appointment scheduling
- Document uploads (prescriptions, test results, insurance cards)
- Medication reminders
- Appointment confirmation reminders
- Family medical history notes

**Timeline:** Phase 13+ (deferred)

---

## Platform: Phase 10 — Financial Planning 🗓

**Planned.** Advanced budgeting and forecasting.

- Monthly/annual budget targets
- Spending alerts when approaching limits
- Savings goal tracking
- Net worth projection
- Category-wise spending analysis

**Timeline:** Phase 13+ (deferred)

---

## Platform: Phase 11 — Voice Interface 🗓

**Planned.** Natural language task creation and queries.

- Voice-to-task transcription (via Anthropic / OpenAI APIs)
- Natural language bill queries ("When's my electric bill due?")
- Voice reminders and briefings
- "The Machine Voice" persona (optional audio responses)

**Timeline:** Phase 13+ (deferred)

---

## Platform: Phase 12 — Self-Hosted JARVIS 🗓

**Planned.** Full self-hosted operation with local LLM.

- Ollama integration (Llama 3.2 or Mistral inference)
- Qdrant vector DB (RAG capabilities)
- Raspberry Pi Hub support (Docker Compose deployment)
- Zero external API dependencies (except SMS)
- Local voice processing (speech-to-text)

**Timeline:** Phase 13+ (deferred)

---

## Platform: Phase 13 — Mesh Network 🗓

**Planned.** Distributed multi-device architecture.

- Satellite nodes (Raspberry Pis in car, kitchen, garage)
- Offline-first sync across mesh
- Local-first decision-making (no cloud needed)
- Data sovereignty (keep data on-premises)
- NR8 (No Required Requests) architecture

**Timeline:** Phase 13+ (deferred)

---

## Mobile App Phases (M-series)

| Phase | Name | Status | Scope |
|-------|------|--------|-------|
| M1 | Core Companion | 🚧 | Native iOS/Android, bills + chores, push notifications, offline viewing |
| M2 | Offline & Caching | 🗓 | SQLite persistence, background sync, conflict resolution |
| M3 | Smart Notifications | 🗓 | Receipt polling, token lifecycle, escalation UI |
| M4 | Platform Features | 🗓 | iOS Critical Alerts, home screen widgets, biometric unlock |
| M5 | Gamification | 🗓 | Streaks, analytics, monthly summaries |

---

## Mobile: Phase M1 — Core Companion 🚧

**In progress.** Functional bill + chore tracker with native push notifications.

- Expo SDK 52 + Expo Router (file-based navigation)
- Authentication via Bearer token (JWT from web API)
- Bill list (searchable, filtered by residence)
- Bill detail + mark-paid action
- Chore list and detail screens
- Push notification registration (Expo Push → APNs/FCM)
- Settings (logout, push toggle)
- Offline bill viewing (React Query cache)

**Tech Stack:**
- Expo (managed workflow, no native toolchain)
- React Native + NativeWind (Tailwind-like styling)
- Expo Router (mirrors Next.js App Router)
- React Query (server state + caching)
- expo-secure-store (encrypted JWT storage)
- expo-notifications (native push)

**Distribution:**
- iOS: TestFlight (internal + external testers)
- Android: APK sideload (no Play Store required)

**Timeline:** 4-6 weeks (parallel with Phase 2)

**Learn more:** See `/docs/react-native-plan.md`

---

## Mobile: Phase M2 — Offline & Caching 🗓

**Planned.** Full offline operation with background sync.

- AsyncStorage persistence (SQLite backend)
- React Query: stale-while-revalidate strategy
- "Offline" banner with retry button
- Mark bill paid offline → syncs on reconnect
- Last-write-wins conflict resolution

**Timeline:** 2 weeks after M1

---

## Mobile: Phase M3 — Smart Notifications 🗓

**Planned.** Receipt polling and escalation workflows.

- Expo receipt polling cron job
- Stale token cleanup (DeviceNotRegistered error handling)
- Escalation UI ("Notification not delivered, try SMS")
- Schedule notifications for convenient times

**Timeline:** 3 weeks after M2

---

## Mobile: Phase M4 — Platform Features 🗓

**Planned.** Native iOS/Android capabilities.

- iOS Critical Alerts (override Do Not Disturb for overdue bills)
- Home screen widgets (next bill + amount)
- Biometric unlock (fingerprint/face)
- Share extension (add bill from receipt photo)

**Timeline:** 3 weeks after M3

---

## Mobile: Phase M5 — Gamification 🗓

**Planned.** Engagement and insights.

- On-time payment streaks (like chores)
- Monthly spend summary + category breakdown
- Savings goals visualization

**Timeline:** 2 weeks after M4

---

## Monorepo Consolidation (Phase M3+)

**Timeline:** After M1 is stable, migrate to Turborepo workspace:

```
homebase/ (root workspace)
├── apps/
│   ├── web/              (Next.js 14)
│   └── mobile/           (Expo)
└── packages/
    ├── shared-types/     (Drizzle exports, API types)
    ├── api-client/       (Typed fetch wrappers)
    └── ui-tokens/        (Design tokens)
```

**See:** `/docs/react-native-plan.md` (Migration Path section)

---

## Critical Path (Next 6 Months)

```
Month 1 (Mar 2026):
  🚧 Phase 2 notifications (active)
  🚧 Phase 7 chores (parallel, branch merged)
  🚧 Mobile M1 scaffolding (starting)

Month 2 (Apr 2026):
  ✅ Phase 2 wrapped + tested
  ✅ Phase 7 chores shipped
  🚧 Mobile M1 core screens
  🗓 Phase 3 weather (planning)

Month 3 (May 2026):
  ✅ Mobile M1 alpha (TestFlight/APK)
  🗓 Phase 4 offline PWA (design)
  🗓 Phase 5 groceries (planning)

Month 4 (Jun 2026):
  🗓 Phase 4 offline (implementation)
  🗓 Phase 5 groceries (implementation)
  🗓 Mobile M2 offline caching

Month 5 (Jul 2026):
  ✅ Phase 4 offline PWA shipped
  ✅ Phase 5 groceries MVP
  🚧 Mobile M2 caching

Month 6 (Aug 2026):
  🗓 Phase 3 weather integration
  🗓 Mobile M3 smart notifications
  💡 Phase 6 car maintenance (optional)
```

---

## Deferred / Explicitly Not Yet Decided

- **SMS escalation** (Phase 2 stubbed, implementation depends on carrier selection)
- **Email reminders** (nice-to-have, not prioritized)
- **Alexa/Google Home integration** (Phase 11+)
- **Third-party bill payment APIs** (GCash/PayMaya integrations deferred; manual payment links only)
- **Photo receipt scanning** (Phase 5+ investigation)
- **Machine learning models** (strict no-external-ML policy; heuristics only until Phase 12)
- **Database sharding** (Phase 13+, after Mesh Network)
- **Multi-org support** (not in scope; single org per account)
- **Mobile app on Play Store/App Store** (Phase M3+ after MVP stable)

---

## Key Constraints & Non-Negotiables

### ADHD-First Design
- No hidden actions; critical buttons (Pay, Mark Paid) are prominent
- Visual urgency via color gradients (overdue red, due tomorrow orange, etc.)
- Pulse animations only on overdue items (no gratuitous motion)
- Minimum 44px touch targets (WCAG 2.5.5)
- High contrast text (never rely on color alone)

### Multi-Tenancy (Zero Tolerance)
- Every query filters by `org_id` (no exceptions)
- Never trust client-provided IDs; extract from verified JWT
- Org A must never see Org B data
- All new tables require `org_id` column

### Technology Choices (Locked In)
- **Frontend:** Next.js 14 (web), Expo (mobile) — no Vue, no Flutter
- **Database:** Neon Postgres (production), SQLite (tests) — no MongoDB, no Firebase
- **Auth:** Custom JWT (no Auth0, no Firebase Auth)
- **Notifications:** VAPID Web Push + Expo Push (no Firebase Cloud Messaging SDKs)
- **Heuristics:** simple-statistics + custom algorithms (no external ML/AI until Phase 12)
- **Deployment:** Vercel (web), EAS Build (mobile) — no custom servers until Phase 12

### Phase Sequencing
- Phase 1 (Bills) must complete before Phase 2 (Notifications) — critical dependency
- Phase 2 must complete before Phase 3+ (context relies on notification infrastructure)
- Mobile M1 can start in parallel with Phase 2 (shares auth backend)
- Phases 9-13 are intentionally deferred (feature-complete by Phase 8)

---

## How to Use This Roadmap

1. **For sprints:** Reference the "Critical Path" section for 2-week planning
2. **For architecture:** Check the relevant phase doc (e.g., `/docs/HEURISTICS.md` for Phase 2)
3. **For PRs:** Link related phase scope in commit messages
4. **For team:** Share this with stakeholders to manage expectations
5. **For updates:** Revisit quarterly; update status + timeline as you learn

---

## Links to Detailed Plans

- **Bills + Auth:** `/docs/CODE_REVIEW_PHASE1.md`
- **Heuristics:** `/docs/HEURISTICS.md`
- **Chores:** `/docs/CHORE-plan.md`
- **Mobile:** `/docs/react-native-plan.md`
- **Notifications:** `/docs/homebase-chores-integration.md`
- **Architecture:** `/docs/architecture.md`
- **Patterns:** `/docs/PATTERNS.md`

---

**Last Updated:** March 1, 2026
**Next Review:** May 1, 2026
