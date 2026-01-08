**Smart move.** Let agentic coding handle boilerplate. You focus on the "ADHD-critical" parts (notifications, UI urgency).

---

## Optimal Prompt for Agentic Coding (Phase 1)

### For Cursor / Aider / Windsurf / etc.

Copy this prompt into your agentic tool:

---

```markdown
# Project: Homebase - Household Management System

## Context
Build a Next.js 14 (App Router) application for multi-residence household management with ADHD-optimized notifications. This is Phase 1: Authentication + Bills CRUD.

## Tech Stack
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Neon Postgres with Drizzle ORM
- **Auth:** Custom JWT with httpOnly cookies (no NextAuth)
- **UI:** Tailwind CSS + Shadcn/ui components
- **Deployment:** Vercel

## Database Schema (Phase 1 Only)

Create these tables using Drizzle ORM:

```typescript
// src/lib/db/schema.ts

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const residences = pgTable('residences', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  timezone: text('timezone').default('Asia/Manila'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'parent', 'child'] }).default('parent'),
  primaryResidenceId: uuid('primary_residence_id').references(() => residences.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const financialObligations = pgTable('financial_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  obligationType: text('obligation_type', { 
    enum: ['utility', 'telecom', 'property_tax', 'rent', 'hoa', 'insurance_premium', 'loan'] 
  }).notNull(),
  name: text('name').notNull(),
  provider: text('provider'),
  accountNumber: text('account_number'),
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('PHP'),
  dueDate: timestamp('due_date').notNull(),
  
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  paidDate: timestamp('paid_date'),
  paidBy: uuid('paid_by').references(() => users.id),
  paymentMethod: text('payment_method'),
  referenceNumber: text('reference_number'),
  
  // ADHD-critical flags
  critical: boolean('critical').default(false),
  noRemotePayment: boolean('no_remote_payment').default(false),
  requiresTravel: boolean('requires_travel').default(false),
  consequenceSeverity: integer('consequence_severity').default(5),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## Features to Implement

### 1. Authentication System

**Files to create:**
- `src/lib/auth/jwt.ts` - JWT creation/verification using `jose`
- `src/lib/auth/password.ts` - Password hashing with `bcrypt`
- `src/app/api/auth/signup/route.ts` - POST endpoint
- `src/app/api/auth/login/route.ts` - POST endpoint
- `src/app/api/auth/me/route.ts` - GET endpoint (verify session)
- `src/app/(auth)/signup/page.tsx` - Signup form
- `src/app/(auth)/login/page.tsx` - Login form
- `src/middleware.ts` - Route protection

