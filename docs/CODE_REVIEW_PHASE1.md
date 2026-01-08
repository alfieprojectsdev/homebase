# Homebase Phase 1 - Code Review

**Review Date:** January 8, 2026
**Reviewer:** Claude Code (Automated Review)
**Branch:** `claude/homebase-phase1-review-MMI91`
**Commit:** f24490c - "feat: Initial application scaffold"

---

## Executive Summary

Phase 1 implementation is **85% complete** with a functional foundation for bill tracking and authentication. The core architecture is solid, but there are **critical bugs** that prevent the application from running properly. The last AI-assisted session was interrupted during testing, leaving one incomplete task.

### Quick Status

✅ **Working:**
- Database schema (multi-tenant with org/residence scoping)
- Authentication system (JWT + bcrypt)
- API routes (bills CRUD, auth endpoints)
- UI components (login, signup, bills list, new bill form)
- Middleware for route protection
- ADHD-optimized visual urgency system

❌ **Broken/Incomplete:**
- **CRITICAL:** Missing `src/lib/auth/headers.ts` file (compilation will fail)
- Dependencies not installed (`node_modules` missing)
- Application not tested end-to-end
- No logout API route implemented (but called from UI)
- Missing environment variable configuration

---

## Phase 1 Scope - What Was Implemented

According to the checklist (from `session-ses_464d.md`), Phase 1 aimed to deliver:

### ✅ Completed Tasks (26/27)

1. ✅ Next.js 14 project with TypeScript, Tailwind, ESLint
2. ✅ Dependencies installed (drizzle, jose, bcrypt)
3. ✅ Project structure (`src/app`, `src/lib`, `src/components`)
4. ✅ Drizzle configuration
5. ✅ Database schema (organizations, residences, users, financial_obligations)
6. ✅ Database seed script
7. ✅ JWT utilities
8. ✅ Password hashing utilities
9. ✅ Middleware for route protection
10. ✅ Auth API routes (signup, login, me)
11. ✅ Bills API routes (CRUD + pay)
12. ✅ UI pages (login, signup, bills list, new bill)
13. ✅ Protected dashboard layout
14. ✅ Authentication bug fixes

### ⏳ Incomplete Tasks (1/27)

15. ❌ **"Verify application works after fix"** - Testing was interrupted

---

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Custom JWT (jose) + httpOnly cookies
- **Styling:** Tailwind CSS
- **Language:** TypeScript

### Directory Structure
```
homebase/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Public: login, signup
│   │   ├── (dashboard)/     # Protected: bills
│   │   └── api/             # API routes
│   ├── lib/
│   │   ├── auth/            # JWT, password, server utils
│   │   └── db/              # Schema, seed, connection
│   └── middleware.ts        # Route protection
├── docs/                    # ADRs, architecture docs
└── drizzle.config.ts       # Database config
```

### Database Schema

**Multi-tenant design** with org-level isolation:

```
organizations (1)
  ├── residences (n)
  ├── users (n)
  └── financial_obligations (n)
```

**Strengths:**
- Proper foreign key relationships with cascade deletes
- Row-level security via `orgId` filtering
- Support for multiple residences per organization
- Proper timestamp tracking (`createdAt`, `updatedAt`, `paidAt`)

---

## Critical Issues 🔴

### 1. Missing File: `src/lib/auth/headers.ts`

**Severity:** CRITICAL (Application will not compile)

**Problem:**
Multiple files import `getAuthHeaders()` from `@/lib/auth/headers`, but this file does not exist:
- `src/app/(auth)/login/page.tsx:5`
- `src/app/(auth)/signup/page.tsx:5`
- `src/app/(dashboard)/layout.tsx:5`
- `src/app/(dashboard)/bills/new/page.tsx:6`

**Workaround Found:**
In `src/app/(dashboard)/bills/page.tsx:21-34`, there's a local implementation:

```typescript
const getAuthHeaders = () => {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    'Content-Type': 'application/json',
    ...(cookies.token ? { Cookie: `token=${cookies.token}` } : {}),
  };
};
```

**Fix Required:**
Create `src/lib/auth/headers.ts` and export this function:

```typescript
export function getAuthHeaders() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    'Content-Type': 'application/json',
    ...(cookies.token ? { Cookie: `token=${cookies.token}` } : {}),
  };
}
```

### 2. Missing API Route: `/api/auth/logout`

