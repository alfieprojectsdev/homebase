# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Chores restart (2026-07-16/17): executed.** Native Kotlin Android app lives at `apps/android/` — three signed releases shipped (v0.1.0–v0.3.0, GitHub Releases sideload). The Expo app in `apps/mobile` is **parked/superseded** (owner rejected it — see its README). Decisions record: `docs/HANDOVER-chores-restart-2026-07-16.md`; execution record: `docs/SESSION_LOG_2026-07-17.md`. **No Firebase anywhere** (owner decision) — background delta sync via WorkManager pull, reminders fire from on-device AlarmManager schedules.

## Project Overview

Homebase is a multi-residence household management system designed for ADHD executive function support. It provides aggressive, context-aware reminders to prevent catastrophic failures like forgotten bills and missed maintenance deadlines.

**Core Philosophy:** "The system catches it, so your brain doesn't have to."

**Current Phase:** Chores (Phase 7) 🚧 nearly done: web CRUD/feedback/history/streaks/leaderboard work end-to-end; chore **reminders fire on-device** in the native Android app (local-first AlarmManager engine), and **PWA web-push reminders + offline chore views shipped 2026-07-18** for the kids' iOS devices (see Notifications section). Production is live at `https://homebase-blond.vercel.app` (baked into APK v0.4.0). Remaining: on-device validation (Android + iOS), Android parity features (streaks/leaderboard/feedback UI), custom HH:MM reminder times UI. Phases 1–2 shipped. Self-hosted JARVIS planned for Phases 12-13.

**Monorepo layout:** Next.js web app at the repo root; **native Kotlin Android app at `apps/android/`** (active); Expo app at `apps/mobile/` (parked, do not build on). All clients share the same API backend — web uses httpOnly cookie auth, mobile sends `Authorization: Bearer <jwt>`.

## Tech Stack

**Web (root):**
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Neon Postgres (production) + SQLite/better-sqlite3 (E2E testing) with Drizzle ORM
- **Auth:** Custom JWT — httpOnly cookies (web) / Bearer token (mobile)
- **Styling:** Tailwind CSS (ADHD-optimized: high contrast, large touch targets)
- **Notifications:** Web Push via VAPID (`web-push` library), SMS deferred
- **Heuristics:** `simple-statistics` + custom algorithms (no external ML)
- **Deployment:** Vercel with daily cron job at 9 AM

**Android (`apps/android/` — active):**
- **Stack:** Kotlin 1.9.23 + Jetpack Compose, AGP 8.3.0, Gradle 8.14.1, compileSdk 34 / minSdk 26, Groovy DSL (modeled on `/home/finch/repos/gearsync/` conventions)
- **Offline cache:** Room (single source of truth for UI + reminders); WorkManager 15-min delta sync via `GET /api/chores?updatedSince=`
- **Reminders:** local-first — `setExactAndAllowWhileIdle` alarms scheduled on-device from Room, zero network at fire time; per-category notification channels; boot receiver reschedules
- **Auth:** Bearer JWT in EncryptedSharedPreferences; bootstrap usernames map to `<username>@homebase.local` (no server changes)
- **Distribution:** local `./gradlew assembleRelease` → GitHub Releases sideload. Keystore at `~/keystores/homebase-release.jks` + gitignored `apps/android/keystore.properties` — **never lose the keystore** (signature change forces uninstall/reinstall on every device)
- **No Firebase/FCM** (owner decision 2026-07-17)

**Expo (`apps/mobile/` — parked, superseded):** kept buildable at SDK 52 for reference only; see its README.

## Development Commands

```bash
# Web — run from repo root
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Production build
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without compilation

# E2E Tests (Playwright — targets http://localhost:3001 by default)
npm run test:e2e         # Run all Playwright tests (headless)
npm run test:e2e:ui      # Open Playwright UI
npm run test:e2e:headed  # Run tests in headed mode
npm run test:e2e:report  # Show HTML test report
npx playwright test e2e/bills.spec.ts  # Run a single spec

# Database — drizzle.config.ts does NOT read .env.local; export first:
#   set -a; source .env.local; set +a
npx drizzle-kit generate       # Generate migration from schema changes (generate:pg is deprecated)
npx drizzle-kit push           # Push schema to Neon (push:pg is deprecated)
npx tsx src/lib/db/seed.ts     # Seed dev data (test@devfamily.com / password123)
npx tsx src/lib/db/seed-pelicano-family.ts  # Seed Pelicano family dataset
npx drizzle-kit studio         # Open Drizzle Studio GUI

# Android — run from apps/android/ (needs ANDROID_HOME=~/Android/Sdk, java 17)
cd apps/android
./gradlew :app:compileDebugKotlin    # Type-check/compile
./gradlew :app:testDebugUnitTest     # JVM unit tests (ReminderLogic, JSON fixtures, auth mapping)
./gradlew assembleDebug              # Debug APK (10MB, unsigned-debug)
./gradlew assembleRelease            # Signed release APK (needs keystore.properties)
# Release: gh release create vX.Y.Z app/build/outputs/apk/release/app-release.apk
# No emulator on this machine (by design) — sideload to a physical device.
```

