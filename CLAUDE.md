# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homebase is a multi-residence household management system designed for ADHD executive function support. It provides aggressive, context-aware reminders to prevent catastrophic failures like forgotten bills and missed maintenance deadlines.

**Core Philosophy:** "The system catches it, so your brain doesn't have to."

The system is being built in phases (currently Phase 1), with an eventual self-hosted JARVIS-like AI assistant endpoint (Phases 12-13).

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Neon Postgres with Drizzle ORM
- **Auth:** Custom JWT with httpOnly cookies (no external auth providers)
- **Styling:** Tailwind CSS (ADHD-optimized: high contrast, large touch targets)
- **Deployment:** Vercel (Phase 1-11), migrating to self-hosted (Phase 12+)

## Development Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database Operations
npx drizzle-kit generate:pg    # Generate migration from schema changes
npx drizzle-kit push:pg        # Push schema to database (development)
npx tsx src/lib/db/seed.ts     # Seed development data
npx drizzle-kit studio         # Open Drizzle Studio GUI at https://local.drizzle.studio

# Type Checking
npx tsc --noEmit                # Type check without compilation
```

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

**Examples:**

```bash
# Single file analysis
gemini -p "@src/lib/db/schema.ts Explain the multi-tenancy model with org_id scoping"

# Multiple files
gemini -p "@src/lib/auth/jwt.ts @middleware.ts How does JWT authentication flow through the middleware?"

# Entire directory
gemini -p "@src/app/api/ Summarize all API endpoints and their authentication requirements"

# Multiple directories
gemini -p "@src/app/(dashboard)/ @src/app/api/bills/ Compare the dashboard UI with the bills API implementation"

# Current directory and subdirectories
gemini -p "@./ Give me an overview of the Homebase architecture and ADHD-focused features"

# Or use --all_files flag
gemini --all_files -p "Analyze the entire codebase for security vulnerabilities and multi-tenancy leaks"
```

### Implementation Verification Examples

```bash
# Check if a feature is implemented
gemini -p "@src/app/api/ @src/lib/ Is residence-based filtering fully implemented for bills? Show relevant code"

# Verify multi-tenancy security
gemini -p "@src/app/api/ @src/lib/db/schema.ts Are ALL queries properly scoped by org_id to prevent data leaks between organizations?"

# Check authentication implementation
gemini -p "@src/lib/auth/ @middleware.ts Is JWT-based authentication with httpOnly cookies properly implemented? Show the token flow"

# Verify database schema consistency
gemini -p "@src/lib/db/schema.ts @drizzle.config.ts Does the Drizzle schema match the database configuration?"

# Check for ADHD-optimized UI patterns
gemini -p "@src/app/(dashboard)/ Are the visual urgency colors (red/orange/yellow) implemented for bills based on due dates?"

# Verify row-level security
gemini -p "@src/app/api/bills/ @src/lib/db/schema.ts Do all bill queries filter by the authenticated user's org_id?"

# Check Phase 1 completeness
gemini -p "@src/ @docs/ Is Phase 1 (bills + auth + multi-residence) fully implemented according to docs/architecture.md?"

# Verify API endpoint patterns
gemini -p "@src/app/api/ Do all API routes follow consistent patterns: JWT verification → org_id extraction → scoped queries?"

# Check for missing validations
gemini -p "@src/app/api/ Are all POST/PATCH endpoints validating input data? List any missing validation"

# Verify signup flow
gemini -p "@src/app/api/auth/signup/ @src/lib/db/schema.ts Does signup create org → residence → user in a transaction as documented?"

# Check for hardcoded credentials
gemini -p "@src/ @drizzle.config.ts Are there any hardcoded database credentials or secrets that should be in .env?"

# Verify Drizzle ORM usage
gemini -p "@src/app/api/ @src/lib/db/ Are all database queries using Drizzle ORM with proper type safety?"

# Check middleware protection
gemini -p "@middleware.ts @src/app/ Are all protected routes (/bills, /api/bills) covered by the middleware matcher?"