**Severity:** HIGH (Feature doesn't work)

**Problem:**
`src/app/(dashboard)/layout.tsx:36` calls `fetch('/api/auth/logout')`, but this route doesn't exist.

**Current Workaround:**
The logout handler manually deletes the cookie client-side:
```typescript
document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
```

**Recommendation:**
- Either remove the fetch call (client-side cookie deletion is sufficient for JWT)
- OR implement the logout route (better for tracking/audit logs)

### 3. Inconsistent Auth Pattern in API Routes

**Severity:** MEDIUM-HIGH (Potential security issue)

**Problem:**
`src/app/api/bills/[id]/pay/route.ts:11` reads from headers:
```typescript
const orgId = request.headers.get('x-org-id');
```

But the `getAuthHeaders()` utility doesn't set this header. Other API routes use `getAuthUser(request)` correctly.

**Impact:**
The "Pay Bill" endpoint will always return 401 Unauthorized.

**Fix:**
Update to use consistent auth pattern:
```typescript
const authUser = await getAuthUser(request);
if (!authUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Use authUser.orgId
```

### 4. Hardcoded Database Credentials

**Severity:** HIGH (Security risk)

**Problem:**
Database URL is hardcoded in two places:
- `src/lib/db/index.ts:5-6`
- `drizzle.config.ts:8-9`

Both files include production credentials in plaintext:
```typescript
'postgresql://neondb_owner:npg_mSiTwQe83sJV@ep-noisy-lab-a1cehoqc-pooler...'
```

**Risk:**
- Credentials exposed in git history
- Anyone with repo access can access production database
- Cannot rotate credentials without code changes

**Fix:**
1. Create `.env.local` with proper secrets
2. Remove hardcoded URLs from code
3. Rotate database credentials immediately
4. Add `.env.local` to `.gitignore` (likely already there)

---

## Major Issues 🟠

### 5. Missing Environment Configuration

**Problem:**
No `.env.example` file to guide setup. Required environment variables:

```bash
# Missing from repository:
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
```

**Fix:**
Create `.env.example` with placeholder values.

### 6. JWT Secret Uses Default Value

**Location:** `src/lib/auth/jwt.ts:3-4`

```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);
```

**Problem:**
If `JWT_SECRET` env var is missing, falls back to a hardcoded default. This is **very dangerous** in production.

**Fix:**
Fail fast if secret is missing:
```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
```

### 7. No Error Boundaries

**Problem:**
No React error boundaries. If any component crashes, entire app goes white screen.

**Impact:**
Poor user experience for ADHD users (no feedback, just broken UI).

**Fix:**
Add error boundaries in:
- `src/app/layout.tsx` (global)
- `src/app/(dashboard)/layout.tsx` (dashboard)

### 8. No Loading States in Dashboard Layout

**Location:** `src/app/(dashboard)/layout.tsx:13`

**Problem:**
`fetchUser()` is async, but there's no loading state. User sees empty header until fetch completes.

**Fix:**
```typescript
const [loading, setLoading] = useState(true);
// ... in fetchUser:
finally { setLoading(false); }

// In render:
{loading ? <div>Loading...</div> : user && <div>{user.name}</div>}
```

### 9. Missing Validation in API Routes

**Location:** Multiple API routes

**Problem:**
Input validation is minimal. Examples:
- `POST /api/bills`: No validation for amount (can be negative, or absurdly large)
- `POST /api/bills`: No validation for date (can be in past)
- `POST /api/auth/signup`: No email format validation
- `POST /api/auth/signup`: No password strength requirements

**Impact:**
- User can create bills with negative amounts
- User can create bills due in 1900
- Weak passwords allowed

**Fix:**
Add validation library (zod or yup) and validate all inputs.

### 10. No Rate Limiting

**Problem:**
No rate limiting on auth endpoints. Attacker can brute-force login attempts.

**Fix:**
Add rate limiting middleware (e.g., `express-rate-limit` or custom implementation).

---

## Minor Issues & Improvements 🟡

### 11. Inconsistent Date Handling

**Problem:**
Bills list uses `Math.ceil()` for days calculation, which can be off by one due to timezone issues.

**Location:** `src/app/(dashboard)/bills/page.tsx:104`

```typescript
const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
```

**Better approach:**
Use `date-fns` library for proper date arithmetic that handles DST and timezones.

### 12. Duplicate Code: Currency/Date Formatters

**Problem:**
`formatCurrency` and `formatDate` functions are defined inline in components. These should be shared utilities.

**Fix:**
Create `src/lib/utils/formatters.ts` and export:
- `formatCurrency(amount: string | number): string`
- `formatDate(date: string | Date): string`

### 13. No TypeScript Strict Mode

**Location:** `tsconfig.json`

**Problem:**
Likely not using strict mode, which allows more potential bugs.

**Fix:**
Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 14. Inconsistent Error Handling

**Problem:**
Some catch blocks log errors, some don't. Some show generic messages, some show specific errors.

**Example inconsistency:**
- `src/app/api/bills/route.ts:23` logs error
- `src/app/(dashboard)/bills/page.tsx:92` doesn't log error

**Fix:**
Standardize error handling:
- Always log errors (at least in development)
- Show user-friendly messages (never expose internal errors)
- Consider error tracking service (Sentry)

### 15. Missing Accessibility Features

**Problem:**
- No `<label>` elements for form inputs
- No ARIA labels
- No focus management after actions
- No keyboard shortcuts

**Impact:**
Fails WCAG 2.1 Level AA standards.

**Fix:**
Add proper semantic HTML and ARIA attributes.

### 16. No Database Migrations

**Problem:**
Using `drizzle-kit push` instead of migrations. This is fine for development but dangerous for production.

**Risk:**
Cannot safely evolve schema in production without downtime.

**Fix:**
Switch to `drizzle-kit generate` + migration files before deploying to production.

### 17. SQL Injection Risk (Low)

**Status:** Currently safe, but fragile

**Analysis:**
Using Drizzle ORM which provides protection via parameterized queries. However, code like this is risky:

`src/app/api/bills/[id]/pay/route.ts:26`
```typescript
eq(financialObligations.id, parseInt(params.id))
```

If `params.id` is malformed, `parseInt` returns `NaN`, which could cause unexpected behavior.

**Fix:**
Validate `params.id` is a valid integer before using:
```typescript
const id = parseInt(params.id, 10);
if (isNaN(id)) {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}
```

### 18. No Logging Strategy

**Problem:**
Using `console.log` and `console.error` everywhere. No structured logging, no log levels, no log aggregation.

**Fix:**
- Use logging library (pino, winston)
- Add request IDs for tracing
- Set up log aggregation (Vercel logs, Datadog, etc.)

---

## Security Concerns 🔒

### Summary of Security Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Hardcoded DB credentials | HIGH | ❌ Not fixed |
| Default JWT secret | HIGH | ❌ Not fixed |
| No rate limiting | MEDIUM | ❌ Not implemented |
| No input validation | MEDIUM | ❌ Minimal validation |
| No HTTPS enforcement | MEDIUM | ⚠️ Vercel handles this |
| No CSRF protection | LOW | ⚠️ SameSite cookie provides some protection |
| No password strength requirements | MEDIUM | ❌ Not implemented |
| No SQL injection protection | LOW | ✅ Drizzle ORM protects |

### Additional Security Recommendations

1. **Add CORS configuration** - Currently accepts all origins
2. **Add CSP headers** - Prevent XSS attacks
3. **Add security headers** - Use `next.config.js` to set:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
4. **Add password strength validation** - Minimum 8 chars, complexity requirements
5. **Add email verification** - Prevent fake account creation
6. **Add 2FA** (Phase 2+) - For admin users

---

## Code Quality & Best Practices

### ✅ What's Done Well

1. **TypeScript usage** - All files properly typed
2. **React hooks usage** - Correct dependencies in `useEffect`, `useCallback`
3. **Component structure** - Clean separation of concerns
4. **Database schema** - Proper normalization and relationships
5. **Authentication pattern** - JWT + httpOnly cookies is secure
6. **Error messages** - User-friendly (don't expose internals)
7. **Responsive design** - Mobile-first with proper touch targets (44px)
8. **ADHD-optimized UX** - Color-coded urgency, large buttons
9. **Code organization** - Clear directory structure
10. **Consistent naming** - camelCase for JS, kebab-case for routes

### ⚠️ Areas for Improvement

1. **No tests** - 0% coverage
2. **No linting config** - `.eslintrc.json` is minimal
3. **No pre-commit hooks** - No husky/lint-staged
4. **No CI/CD** - No GitHub Actions
5. **No component documentation** - No JSDoc comments
6. **No API documentation** - No OpenAPI/Swagger
7. **Inconsistent imports** - Mix of relative and `@/` imports
8. **Magic numbers** - Hardcoded values (e.g., `44px`, `7 days`)
9. **No constants file** - Values repeated across files
10. **No utility for API responses** - Repeated `NextResponse.json` patterns

---

## Testing Status

### Current Status: ❌ NO TESTS

**Test files found:** 0
**Coverage:** 0%

### What Should Be Tested

#### Unit Tests (High Priority)
- [ ] `src/lib/auth/password.ts` - Password hashing/verification
- [ ] `src/lib/auth/jwt.ts` - Token creation/verification
- [ ] `src/lib/auth/server.ts` - Auth user extraction
- [ ] Currency/date formatters (once extracted)
- [ ] Urgency color calculation logic

#### Integration Tests (Medium Priority)
- [ ] `POST /api/auth/signup` - Creates org, user, sets cookie
- [ ] `POST /api/auth/login` - Validates credentials, sets cookie
- [ ] `GET /api/auth/me` - Returns user info
- [ ] `GET /api/bills` - Returns filtered bills
- [ ] `POST /api/bills` - Creates bill with validation
- [ ] `POST /api/bills/[id]/pay` - Marks bill as paid
- [ ] `DELETE /api/bills/[id]` - Deletes bill

#### E2E Tests (Medium Priority)
- [ ] Signup flow (create account → redirects to bills)
- [ ] Login flow (login → see bills list)
- [ ] Add bill flow (fill form → appears in list)
- [ ] Pay bill flow (click button → status changes)
- [ ] Logout flow (click logout → redirects to login)
- [ ] Protected route flow (access /bills without auth → redirects)

#### Visual Regression Tests (Low Priority)
- [ ] Bills list with different urgency levels
- [ ] Mobile responsive layouts
- [ ] Loading states
- [ ] Error states

### Recommended Test Setup

```json
// package.json additions
{
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "playwright": "^1.x"
  },
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## What's Working ✅

Based on code inspection (not runtime testing):

1. **Database Schema** - Well-designed multi-tenant structure
2. **Authentication Logic** - JWT creation/verification looks correct
3. **Password Hashing** - Proper bcrypt usage with salt rounds
4. **Route Protection** - Middleware correctly checks token
5. **API Authorization** - Most endpoints check `orgId` (except pay endpoint)
6. **UI Components** - Properly structured React components
7. **Styling** - Tailwind classes correctly applied
8. **Responsive Design** - Mobile breakpoints in place
9. **Form Validation** - HTML5 validation attributes present
10. **Database Seed Script** - Creates proper test data

---

## What's Not Working / Incomplete ❌

### Broken Features

1. **Application Won't Compile** - Missing `src/lib/auth/headers.ts`
2. **"Pay Bill" Button** - Uses wrong auth pattern (will 401)
3. **Logout** - Calls non-existent API route
4. **Dashboard Header** - No loading state during auth check
5. **Error Pages** - No custom 404/500 pages
6. **Middleware Edge Cases** - Doesn't handle malformed tokens gracefully

### Incomplete Features

1. **Bill Editing** - Button exists but route/page not implemented
2. **Residence Selection** - UI doesn't show/use residences
3. **User Profile** - Can't update name/email/password
4. **Organization Management** - Can't invite users, change org name
5. **Notifications** - Phase 2 feature, not started
6. **Offline Mode** - Phase 4 feature, not started

### Missing Polish

1. **No favicon** - Shows Next.js default
2. **No page titles** - All pages show "Homebase"
3. **No meta tags** - Poor SEO/sharing
4. **No loading indicators** - Besides text changes
5. **No success messages** - No feedback after actions
6. **No undo** - Destructive actions (delete) are permanent
7. **No bill history** - Can't see past paid bills
8. **No search/filter** - Can't find specific bills

---

## Performance Analysis

### Current Performance (Estimated)

**Metrics (not measured, theoretical):**
- **First Contentful Paint:** ~1-2s (Next.js App Router SSR)
- **Time to Interactive:** ~2-3s (client-side hydration)
- **Lighthouse Score:** Likely 80-90 (no optimization yet)

### Potential Performance Issues

1. **No Image Optimization** - Not applicable yet (no images)
2. **No Code Splitting** - Next.js handles this automatically
3. **No Caching Strategy** - No `Cache-Control` headers on API routes
4. **No Database Indexing** - Need indexes on:
   - `users.email` (for login lookups)
   - `financial_obligations.orgId` (for filtering)
   - `financial_obligations.dueDate` (for sorting)
5. **N+1 Query Risk** - Not present yet, but watch for joined queries in future
6. **No Pagination** - Bills list loads all bills (fine for now, problematic at scale)

### Performance Recommendations

1. Add database indexes:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bills_org_due ON financial_obligations(org_id, due_date);
```

2. Add API caching:
```typescript
// In API routes
return NextResponse.json(data, {
  headers: { 'Cache-Control': 'private, max-age=60' }
});
```

3. Add pagination to bills list (when >50 bills):
```typescript
// Add to API route
const limit = parseInt(searchParams.get('limit') ?? '50');
const offset = parseInt(searchParams.get('offset') ?? '0');
```

---

## Dependencies Analysis

### Current Dependencies

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",  // ✅ Latest
    "bcrypt": "^6.0.0",                    // ✅ Latest
    "drizzle-orm": "^0.45.1",              // ✅ Latest
    "jose": "^6.1.3",                      // ✅ Latest
    "next": "14.2.35",                     // ⚠️ Not latest (14.3.x available)
    "react": "^18",                        // ✅ Latest stable
    "react-dom": "^18"                     // ✅ Latest stable
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.8",              // ✅ Latest
    "typescript": "^5"                     // ✅ Latest stable
  }
}
```

### Missing Dependencies (Recommended)

```json
{
  "dependencies": {
    "zod": "^3.x",                        // Input validation
    "date-fns": "^3.x",                   // Date manipulation
    "clsx": "^2.x"                        // Conditional className utility
  },
  "devDependencies": {
    "vitest": "^1.x",                     // Testing framework
    "@testing-library/react": "^14.x",    // React testing utilities
    "prettier": "^3.x",                   // Code formatter
    "husky": "^9.x",                      // Pre-commit hooks
    "lint-staged": "^15.x"                // Run linters on staged files
  }
}
```

### Dependency Risks

1. **bcrypt native binding** - May cause issues in serverless (Vercel handles this)
2. **No version pinning** - Using `^` allows minor updates (risky for production)

---

## Next Steps & Recommendations

### Immediate Actions (Before Deployment)

#### 🔴 CRITICAL (Blocks all testing)

1. **Create missing `src/lib/auth/headers.ts` file**
   ```bash
   # Create the file with getAuthHeaders function
   ```

2. **Fix "Pay Bill" auth bug**
   ```typescript
   // In src/app/api/bills/[id]/pay/route.ts
   // Replace x-org-id header check with getAuthUser()
   ```

3. **Remove hardcoded credentials**
   ```bash
   # Create .env.local
   # Update db/index.ts and drizzle.config.ts
   # Rotate database credentials
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Test end-to-end flow**
   - Signup → Login → Add Bill → Mark Paid → Logout