## Project Structure

```
# Web (root)
src/
├── app/
│   ├── (auth)/              # Login, signup, forgot-password, reset-password
│   ├── (dashboard)/         # Protected routes: bills, chores, settings
│   ├── api/
│   │   ├── auth/            # login, signup, me, logout, reset-request/validate/complete
│   │   ├── bills/           # Bills CRUD + [id]/pay
│   │   ├── chores/          # Chores CRUD + history, leaderboard, feedback
│   │   ├── heuristics/      # 7 ML-free heuristic endpoints (see Heuristics section)
│   │   ├── notifications/   # subscribe (Web Push VAPID)
│   │   └── cron/daily/      # Daily briefing job (runs via Vercel cron at 9 AM)
│   └── layout.tsx / error.tsx
├── core/                    # Hexagonal architecture scaffold (future JARVIS)
│   ├── domain/              # Domain models: Bill, User, NodeProfile
│   ├── ports/               # Interfaces: IPersistence, INotifier, IContextSensor
│   └── application/services/DailyBriefingService.ts
├── infrastructure/          # Adapters implementing core ports
│   └── adapters/
│       ├── neon/            # BillRepository, UserRepository
│       └── notifications/   # ConsoleNotifier
├── lib/
│   ├── auth/                # jwt.ts, password.ts, server.ts, headers.ts
│   ├── chores/              # streaks.ts
│   ├── db/
│   │   ├── schema.ts        # Single source of truth for all data models
│   │   ├── index.ts         # Neon DB client (production)
│   │   └── sqlite.ts        # SQLite client (E2E testing, ./homebase.db)
│   ├── heuristics/          # amount-prediction, anomaly-detection, auto-categorization,
│   │                        # temporal-analysis, urgency-scoring, forget-risk-prediction,
│   │                        # budget-forecasting, seasonal-factors, user-behavior, smart-suggestions
│   ├── notifications/       # service.ts (Web Push), chores.ts, escalation.ts
│   └── utils/
│       └── recurrence.ts    # calculateNextDueDate, getRecurrenceLabel
middleware.ts                # Route protection (bills, chores, auth/me)
drizzle.config.ts            # Drizzle config — requires DATABASE_URL env var
vercel.json                  # Cron schedule: /api/cron/daily at 0 9 * * *

# Android (apps/android/) — package dev.alfieprojects.homebase
apps/android/app/src/main/java/dev/alfieprojects/homebase/
├── MainActivity.kt          # State-based nav: login → chore list → new chore
├── HomebaseApp.kt           # Notification channels + periodic SyncWorker enqueue
├── auth/                    # TokenStore (EncryptedSharedPreferences), AuthRepository (username→email mapping)
├── data/                    # ApiClient (OkHttp+Gson, Bearer), ChoreRepository (Room = source of truth), db/, model/
├── reminders/               # ReminderLogic (pure, JVM-tested), ReminderScheduler (AlarmManager),
│                            # ReminderReceiver (fires + chains), BootReceiver
├── sync/                    # SyncWorker (15-min delta pull)
└── ui/                      # LoginScreen (+signup), ChoreListScreen (+reliability banners), NewChoreScreen

# Expo (apps/mobile/) — PARKED, see its README. Do not build on it.
```

## Database Schema

The schema (`src/lib/db/schema.ts`) is the single source of truth. Hierarchy:

```
organizations (family units / tenants)
  ├── residences (physical locations, e.g. QC House, Magalang Property)
  ├── users (scoped by org, with primary residence + phone + behavior tracking)
  └── financial_obligations (bills — org + residence scoped, recurrence, urgency scoring)
  └── chores (org + residence scoped, progress tracking, reminders, recurrence)
      ├── chore_history (audit log of all chore actions)
      ├── chore_feedback (snooze/dismiss/reassign feedback)
      └── chore_streaks (per-user streak tracking)
  └── push_subscriptions (VAPID Web Push endpoints per user)
  └── notification_logs (all sent notifications with status)
  └── password_reset_tokens (single-use, expiring)
  └── pattern_analytics (aggregated heuristic pattern data)
```