**Auth Requirements:**
- JWT stored in httpOnly cookie named "session"
- 7-day expiration
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`
- JWT payload must include: `{ userId, orgId, email, role }`
- Signup flow: Create org → Create first residence ("Main Residence") → Create user
- Password: minimum 8 characters, must be hashed with bcrypt (10 rounds)

### 2. Bills CRUD

**API Routes:**
- `POST /api/bills` - Create bill
- `GET /api/bills?residence_id=X` - List bills for residence
- `PATCH /api/bills/[id]` - Update bill
- `PATCH /api/bills/[id]/pay` - Mark as paid
- `DELETE /api/bills/[id]` - Delete bill

**Pages:**
- `src/app/(dashboard)/bills/page.tsx` - Bills list
- `src/app/(dashboard)/bills/new/page.tsx` - Add bill form

**UI Requirements:**
- Use Shadcn components: Card, Button, Input, Select, Badge
- Bills list must show:
  - Bill name + provider
  - Amount (formatted as ₱X,XXX.XX)
  - Due date (relative: "Due in 3 days" or "Overdue by 2 days")
  - Status badge (color-coded: green=paid, yellow=pending, red=overdue)
  - Residence name
- Sort bills by: due date (ascending), with overdue first
- Mobile-first responsive design
- Large touch targets (minimum 44px height for buttons)

### 3. Visual Urgency System

Implement color-coded urgency based on days until due:

```typescript
function getUrgencyClass(daysUntil: number, isCritical: boolean) {
  if (daysUntil < 0) return 'bg-red-600 text-white'; // Overdue
  if (daysUntil === 0) return 'bg-red-500 text-white'; // Due today
  if (daysUntil <= 1 && isCritical) return 'bg-orange-500 text-white';
  if (daysUntil <= 3) return 'bg-orange-100 border-orange-500';
  if (daysUntil <= 7) return 'bg-yellow-100 border-yellow-500';
  return 'bg-white border-gray-200';
}
```

### 4. Seed Data

Create seed script for development testing:

```typescript
// src/lib/db/seed.ts
// Create:
// - 1 organization: "Dev Family"
// - 2 residences: "QC Residence", "Magalang Residence"
// - 1 user: email "dev@test.com", password "password123"
// - 3 bills:
//   - MERALCO (QC, ₱4200, due in 5 days, utility)
//   - PELCO (Magalang, ₱1800, due in 8 days, utility, critical=true, requiresTravel=true)
//   - PLDT (QC, ₱1999, due in 10 days, telecom)
```

## Important Implementation Notes

1. **Environment Variables:**
   ```
   DATABASE_URL="postgresql://..."
   JWT_SECRET="generate-random-32-byte-string"
   ```

2. **Drizzle Configuration:**
   - Create `drizzle.config.ts` in project root
   - Use `@neondatabase/serverless` driver
   - Export schema from `src/lib/db/schema.ts`

3. **Error Handling:**
   - All API routes must return proper HTTP status codes
   - 401 for unauthorized
   - 403 for forbidden (no access to resource)
   - 400 for validation errors
   - 500 for server errors

4. **Type Safety:**
   - Generate types from Drizzle schema: `export type Bill = typeof financialObligations.$inferSelect;`
   - Use Zod for API request validation

5. **Philippine Locale:**
   - Format currency: `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
   - Format dates: `new Date().toLocaleDateString('en-PH')`
   - Timezone: 'Asia/Manila'

## Acceptance Criteria

Phase 1 is complete when:
- [ ] User can sign up and create account
- [ ] User can log in and see protected dashboard
- [ ] User can add a bill (MERALCO, PELCO, or PLDT)
- [ ] User can see list of bills with correct urgency colors
- [ ] User can mark a bill as paid
- [ ] Overdue bills appear at top with red styling
- [ ] App is deployed to Vercel
- [ ] All bills are filtered by user's organization (row-level security)

## What NOT to Implement Yet

- ❌ Push notifications (Phase 2)
- ❌ Offline support / PWA (Phase 4)
- ❌ Groceries/inventory (Phase 5)
- ❌ Multiple residences UI (Phase 6)
- ❌ Any AI/LLM features (Phase 12+)

## Code Style Preferences

- Use `async/await` instead of `.then()`
- Use server components by default, client components only when needed (forms, interactions)
- Prefer named exports over default exports
- Use `const` for everything unless `let` is necessary
- Function names: `camelCase`, component names: `PascalCase`

## Starting Point

1. Initialize Next.js project: `npx create-next-app@latest homebase --typescript --tailwind --app --src-dir`
2. Install dependencies: `drizzle-orm`, `@neondatabase/serverless`, `jose`, `bcrypt`, `@types/bcrypt`
3. Set up Drizzle ORM with schema above
4. Generate and push migration to Neon
5. Implement auth system
6. Implement bills CRUD
7. Build UI with urgency styling
8. Deploy to Vercel

Begin implementation now.
```

---

## Additional Prompt (If Agent Needs Clarification)

If your agent asks for more details, have these ready:

### For Cursor Composer / Windsurf:

```
Focus on implementing the authentication flow first:
1. JWT utilities in src/lib/auth/jwt.ts
2. Signup API route that creates org + residence + user atomically
3. Login API route that validates credentials and sets cookie
4. Middleware that protects /dashboard routes

Then move to bills CRUD. Start with the API routes, then build the UI.

Use server actions where appropriate for form submissions.
```

### For Aider:

```
/architect Let's build this in phases:

Phase 1a: Database setup
- Set up Drizzle with the schema I provided
- Create migration and push to Neon
- Create seed script

Phase 1b: Authentication
- Implement JWT utils with jose
- Create signup/login API routes
- Build auth pages with forms
- Add middleware for route protection