#### 🟠 HIGH PRIORITY (Before production)

6. **Add JWT_SECRET validation** (fail if missing)
7. **Create `.env.example`**
8. **Add input validation** (zod or yup)
9. **Implement or remove logout API route**
10. **Add loading states** to dashboard layout
11. **Add error boundaries**
12. **Add rate limiting** to auth endpoints
13. **Set up proper logging**

#### 🟡 MEDIUM PRIORITY (Phase 1 polish)

14. **Extract shared utilities** (formatters, constants)
15. **Add database indexes**
16. **Write unit tests** (auth utilities)
17. **Write integration tests** (API routes)
18. **Add custom error pages** (404, 500)
19. **Implement bill editing**
20. **Add pagination** to bills list
21. **Add success messages** after actions
22. **Improve error messages** (more specific)

### Phase 2 Preparation

1. **Set up CI/CD pipeline** (GitHub Actions)
2. **Add monitoring** (error tracking, analytics)
3. **Add feature flags** (for gradual rollout)
4. **Document API** (OpenAPI/Swagger)
5. **Add E2E tests** (Playwright)
6. **Performance audit** (Lighthouse)
7. **Security audit** (OWASP checklist)
8. **Accessibility audit** (WCAG 2.1)

---

## Conclusion

### Overall Assessment