When modifying schema:
1. Edit `src/lib/db/schema.ts`
2. Run `npx drizzle-kit generate:pg` then `npx drizzle-kit push:pg`
3. Update seed script if needed

## CRITICAL SECURITY RULES

**Multi-Tenancy Data Isolation (ZERO TOLERANCE):**

- ❌ **NEVER write a query without filtering by `org_id`** — every SELECT/UPDATE/DELETE on multi-tenant tables
- ❌ **NEVER trust client-provided IDs** — extract `userId` and `orgId` from verified JWT only
- ❌ **NEVER allow cross-org access** — org A must never see org B data
- ❌ **NEVER skip `org_id` in new tables** — all new domain tables must include `org_id`

**Verification checklist for every API route:**
1. JWT verified via middleware or manual check
2. `userId`/`orgId` extracted from verified token (not from request body)
3. All DB queries include `WHERE org_id = orgId`
4. Residence filtering: `WHERE org_id = orgId AND residence_id = ...`
5. Returns 401 for invalid token (not 500 or 200)

**Authentication:**
- Middleware (`middleware.ts`) protects `/bills/*`, `/api/bills/*`, `/chores/*`, `/api/chores/*`, `/api/auth/me`
- Signup creates org → residence → user in a transaction, returns JWT
- Token expiry: 7 days max (see `src/lib/auth/jwt.ts`)
- Password hashing: bcrypt 10 rounds (`src/lib/auth/password.ts`)
- **Dual auth transport:** Web uses httpOnly cookie; mobile sends `Authorization: Bearer <jwt>`. All API routes must handle both (see `src/lib/auth/headers.ts`).

## Heuristics System

Seven ML-free heuristic endpoints under `/api/heuristics/`:

| Endpoint | Library | Purpose |
|---|---|---|
| `amount-suggestion` | simple-statistics | Predict bill amount from history |
| `due-date-suggestion` | temporal analysis | Suggest due date from patterns |
| `categorize` | keyword matching | Auto-categorize bill by name |
| `analyze-bill` | multi-factor | Full bill analysis (all heuristics) |
| `calculate-urgency` | urgency-scoring | Score 0-100 with reasons |
| `forget-risk` | user-behavior | ADHD forget-risk probability |
| `budget-forecast` | budget-forecasting | Monthly expense projections |
| `suggestions` | smart-suggestions | Combined smart suggestions |

All heuristic logic lives in `src/lib/heuristics/`. Uses `simple-statistics` and `date-fns` — no external ML APIs.

## Hexagonal Architecture (JARVIS Scaffold)

`src/core/` and `src/infrastructure/` implement a ports-and-adapters pattern for the eventual JARVIS migration. The cron job at `/api/cron/daily` already uses this pattern:

- **Ports** (`src/core/ports/`): `IPersistence`, `INotifier`, `IContextSensor` — interfaces only
- **Domain** (`src/core/domain/`): Pure domain models and services (`RecurrenceEngine`, `Bill`, `User`)
- **Adapters** (`src/infrastructure/adapters/`): `BillRepository` + `UserRepository` (Neon), `ConsoleNotifier`

When adding new logic to the daily briefing or notification pipelines, implement new adapters here rather than in the API routes.

## Notifications

Web Push is implemented. VAPID keys required in env:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:..."   # optional, defaults to mailto:support@homebase.app
```

Flow: `POST /api/notifications/subscribe` saves endpoint → daily cron sends via `NotificationService.sendWebPush()` → logged to `notification_logs`. SMS is stubbed (deferred).

**Chore reminders (per client, since 2026-07-18):**
- **Android app**: on-device AlarmManager scheduling — never touches the server at fire time.
- **PWA / web-push subscribers**: `/api/cron/chore-reminders` (CRON_SECRET-gated) evaluates eligibility server-side via `src/lib/notifications/chore-reminders.ts` — semantics mirror the Android `ReminderLogic` (frequency legs, active-hours window in `REMINDER_TZ`, default `Asia/Manila`; null frequency → never). Triggered every 15 min by `.github/workflows/chore-reminders.yml` (Vercel Hobby crons are daily-only; needs repo secret `CRON_SECRET` matching the Vercel env var). Recipients: `assignedTo`, else creator.
- **Offline PWA**: `public/sw.js` caches navigations + `GET /api/chores*` network-first (view-only offline; full offline sync is Phase 4). SW registers globally via `src/components/SwRegister.tsx`; the root layout links `manifest.json` + apple-touch-icon (required for iOS home-screen install).

**Production:** `https://homebase-blond.vercel.app` (Vercel project `homebase`, auto-deploys from main). Neon project `plain-hill-24100914` has TWO branches — `.env.local` points at `development`; Vercel uses `production`. **Every schema change needs a second push:** `DATABASE_URL=$(npx neonctl connection-string production --project-id plain-hill-24100914 --org-id org-soft-bonus-62372538 --pooled) npx drizzle-kit push`.