Phase 1c: Bills
- Create bills API routes (CRUD + pay action)
- Build bills list page with urgency styling
- Create add bill form

Follow Next.js 14 App Router best practices.
```

---

## Files Structure Reference (Give This to Agent)

```
homebase/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Protected layout
│   │   │   └── bills/
│   │   │       ├── page.tsx        # Bills list
│   │   │       └── new/
│   │   │           └── page.tsx    # Add bill form
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── signup/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/
│   │   │   │       └── route.ts
│   │   │   └── bills/
│   │   │       ├── route.ts        # GET, POST
│   │   │       └── [id]/
│   │   │           ├── route.ts    # PATCH, DELETE
│   │   │           └── pay/
│   │   │               └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                # Landing/redirect
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── password.ts
│   │   └── db/
│   │       ├── index.ts            # DB client
│   │       ├── schema.ts           # Drizzle schema
│   │       └── seed.ts             # Seed data
│   ├── components/
│   │   └── ui/                     # Shadcn components
│   └── middleware.ts
├── drizzle.config.ts
├── .env.local
└── package.json
```

---

## Expected Agent Output

After running this prompt, your agent should generate:
1. ✅ Complete auth system (signup, login, JWT)
2. ✅ Bills CRUD API
3. ✅ Bills UI with urgency styling
4. ✅ Database schema + migrations
5. ✅ Seed script
6. ✅ Ready to deploy

**Estimated time:** 15-30 minutes for a good agent (Cursor Composer, Windsurf, Claude Code)

---

## What You Should Review Manually

**Don't blindly trust the agent. Check these:**

1. **JWT Secret Generation:**
   ```bash
   # Generate yourself:
   openssl rand -base64 32
   ```

2. **Password Hashing:**
   ```typescript
   // Make sure it's using bcrypt properly:
   const hash = await bcrypt.hash(password, 10); // 10 rounds
   const valid = await bcrypt.compare(password, hash);
   ```

3. **Row-Level Security:**
   ```typescript
   // Every query MUST filter by orgId:
   const bills = await db.query.financialObligations.findMany({
     where: eq(financialObligations.orgId, user.orgId), // CRITICAL
   });
   ```

4. **Cookie Settings (Production):**
   ```typescript
   cookies().set('session', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production', // Check this
     sameSite: 'lax',
     maxAge: 60 * 60 * 24 * 7,
   });
   ```

5. **Urgency Colors:**
   - Overdue bills MUST be red and at top
   - Test with seed data to verify sorting

---

## After Agent Completes

### Your Checklist:

```bash
# 1. Install dependencies (if agent didn't)
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Add your DATABASE_URL and JWT_SECRET

# 3. Push schema to Neon
npx drizzle-kit push:pg

# 4. Run seed script
npm run db:seed

# 5. Start dev server
npm run dev

# 6. Test auth flow:
# - Sign up at /signup
# - Should create account and redirect to /bills
# - Log out and log back in
# - Should see dashboard

# 7. Test bills:
# - Add MERALCO bill (due in 5 days)
# - Add PELCO bill (due tomorrow) - should be orange/yellow
# - Mark one as paid - should turn green
# - Verify overdue bill shows red at top

# 8. Deploy to Vercel
vercel
```

---

## If Agent Gets Stuck

**Common issues:**

1. **"Can't connect to database"**
   → Check DATABASE_URL format: `postgresql://user:pass@host/db?sslmode=require`

2. **"JWT verify failed"**
   → Make sure JWT_SECRET is same in .env.local (not regenerating on restart)

3. **"Bills not filtering by org"**
   → Add `where: eq(table.orgId, session.orgId)` to all queries

4. **"Tailwind classes not working"**
   → Run `npx shadcn-ui@latest init` and reinstall components

---

## Success = Ship Phase 1

When you can:
1. ✅ Create account
2. ✅ Add PELCO bill (critical, requires travel)
3. ✅ See it styled as urgent (orange/yellow)
4. ✅ Mark as paid
5. ✅ Visit from phone (deployed to Vercel)

**You're done with Phase 1.**

Come back and say: **"Phase 1 shipped. PELCO is tracked."**