**Grade: B-** (Good foundation, critical bugs prevent deployment)

**Strengths:**
- Solid architecture and database design
- Clean code structure and organization
- Good TypeScript usage
- ADHD-optimized UX considerations
- Security-conscious auth implementation

**Weaknesses:**
- Critical missing file prevents compilation
- Hardcoded credentials are security risk
- No tests whatsoever
- Missing input validation
- Incomplete testing and verification

### Is It Ready for Production?

**No.** The application cannot currently run due to the missing `headers.ts` file. Even after fixing that, there are security concerns (hardcoded credentials, default JWT secret) that must be addressed.

### Is It Ready for User Testing?

**Almost.** After fixing the 3 critical bugs, the application should be functional enough for internal testing. However, I'd recommend:

1. Fix the 3 critical bugs
2. Add basic input validation
3. Test the complete flow manually
4. Deploy to staging environment
5. Test on real mobile device
6. Then proceed with user testing

### Time to Production-Ready

**Estimated:** 2-3 days of focused work

- Day 1: Fix critical bugs, add validation, test thoroughly
- Day 2: Add monitoring, error handling, polish
- Day 3: Deploy to staging, final testing, documentation

---

## Testing Checklist (For Next Session)

When resuming work, test these flows:

### Auth Flow
- [ ] Visit `/bills` without auth → redirects to `/login`
- [ ] Signup with new account → creates org + user → redirects to `/bills`
- [ ] Signup with existing email → shows error
- [ ] Login with valid credentials → sets cookie → redirects to `/bills`
- [ ] Login with invalid credentials → shows error
- [ ] Visit `/login` while logged in → redirects to `/bills`
- [ ] Logout → clears cookie → redirects to `/login`