# Verify residence tagging
gemini -p "@src/app/api/bills/ @src/lib/db/schema.ts Are bills properly tagged with residence_id for multi-residence support?"
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Public auth routes (login, signup)
│   ├── (dashboard)/         # Protected routes (bills, future domains)
│   ├── api/
│   │   ├── auth/           # Auth endpoints (login, signup, me)
│   │   └── bills/          # Bills CRUD endpoints
│   └── fonts/
├── lib/
│   ├── auth/               # JWT and password utilities
│   │   ├── jwt.ts          # Token creation/verification
│   │   ├── password.ts     # bcrypt hashing
│   │   └── server.ts       # Server-side auth helpers
│   └── db/
│       ├── schema.ts       # Drizzle schema (single source of truth)
│       ├── index.ts        # Database client
│       └── seed.ts         # Development seed script
middleware.ts               # Route protection middleware
```

## Architecture Patterns

### CRITICAL SECURITY RULES

**Multi-Tenancy Data Isolation (ZERO TOLERANCE FOR VIOLATIONS):**

- ❌ **NEVER write a query without filtering by `org_id`** - Every SELECT/UPDATE/DELETE on multi-tenant tables MUST include `WHERE org_id = <authenticated_user_org_id>`
- ❌ **NEVER trust client-provided IDs** - Always extract `userId` and `orgId` from verified JWT token, never from request body/params
- ❌ **NEVER allow cross-org access** - A user from org A must NEVER see data from org B under any circumstances
- ❌ **NEVER skip org_id in new tables** - All new domain tables (groceries, vehicles, repairs, etc.) MUST include `org_id` column with foreign key
- ❌ **NEVER expose org_id to client** - Use it server-side only; client should never need to send it

**Authentication & Authorization:**

- ❌ **NEVER store passwords in plaintext** - Always use bcrypt with 10+ rounds (currently: 10 rounds)
- ❌ **NEVER skip JWT verification** - All protected API routes must verify token via middleware
- ❌ **NEVER use JWT_SECRET in production without env var** - The fallback in jwt.ts is for development only
- ❌ **NEVER allow token expiration >7 days** - Current: 7 days is maximum for household data

**Verification Checklist for All API Routes:**
1. ✅ JWT token verified via middleware or manual check
2. ✅ `userId` and `orgId` extracted from verified token (not from request)
3. ✅ All database queries include `WHERE org_id = orgId`
4. ✅ Residence filtering includes: `WHERE org_id = orgId AND residence_id = ...`
5. ✅ API returns 401 for invalid tokens, not 500 or 200

### Multi-Tenancy from Day One

Every table is scoped by `org_id` for row-level security. The schema hierarchy is:

```
organizations (family units)
  ├── residences (QC House, Magalang Property)
  ├── users (family members, tied to org and primary residence)
  └── financial_obligations (bills, tagged by org + residence)