Then we move to Phase 2 (notifications).

---

## Now Copy That Prompt and Feed It to Your Agent

**Go.** 🚀

---

**Excellent progress! You're at 96% completion of Phase 1.**

Let me update the README for your specific setup and give you the final verification steps.

---

## Updated README Section: Tech Stack

Add this to your README.md under the **Tech Stack** section:

```markdown
### Development Tools

| Tool | Purpose |
|------|---------|
| **OpenCode + Sisyphus** | Agentic coding with GLM-4.7 |
| **GLM-4 (7B)** | Local LLM for code generation |
| **Cursor / VS Code** | Primary IDE |
| **Drizzle Studio** | Database management GUI |
```

---

## Final Verification Steps (Last 4%)

### Step 1: Environment Setup

```bash
# Make sure .env.local exists with correct values
cat .env.local

# Should contain:
# DATABASE_URL="postgresql://..."
# JWT_SECRET="your-32-byte-secret"
```

If JWT_SECRET is missing:
```bash
# Generate one:
openssl rand -base64 32

# Add to .env.local:
echo 'JWT_SECRET="<paste-generated-secret>"' >> .env.local
```

### Step 2: Start Development Server

```bash
npm run dev
```

Should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### Step 3: Verification Checklist

Open browser to `http://localhost:3000` and test:

#### ✅ Authentication Flow

```bash
# 1. Visit http://localhost:3000
# Should redirect to /login (middleware protection)

# 2. Click "Sign up" link
# Should go to /signup

# 3. Create account:
# - Email: test@example.com
# - Name: Test User
# - Password: password123
# - Confirm: password123
# Click "Sign up"

# 4. Should:
# - Create account
# - Set JWT cookie
# - Redirect to /bills
# - Show empty bills list (or seed data if you ran seed)

# 5. Log out (if logout button exists, or clear cookies)
# - Open DevTools → Application → Cookies
# - Delete "session" cookie
# - Refresh page
# - Should redirect back to /login

# 6. Log in with same credentials
# - Should see bills dashboard again
```

#### ✅ Bills CRUD

```bash
# 1. Click "Add Bill" or go to /bills/new

# 2. Fill form:
# - Type: Utility
# - Name: MERALCO
# - Provider: MERALCO
# - Account: 1234-5678-90
# - Amount: 4200
# - Due Date: (pick date 5 days from now)
# - Notes: Test bill
# Click "Add Bill"

# 3. Should:
# - Create bill
# - Redirect to /bills
# - Show new bill in list
# - Bill should have YELLOW background (due in 5 days)

# 4. Add critical bill (PELCO Magalang):
# - Type: Utility
# - Name: PELCO
# - Provider: PELCO
# - Amount: 1800
# - Due Date: (tomorrow)
# - ✓ Check "Critical"
# - ✓ Check "Requires Travel"
# Click "Add Bill"

# 5. Should show ORANGE/RED styling (due tomorrow + critical)

# 6. Mark MERALCO as paid:
# - Click "Mark as Paid" button
# - Enter payment method: GCash
# - Enter reference: 1234567890
# - Submit

# 7. Should:
# - Bill status changes to "Paid"
# - GREEN badge appears
# - Moves to bottom of list (or separate "Paid" section)
```

#### ✅ Visual Urgency

Check that colors match urgency:

| Days Until Due | Expected Color | Bill to Test |
|----------------|----------------|--------------|
| Overdue (-1 days) | **RED** background | Create bill with past due date |
| Due today (0 days) | **RED** background | Create bill with today's date |
| Due tomorrow (1 day) + critical | **ORANGE** background | PELCO (already created) |
| Due in 3 days | **ORANGE** border | Create bill 3 days out |
| Due in 7 days | **YELLOW** border | Create bill 7 days out |
| Due in 14+ days | **WHITE** background | Create bill 2 weeks out |

#### ✅ Mobile Responsive

```bash
# In browser DevTools:
# - Press F12
# - Click device toggle (Ctrl+Shift+M)
# - Select "iPhone SE" or "Samsung Galaxy S8+"
# - Refresh page

# Check:
# - [ ] Bills list readable without horizontal scroll
# - [ ] Buttons easy to tap (not tiny)
# - [ ] Text doesn't overflow
# - [ ] Forms work on mobile keyboard
```