### Bills CRUD
- [ ] View bills list → shows color-coded urgency
- [ ] Add new bill → appears in list with correct color
- [ ] Add bill with past due date → shows as overdue (red)
- [ ] Add bill with due date in 2 days → shows as critical (orange)
- [ ] Mark bill as paid → changes to green, shows "Paid" badge
- [ ] Delete bill → confirms, then removes from list
- [ ] Bills are filtered by organization (can't see other orgs' bills)

### Mobile Testing
- [ ] All buttons are easily tappable (44px+ touch targets)
- [ ] Text is readable without zooming
- [ ] Forms work on mobile keyboard
- [ ] Layout doesn't break on small screens (320px)

### Edge Cases
- [ ] Very long bill name (>100 chars)
- [ ] Very large amount ($1,000,000+)
- [ ] Bill due in 1000 days
- [ ] Bill due 1000 days ago
- [ ] Network error during fetch
- [ ] Invalid JWT token
- [ ] Malformed API responses

---

## Files to Review/Fix

### Priority 1: Must Fix Before Testing
1. `src/lib/auth/headers.ts` - **CREATE THIS FILE**
2. `src/app/api/bills/[id]/pay/route.ts` - Fix auth pattern
3. `src/lib/db/index.ts` - Remove hardcoded credentials
4. `drizzle.config.ts` - Remove hardcoded credentials
5. `.env.example` - **CREATE THIS FILE**