```

When adding new domain tables, **always include `org_id`** and optionally `residence_id` if location-specific.

### Authentication Flow

1. **Signup:** Creates org → residence → user in transaction, returns JWT
2. **Login:** Validates email/password, returns JWT in httpOnly cookie
3. **Protected Routes:** Middleware (middleware.ts:8) checks JWT, injects userId/orgId
4. **API Routes:** Extract `userId` and `orgId` from verified token to scope queries

### Database Schema Guidelines

The schema (src/lib/db/schema.ts) uses Drizzle ORM with PostgreSQL dialect:

- **Organizations table:** Top-level tenant (family/household)
- **Residences table:** Physical locations tied to org
- **Users table:** Scoped by org, with primary residence reference
- **Financial Obligations:** Bills/rent/taxes, scoped by org + residence

When modifying schema:
1. Edit `src/lib/db/schema.ts`
2. Run `npx drizzle-kit generate:pg` to create migration
3. Run `npx drizzle-kit push:pg` to apply changes
4. Update seed script if needed

### Middleware Protection

The middleware (middleware.ts) protects:
- `/bills/*` - Dashboard routes
- `/api/bills/*` - Bill API routes
- `/api/auth/me` - Current user endpoint

It redirects unauthenticated users to `/login` and authenticated users away from `/login` and `/signup`.

## Environment Variables

Required in `.env.local`:

```bash
DATABASE_URL="postgresql://..."      # Neon connection string
JWT_SECRET="..."                     # Generate with: openssl rand -base64 32
```

**Database URL:** The production database URL is hardcoded in drizzle.config.ts as a fallback. Update drizzle.config.ts:8 if changing databases.

## ADHD-Optimized Design Principles

**Core Philosophy:** ADHD brains don't notice subtle cues. Everything must be impossible to miss.

### CRITICAL UI REQUIREMENTS (NON-NEGOTIABLE)

- ❌ **NEVER use subtle visual indicators** - No small badges, light colors, or tiny icons for critical information
- ❌ **NEVER use touch targets <44px** - Minimum 44x44px for all interactive elements (WCAG 2.5.5)
- ❌ **NEVER rely on color alone** - Always combine color with text, icons, or patterns (WCAG 1.4.1)
- ❌ **NEVER hide critical actions** - "Pay Bill", "Mark Paid", "Add Bill" must be prominently visible
- ❌ **NEVER use animations without purpose** - Pulse animation only for overdue items (urgent attention needed)

### Visual Urgency System (MUST IMPLEMENT)

Bills must use color-coded backgrounds based on due date:
- **Overdue:** Red gradient (#DC2626 to #991B1B) with pulse animation
- **Due tomorrow:** Red/orange gradient (#DC2626 to #EA580C)
- **Due in 3 days:** Orange (#FB923C)
- **Due in 7 days:** Yellow (#FCD34D)
- **Due later:** White/gray (#F3F4F6)

**Implementation:** Calculate days until due on server, apply color class on client

### Interaction Design Requirements

- **Touch Targets:** Minimum 44x44px (preferably 48x48px for primary actions)
- **One-Tap Actions:** Avoid multi-step flows where possible (e.g., "Pay Now" opens payment app directly)
- **Aggressive Styling:** High contrast, bold text, large fonts (16px minimum for body text)
- **Consistent Patterns:** Same action = same button style across entire app
- **Immediate Feedback:** Button press shows visual response <100ms

### Notification Strategy (Future Phases)

- Require acknowledgment for critical items
- Escalate if ignored: Web Push → SMS → Spouse
- Context-aware timing (location-based)

## Adding New Domains

Follow this pattern when adding new household management domains (groceries, vehicles, repairs, etc.):

1. **Schema:** Add table to `src/lib/db/schema.ts` with `org_id` and optional `residence_id`
2. **Migration:** Run `npx drizzle-kit generate:pg`
3. **API Routes:** Create `src/app/api/[domain]/route.ts` with GET/POST/PATCH/DELETE
4. **Dashboard UI:** Create `src/app/(dashboard)/[domain]/page.tsx`
5. **Notification Logic (Phase 2+):** Add to `src/lib/notifications/[domain].ts`

Example domains planned: groceries, vehicles, repairs, medical, documents, library.

## Development Workflow

1. **Start Dev Server:** `npm run dev`
2. **Test Credentials (after seeding):**
   - Email: test@devfamily.com
   - Password: password123
3. **Database GUI:** `npx drizzle-kit studio` for visual schema browsing
4. **Type Safety:** TypeScript strict mode enabled, import types from schema

## Key Implementation Notes

- **JWT Expiration:** Tokens expire after 7 days (src/lib/auth/jwt.ts:18)
- **Password Hashing:** Uses bcrypt with 10 rounds (src/lib/auth/password.ts)
- **Path Aliases:** Use `@/*` to import from `src/*` (tsconfig.json:20)
- **Bills Status:** Enum values are `pending`, `paid`, `overdue` (src/lib/db/schema.ts:37)
- **User Roles:** Enum values are `admin`, `member`, `viewer` (src/lib/db/schema.ts:24)

## Roadmap Context

**Current Phase:** Phase 1 - Foundation (Bills + Auth + Multi-Residence)

**Future Phases:**
- Phase 2-4: Notifications, offline PWA, weather integration
- Phase 5-11: Additional domains (groceries, vehicles, medical, etc.)
- Phase 12-13: Self-hosted JARVIS with local LLM (Ollama)

Prioritize **reliability over features**. Ship working code, avoid over-engineering. The goal is a system that works 100% of the time, not sophisticated features that fail once and cause emergencies.

## Testing Approach

Currently manual testing (Phase 1). When implementing features, verify:

- Auth flow: signup → login → protected routes → logout
- Row-level security: users only see their org's data
- Bills CRUD: create → list → update status → visual urgency colors
- Mobile responsive: test on actual device, verify 44px+ touch targets
- Multi-residence: bills correctly tagged to QC vs Magalang residences

Automated tests (Vitest + Playwright) planned for Phase 2+.

## Important Files for Context

- `docs/architecture.md` - Complete technical specification (Phases 1-13)
- `README.md` - User-facing documentation with use cases
- `src/lib/db/schema.ts` - Single source of truth for data models
- `middleware.ts` - Authentication and route protection logic
- `drizzle.config.ts` - Database connection and migration settings