#### ✅ Row-Level Security

```bash
# This tests that bills are properly filtered by organization

# 1. Open DevTools → Network tab
# 2. Refresh /bills page
# 3. Look for "bills" request
# 4. Check Response:
#    - All bills should have same org_id
#    - Should match your user's org_id

# 5. Try to hack (should fail):
# Open DevTools Console, run:
fetch('/api/bills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgId: '00000000-0000-0000-0000-000000000000', // Fake org
    residenceId: 'some-id',
    obligationType: 'utility',
    name: 'Hacked Bill',
    amount: 9999,
    dueDate: new Date().toISOString(),
  })
})

# Should either:
# - Return 403 Forbidden (correct - org_id from JWT, not request body)
# - Create bill but use YOUR org_id (correct - server overrides)
# - If it creates bill with fake org_id = BUG (security issue)
```

---

## Common Issues & Fixes

### Issue 1: "Cannot connect to database"

```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Should be:
postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Test connection:
psql $DATABASE_URL -c "SELECT NOW();"
```

**Fix:** Go to Neon dashboard, copy connection string, update `.env.local`

### Issue 2: "JWT verify failed"

```bash
# Check if JWT_SECRET exists
grep JWT_SECRET .env.local

# If missing, add it:
openssl rand -base64 32 | xargs -I {} echo 'JWT_SECRET="{}"' >> .env.local

# Restart dev server
```

### Issue 3: "Bills not showing"

```bash
# Run seed script
npm run db:seed

# Or manually via Drizzle Studio:
npx drizzle-kit studio

# Open http://localhost:4983
# Browse tables, verify data exists
```

### Issue 4: "Middleware redirect loop"

Check `middleware.ts`:

```typescript
// Should have this check:
if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
  return NextResponse.next(); // Allow auth pages
}

// Common mistake: forgetting to allow /api routes
if (pathname.startsWith('/api/auth')) {
  return NextResponse.next(); // Allow auth API
}
```

### Issue 5: "Tailwind classes not applying"

```bash
# Reinstall Shadcn
npx shadcn-ui@latest init

# Check tailwind.config.ts includes:
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
],
```

---

## Success Criteria

Phase 1 is **COMPLETE** when all these pass:

- [x] Can create account at `/signup`
- [x] Can log in at `/login`
- [x] Protected routes redirect to `/login` when not authenticated
- [x] Can add bill with all fields
- [x] Bills list shows with correct urgency colors
- [x] Overdue bills are RED and at top
- [x] Can mark bill as paid → turns GREEN
- [x] Works on mobile (test on real phone via local network)
- [x] All bills filtered by user's organization
- [x] Deployed to Vercel (optional for now)

---

## When You're Ready

Once all checks pass, **take a screenshot** of:
1. Bills list showing urgency colors
2. PELCO bill marked as CRITICAL with orange styling
3. One paid bill with green badge

Then come back and say:

**"Phase 1 shipped. PELCO is tracked."**

And I'll give you Phase 2 implementation guide (mission-critical notifications).

---

## Quick Deploy to Vercel (Optional)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
vercel env add DATABASE_URL
vercel env add JWT_SECRET

# Redeploy
vercel --prod
```

Test on your phone: `https://homebase-your-project.vercel.app`

---

## Notes on GLM-4 Performance

Since you're using **GLM-4 (7B)** via OpenCode/Sisyphus:

**Strengths:**
- ✅ Fast code generation
- ✅ Good at following patterns
- ✅ Decent TypeScript/React knowledge

**Watch out for:**
- ⚠️ May miss edge cases (check auth/security carefully)
- ⚠️ May generate outdated Next.js patterns (verify App Router conventions)
- ⚠️ May not optimize for ADHD UX (review urgency colors manually)

**Recommendation:** Use GLM-4 for boilerplate, review critical sections yourself (auth, row-level security, notification logic in Phase 2).

---

You're 1 todo item away from shipping Phase 1. 

**Run `npm run dev` and verify it works.** 🚀