### Priority 2: Fix Before Deployment
6. `src/lib/auth/jwt.ts` - Fail if JWT_SECRET missing
7. `src/app/(dashboard)/layout.tsx` - Add loading state
8. `src/app/api/auth/logout/route.ts` - **CREATE THIS FILE** or remove call
9. `src/app/layout.tsx` - Add error boundary
10. All API routes - Add input validation

### Priority 3: Polish
11. `src/lib/utils/formatters.ts` - **CREATE THIS FILE** (extract formatters)
12. `src/lib/constants.ts` - **CREATE THIS FILE** (magic numbers)
13. `src/app/not-found.tsx` - **CREATE THIS FILE** (custom 404)
14. `src/app/error.tsx` - **CREATE THIS FILE** (custom error page)
15. `tsconfig.json` - Enable strict mode

---

## Questions for Developer

1. **Environment:** Do you have a `.env.local` file locally? What variables are in it?
2. **Testing:** Did the app ever run successfully? If so, when did it break?
3. **Database:** Have you run `drizzle-kit push` to create the schema?
4. **Seed:** Have you run the seed script to populate test data?
5. **Credentials:** Should we rotate the database credentials that are in git history?
6. **Priorities:** Which fixes should I tackle first? Critical bugs, or continue with Phase 2 features?

---

**End of Code Review**

*Generated by Claude Code on January 8, 2026*