## Recurrence System

Bills support recurrence via `src/lib/utils/recurrence.ts`:
- Frequencies: `monthly`, `quarterly`, `biannual`, `annual`
- `calculateNextDueDate(date, frequency, interval?, dayOfMonth?)` handles month-end edge cases
- `parentBillId` links recurring instances; `recurrenceEnabled`, `recurrenceFrequency`, `recurrenceInterval`, `recurrenceDayOfMonth` columns on `financial_obligations`

## Environment Variables

```bash
DATABASE_URL="postgresql://..."         # Neon connection string (required)
JWT_SECRET="..."                        # openssl rand -base64 32
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."      # Web Push (optional, push disabled without it)
VAPID_PRIVATE_KEY="..."                 # Web Push (optional)
```

## ADHD-Optimized Design Principles

- ❌ **NEVER use touch targets <44px** (WCAG 2.5.5 — minimum 44×44px)
- ❌ **NEVER rely on color alone** — combine with text/icons (WCAG 1.4.1)
- ❌ **NEVER hide critical actions** — Pay Bill, Mark Paid, Add Bill must be prominent
- ❌ **NEVER use animations without purpose** — pulse only for overdue items

**Visual urgency colors for bills:**
- Overdue: Red gradient `#DC2626→#991B1B` + pulse animation
- Due tomorrow: Red/orange `#DC2626→#EA580C`
- Due in 3 days: Orange `#FB923C`
- Due in 7 days: Yellow `#FCD34D`
- Due later: Gray `#F3F4F6`

## E2E Testing

Playwright tests in `e2e/`. Targets `http://localhost:3001` (set `BASE_URL` env var to override). SQLite (`homebase.db`) is used during E2E tests rather than Neon. Test specs cover: auth, bills, chores, blocking, heuristics, notifications, recurrence, security, password reset, Pelicano family scenarios.

Dev seed credentials: `test@devfamily.com` / `password123`

## Adding New Domains

1. **Schema:** Add table to `src/lib/db/schema.ts` with `org_id` (required) and `residence_id` (if location-specific)
2. **Migration:** `npx drizzle-kit generate:pg` + `npx drizzle-kit push:pg`
3. **API Routes:** `src/app/api/[domain]/route.ts`
4. **Dashboard UI:** `src/app/(dashboard)/[domain]/page.tsx`
5. **Middleware:** Add `'/[domain]/:path*'` and `'/api/[domain]/:path*'` to `middleware.ts` matcher
6. **Heuristics (optional):** `src/lib/heuristics/[domain]-*.ts` + endpoint under `/api/heuristics/`

## Using Gemini CLI for Large Analysis

```bash
gemini -p "@src/lib/db/schema.ts @src/app/api/ Are all queries scoped by org_id?"
gemini --all_files -p "Find any multi-tenancy security issues"
gemini -p "@src/core/ @src/infrastructure/ Explain the hexagonal architecture"
```

## Key Implementation Notes

- **Path aliases:** `@/*` → `src/*` (tsconfig.json)
- **Bill status enum:** `pending`, `paid`, `overdue`
- **User roles:** `admin`, `member`, `viewer`
- **Bill categories:** `utility-electric`, `utility-water`, `telecom-internet`, `subscription-entertainment`, `housing-rent`, `insurance`, `major-expense`, `subscription`, `uncategorized`
- **Urgency levels:** `critical`, `high`, `normal` (stored on `financial_obligations`)
- **`src/lib/db/sqlite.ts`** exports `db` pointing at `./homebase.db` — used by E2E test helpers, not by Next.js API routes (which use `src/lib/db/index.ts` → Neon)
- **`CLAUDE.new.md`** in root is a generic unrelated template — ignore it

## Important Files

- `src/lib/db/schema.ts` — data model source of truth
- `middleware.ts` — route protection logic
- `src/core/application/services/DailyBriefingService.ts` — daily notification orchestration
- `docs/architecture.md` — full technical specification (Phases 1-13)
- `docs/PATTERNS.md` — established code patterns
- `docs/HEURISTICS.md` — heuristics system documentation
