# Implementation Plan: HEURISTICS.md Features

**Document:** HEURISTICS-plan.md
**Date:** January 12, 2026
**Status:** Planning Phase (No code modifications)

---

## Overview

This plan details the implementation of 8 heuristic algorithms from `/docs/HEURISTICS.md` for the Homebase project. These features provide intelligent, ADHD-optimized bill management without requiring complex machine learning models.

**Core Philosophy:** Simple statistics > complex ML. The system should anticipate problems and provide impossible-to-miss signals for ADHD users.

**Implementation Timeline:** 3 weeks (as recommended in HEURISTICS.md)

---

## Phase 1: Core Heuristics (Week 1)

### 1.1 Pattern Recognition - Bill Amount Prediction

**Feature:** Detect fixed vs variable bills and predict next amount

**Purpose:** Pre-fill amount field when creating recurring bills, reducing friction

**Implementation Details:**

**File: `src/lib/heuristics/amount-prediction.ts`** (NEW)
```typescript
import { mean, std } from 'simple-statistics';
import { Bill } from '@/lib/db/schema';

interface BillAmountPrediction {
  suggested: number;
  confidence: 'high' | 'medium' | 'low';
  pattern: 'fixed' | 'variable';
  range?: [number, number];
}

export function suggestBillAmount(billHistory: Bill[]): BillAmountPrediction {
  // Implementation from HEURISTICS.md
  // Calculate coefficient of variation to detect fixed vs variable
  // Use linear regression for variable bills
  // Return prediction with confidence level
}
```

**Dependencies:**
- `npm install simple-statistics` - Tiny statistics library (~20KB)
- Existing `Bill` type from `src/lib/db/schema.ts`

**API Endpoint:** `src/app/api/heuristics/amount-suggestion/route.ts` (NEW)
```typescript
// GET /api/heuristics/amount-suggestion?billId=123
// Returns predicted amount based on bill history
// Requires JWT authentication (middleware)
// Queries bills by: bill.name + org_id (to find historical amounts)
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - add suggestion call)
- **File:** `src/app/(dashboard)/bills/[id]/page.tsx` (MODIFY - show suggestion on edit)
- UX Pattern:
  - If confidence = 'high', pre-fill amount field
  - Show tooltip: "Based on 12 months of history (fixed bill)"
  - Allow override: User can still edit amount

**Schema Changes:** NONE (uses existing data)

**Multi-tenancy Requirement:**
- Query: `WHERE org_id = <user_org_id> AND name = <bill_name>`
- Never expose data from other organizations

**Testing:**
- Unit tests for coefficient of variation calculation
- Unit tests for linear regression
- E2E test: Create bill with suggested amount
- E2E test: Override suggestion

---

### 1.2 Temporal Pattern Mining - Smart Due Date Prediction

**Feature:** Detect billing cycle patterns and predict next due date

**Purpose:** Auto-suggest next due date when creating recurring bills

**Implementation Details:**

**File: `src/lib/heuristics/temporal-analysis.ts`** (NEW)
```typescript
import { parseISO, differenceInDays, addDays } from 'date-fns';
import { Bill } from '@/lib/db/schema';

interface BillingCycleAnalysis {
  cycle: number; // Days between bills
  pattern: 'regular' | 'irregular';
  nextDueDate: Date | null;
  confidence: 'high' | 'low';
}

export function analyzeBillingCycle(bills: Bill[]): BillingCycleAnalysis {
  // Implementation from HEURISTICS.md
  // Calculate intervals between consecutive bills
  // Find mode (most common interval)
  // Check consistency (allow 2-day variance)
  // Predict next due date
}
```

**Dependencies:**
- `date-fns` (already installed - used in RecurrenceSelector)
- Existing `Bill` type

**API Endpoint:** `src/app/api/heuristics/due-date-suggestion/route.ts` (NEW)
```typescript
// GET /api/heuristics/due-date-suggestion?billId=123
// Returns predicted next due date
// Requires JWT authentication
// Queries bills by: bill.name + org_id + residence_id
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - add date suggestion)
- **File:** `src/app/(dashboard)/bills/[id]/page.tsx` (MODIFY - show suggestion)
- **File:** `src/components/RecurrenceSelector.tsx` (MODIFY - integrate suggestion)
- UX Pattern:
  - If confidence = 'high', pre-fill due date field
  - Show tooltip: "Detected 30-day cycle (12 consistent months)"
  - For irregular patterns, show manual date picker

**Schema Changes:** NONE (uses existing data)

**Multi-tenancy Requirement:**
- Query: `WHERE org_id = <user_org_id> AND name = <bill_name> AND residence_id = <res_id>`
- Critical for multi-residence accuracy

**Testing:**
- Unit tests for interval calculation
- Unit tests for mode detection
- E2E test: Create bill with suggested due date
- E2E test: Handle irregular patterns

---

### 1.3 Anomaly Detection - Unusual Bill Alert

**Feature:** Flag bills with unusual amounts using Z-score

**Purpose:** Catch billing errors or unusual spikes that ADHD users might miss

**Implementation Details:**

**File: `src/lib/heuristics/anomaly-detection.ts`** (NEW)
```typescript
import { mean, std } from 'simple-statistics';
import { Bill } from '@/lib/db/schema';

interface AnomalyDetection {
  isAnomaly: boolean;
  message?: string;
  severity?: 'high' | 'medium' | 'low';
}

export function detectAnomalies(currentBill: Bill, history: Bill[]): AnomalyDetection {
  // Implementation from HEURISTICS.md
  // Calculate Z-score: (current - mean) / stdDev
  // Flag if |Z| > 2 (2 standard deviations)
  // severity = 'high' if |Z| > 3
  // Return formatted message
}
```

**Dependencies:**
- `simple-statistics` (shared from 1.1)
- Existing `Bill` type

**API Endpoint:** `src/app/api/heuristics/analyze-bill/route.ts` (NEW)
```typescript
// POST /api/heuristics/analyze-bill
// Body: { amount: number, billId?: string }
// Returns anomaly detection result
// Requires JWT authentication
// Queries history by: bill.name + org_id (if billId provided)
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/[id]/page.tsx` (MODIFY - show alert)
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - show warning during creation)
- UX Pattern:
  - For HIGH severity: Red banner at top of bill detail
  - For MEDIUM severity: Yellow banner
  - Message format: "⚠️ This bill is ₱2,000 higher than usual"
  - Action: "Edit amount" or "Confirm correct"

**Schema Changes:** NONE (pure analytics)

**Multi-tenancy Requirement:**
- History query: `WHERE org_id = <user_org_id> AND name = <bill_name>`
- Never compare against other organizations

**Testing:**
- Unit tests for Z-score calculation
- Unit tests for severity thresholds
- E2E test: Create bill with unusual amount → see alert
- E2E test: Create bill with normal amount → no alert

---

## Phase 2: Smart Defaults (Week 2)

### 2.1 Auto-categorization - Smart Bill Categorization

**Feature:** Auto-detect bill category from name using pattern matching

**Purpose:** Reduce manual input, improve data consistency

**Implementation Details:**

**File:** `src/lib/heuristics/auto-categorization.ts`** (NEW)
```typescript
import { Bill } from '@/lib/db/schema';

interface CategorizationResult {
  category: string;
  confidence: number;
  autoDetected: boolean;
}

export function autoCategorizeBill(bill: Partial<Bill>): CategorizationResult {
  // Implementation from HEURISTICS.md
  // Pattern matching with regex (electric, water, internet, etc.)
  // Fallback to amount-based heuristics
  // Return category with confidence score
}
```

**Dependencies:** NONE (pure logic)

**API Endpoint:** `src/app/api/heuristics/categorize/route.ts`** (NEW)
```typescript
// POST /api/heuristics/categorize
// Body: { name: string, amount?: number }
// Returns suggested category
// No authentication required (public utility)
```

**Schema Update Required:**
**File:** `src/lib/db/schema.ts` (MODIFY)
```typescript
// Add category enum to financial_obligations table
export const categoryEnum = pgEnum('category', [
  'utility-electric',
  'utility-water',
  'telecom-internet',
  'subscription-entertainment',
  'housing-rent',
  'insurance',
  'major-expense',
  'subscription',
  'uncategorized'
]);

// Add category column to financial_obligations
category: categoryEnum('category').notNull().default('uncategorized'),
```

**Migration:**
```bash
npx drizzle-kit generate:pg  # Generate migration
npx drizzle-kit push:pg      # Apply to database
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - auto-select category)
- **File:** `src/app/(dashboard)/bills/[id]/edit/page.tsx` (MODIFY - show suggestion)
- **File:** `src/components/RecurrenceSelector.tsx` (MODIFY - if applicable)
- UX Pattern:
  - On bill creation page, call API on name change
  - If confidence > 0.8, auto-select category
  - Show badge: "Auto-detected (90% confidence)"
  - Allow override via dropdown

**Multi-tenancy Requirement:** N/A (client-side logic, no data exposure)

**Testing:**
- Unit tests for each pattern regex
- Unit tests for amount-based fallback
- Unit tests for confidence scoring
- E2E test: Create "Meralco Electric" bill → auto-selected as utility-electric
- E2E test: Create "Netflix" bill → auto-selected as subscription-entertainment
- E2E test: Override category manually

---

### 2.2 Amount Prediction - Pre-fill Based on History

**Feature:** Combine pattern recognition (1.1) with history-based suggestions

**Purpose:** Faster bill entry, less mental load for ADHD users

**Implementation Details:**

**Reuses:** `src/lib/heuristics/amount-prediction.ts` (from 1.1)

**Enhancement to API:**
**File:** `src/app/api/heuristics/amount-suggestion/route.ts` (MODIFY)
```typescript
// GET /api/heuristics/amount-suggestion?billId=123&name="Electric"
// Support two modes:
// 1. billId provided: Use specific bill's history
// 2. name provided: Use all bills with matching name + org_id
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - real-time suggestions)
- **File:** `src/app/(dashboard)/bills/[id]/edit/page.tsx` (MODIFY - show suggestion)
- UX Pattern:
  - Debounced API call on name input (300ms delay)
  - Show suggestion in amount field placeholder
  - Click suggestion to auto-fill
  - Display: "Typical amount: ₱2,500 (based on 8 months)"
  - Allow manual override

**Multi-tenancy Requirement:**
- Query: `WHERE org_id = <user_org_id> AND name = <bill_name>`
- Never expose other orgs' data

**Testing:**
- E2E test: Type "Electric" → see amount suggestion
- E2E test: Click suggestion → amount field filled
- E2E test: Override suggestion with custom amount

---

### 2.3 Urgency Scoring Engine - Decision Tree

**Feature:** Calculate urgency score for notification scheduling

**Purpose:** Dynamic, context-aware notifications (critical ADHD feature)

**Implementation Details:**

**File:** `src/lib/heuristics/urgency-scoring.ts`** (NEW)
```typescript
import { Bill } from '@/lib/db/schema';

interface UrgencyContext {
  currentResidence: string;
  userLatenessRate: number; // Percentage of bills paid late
  severeWeatherForecast: boolean;
}

interface UrgencyScore {
  score: number; // 0-100
  level: 'critical' | 'high' | 'normal';
  reasons: string[];
}

export function calculateUrgencyScore(bill: Bill, context: UrgencyContext): UrgencyScore {
  // Implementation from HEURISTICS.md
  // Temporal urgency: days until due (50, 30, 15 points)
  // Remote property penalty: +20 points
  // Amount-based: +10 points for >5000
  // Historical lateness: +15 points if rate > 30%
  // Critical infrastructure: +25 points
  // Weather context: +30 points
  // Return score + level + reasons
}
```

**Dependencies:**
- Existing `Bill` type
- Need user behavior tracking (see Schema Update below)

**Schema Update Required:**
**File:** `src/lib/db/schema.ts` (MODIFY)
```typescript
// Add category column if not already added (from 2.1)
category: categoryEnum('category').notNull().default('uncategorized'),

// Add urgency-related columns to financial_obligations
urgencyScore: integer('urgency_score').notNull().default(0),
urgencyLevel: text('urgency_level').notNull().default('normal'), // 'critical' | 'high' | 'normal'
urgencyReasons: text('urgency_reasons').array(), // Array of strings
lastUrgencyCalculation: timestamp('last_urgency_calculation'),
```

**Migration:**
```bash
npx drizzle-kit generate:pg  # Generate migration
npx drizzle-kit push:pg      # Apply to database
```

**API Endpoint:** `src/app/api/heuristics/calculate-urgency/route.ts`** (NEW)
```typescript
// POST /api/heuristics/calculate-urgency
// Body: { billId: string }
// Returns urgency score + level + reasons
// Requires JWT authentication
// Fetches user behavior data from payment history
```

**User Behavior Tracking (Required for context):**
**File:** `src/lib/heuristics/user-behavior.ts`** (NEW)
```typescript
interface UserBehavior {
  overallForgetRate: number;
  primaryResidence: string;
  lastAppOpen: Date;
  forgetRateByType: Record<string, number>;
}

export async function calculateUserBehavior(userId: string, orgId: string): Promise<UserBehavior> {
  // Query payment history for user
  // Calculate percentage of bills paid late
  // Determine primary residence (most frequent bill location)
  // Track last app open (new column in users table)
  // Group forget rate by category
}
```

**Schema Update for User Behavior:**
**File:** `src/lib/db/schema.ts` (MODIFY)
```typescript
// Add to users table
lastAppOpen: timestamp('last_app_open'),
primaryResidence: text('primary_residence'),
overallForgetRate: numeric('overall_forget_rate').default('0'),
```

**Migration:**
```bash
npx drizzle-kit generate:pg  # Generate migration
npx drizzle-kit push:pg      # Apply to database
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/page.tsx` (MODIFY - show urgency indicators)
- UX Pattern:
  - Display urgency badge on each bill card
  - CRITICAL: Red pulsing badge + "URGENT" text
  - HIGH: Orange badge
  - NORMAL: No badge or subtle indicator
  - Hover: Show reasons (e.g., "Remote property, due tomorrow")
  - Sort order: Critical bills always appear first

**Notification Integration (Phase 2+):**
- This engine powers notification scheduling
- Critical urgency → Immediate push + SMS
- High urgency → Push in 1 hour
- Normal urgency → Daily digest

**Multi-tenancy Requirement:**
- User behavior query: `WHERE user_id = <user_id> AND org_id = <org_id>`
- Never expose behavior data across orgs

**Testing:**
- Unit tests for urgency score calculation
- Unit tests for each factor (temporal, remote, amount, history, etc.)
- Unit tests for user behavior calculation
- E2E test: Bill due tomorrow + remote property → CRITICAL badge
- E2E test: Bill due in 7 days + local → NORMAL badge
- E2E test: Late payment history → higher urgency

---

## Phase 3: Proactive Features (Week 3)

### 3.1 Forget Risk Prediction - Bayesian Inference

**Feature:** Predict if user will forget a bill based on behavior patterns

**Purpose:** Proactive intervention before user forgets (critical ADHD feature)

**Implementation Details:**

**File:** `src/lib/heuristics/forget-risk-prediction.ts`** (NEW)
```typescript
import { Bill } from '@/lib/db/schema';

interface UserBehavior {
  overallForgetRate: number;
  primaryResidence: string;
  lastAppOpen: Date;
  forgetRateByType: Record<string, number>;
}

interface ForgetRiskPrediction {
  riskLevel: 'high' | 'medium' | 'low';
  probability: number; // 0-1
  recommendation: string;
}

export function predictForgetRisk(bill: Bill, userBehavior: UserBehavior): ForgetRiskPrediction {
  // Implementation from HEURISTICS.md
  // Prior: overallForgetRate
  // Evidence 1: Residence (3x multiplier for remote)
  // Evidence 2: Days since check-in (1.5x multiplier if > 7 days)
  // Evidence 3: Bill type history (average with type-specific rate)
  // Cap at 0.95
  // Return risk level + recommendation
}
```

**Dependencies:**
- Existing `Bill` type
- Reuses `UserBehavior` type from 2.3

**API Endpoint:** `src/app/api/heuristics/forget-risk/route.ts`** (NEW)
```typescript
// POST /api/heuristics/forget-risk
// Body: { billId: string }
// Returns forget risk prediction
// Requires JWT authentication
// Fetches user behavior from payment history
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/[id]/page.tsx` (MODIFY - show risk warning)
- **File:** `src/app/(dashboard)/bills/page.tsx` (MODIFY - show risk indicator)
- UX Pattern:
  - HIGH risk: Red banner "⚠️ High forget risk - Enable SMS reminders?"
  - MEDIUM risk: Yellow banner "ℹ️ You often forget this type of bill"
  - Action button: "Enable SMS fallback" (Phase 2 feature)
  - Show probability: "73% chance you'll forget this bill"

**Notification Integration (Phase 2+):**
- High-risk bills get earlier, more aggressive notifications
- SMS fallback auto-suggested for high-risk bills
- Spouse notification triggered for critical + high-risk

**Multi-tenancy Requirement:**
- User behavior query: `WHERE user_id = <user_id> AND org_id = <org_id>`
- Never expose behavior data across orgs

**Testing:**
- Unit tests for Bayesian probability updates
- Unit tests for multipliers (residence, check-in, type)
- Unit tests for risk level thresholds
- E2E test: Remote bill + 7 days inactive → HIGH risk
- E2E test: Local bill + recent activity → LOW risk
- E2E test: Show "Enable SMS" button for HIGH risk

---

### 3.2 Budget Forecasting - Time Series

**Feature:** Predict next month's total bills with seasonal adjustments

**Purpose:** "Heads up" notifications for budgeting

**Implementation Details:**

**File:** `src/lib/heuristics/budget-forecasting.ts`** (NEW)
```typescript
import { Bill } from '@/lib/db/schema';

interface BudgetForecast {
  predicted: number; // Predicted total
  confidence: 'high' | 'low';
  breakdown: Record<string, number>; // By category
  seasonalNote?: string; // E.g., "₱3k higher due to summer AC"
}

export function forecastMonthlyBills(history: Bill[]): BudgetForecast {
  // Implementation from HEURISTICS.md
  // Group by month
  // Apply exponential smoothing (alpha = 0.3)
  // Adjust for seasonality (summer AC, winter heating)
  // Predict by category
  // Return forecast + confidence + seasonal note
}
```

**Dependencies:**
- `date-fns` (already installed)
- Existing `Bill` type

**API Endpoint:** `src/app/api/heuristics/budget-forecast/route.ts`** (NEW)
```typescript
// GET /api/heuristics/budget-forecast?months=3
// Returns budget forecast for next N months
// Requires JWT authentication
// Queries bills by: org_id
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/page.tsx` (MODIFY - add forecast card)
- UX Pattern:
  - Card at top of bills page: "Next month: ~₱15,000 (↑₱3k vs this month)"
  - Expandable: Show breakdown by category
  - Show seasonal note: "Higher due to summer AC usage"
  - Action: "View detailed forecast" → opens modal

**Notification Integration (Phase 2+):**
- Monthly notification: "Heads up: Next month's bills will be ₱15k"
- Highlight unexpected increases

**Seasonality Configuration:**
**File:** `src/lib/heuristics/seasonal-factors.ts`** (NEW)
```typescript
// Philippines-specific seasonality
export const SEASONAL_FACTORS: Record<number, number> = {
  // Summer (Mar-May): Higher electricity (AC)
  2: 1.1, 3: 1.15, 4: 1.1,
  // Rainy season (Jun-Nov): Potential water bill increase
  6: 1.05, 7: 1.1, 8: 1.05,
  // Holiday season (Dec): Normal or slight decrease
  11: 1.0, 0: 1.0,
  // Jan-Feb: Post-holiday normal
};
```

**Multi-tenancy Requirement:**
- Query: `WHERE org_id = <user_org_id>`
- Never expose other orgs' data

**Testing:**
- Unit tests for exponential smoothing
- Unit tests for seasonal factor application
- Unit tests for breakdown by category
- E2E test: View forecast on bills page
- E2E test: Verify seasonal adjustments

---

### 3.3 Smart Suggestions - Association Rules

**Feature:** Suggest missing bills based on common patterns

**Purpose:** Gentle nudge: "You track electric and internet—did you forget water?"

**Implementation Details:**

**File:** `src/lib/heuristics/smart-suggestions.ts`** (NEW)
```typescript
import { Bill } from '@/lib/db/schema';

interface BillSuggestion {
  bill: string;
  reason: string;
  confidence: number;
}

interface SuggestionPatterns {
  electricWater: number; // % of electric users who track water
  internetWater: number; // % of internet users who track water
  propertyInsurance: number; // % of multi-property users with insurance
}

export function suggestMissingBills(
  userBills: Bill[],
  allUserPatterns: SuggestionPatterns
): BillSuggestion[] {
  // Implementation from HEURISTICS.md
  // Find common bill combinations
  // Check which combos user is missing
  // Return suggestions with confidence
}
```

**Dependencies:**
- Existing `Bill` type
- Need aggregated data for patterns (see below)

**Pattern Data Collection:**
**File:** `src/lib/heuristics/pattern-analytics.ts`** (NEW)
```typescript
// Aggregate data across all organizations (anonymous)
interface PatternAnalytics {
  electricWater: number;
  internetWater: number;
  propertyInsurance: number;
  // More patterns...
}

export async function calculatePatternAnalytics(db: DrizzleDB): Promise<PatternAnalytics> {
  // Anonymous aggregation across all orgs
  // Group by: count(orgs with electric), count(orgs with both electric + water)
  // Calculate percentages
  // Never expose individual org data
}
```

**Cron Job for Pattern Updates:**
**File:** `src/lib/heuristics/cron-update-patterns.ts`** (NEW)
```typescript
// Run daily/weekly to update pattern analytics
export async function updatePatternAnalytics() {
  // Calculate new patterns
  // Store in database or cache
}
```

**Schema Update for Pattern Storage:**
**File:** `src/lib/db/schema.ts` (MODIFY)
```typescript
// New table for aggregated pattern data
export const patternAnalytics = pgTable('pattern_analytics', {
  id: serial('id').primaryKey(),
  patternType: text('pattern_type').notNull(), // 'electric_water', etc.
  percentage: numeric('percentage').notNull(), // 0-100
  sampleSize: integer('sample_size').notNull(), // Number of orgs analyzed
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});
```

**Migration:**
```bash
npx drizzle-kit generate:pg  # Generate migration
npx drizzle-kit push:pg      # Apply to database
```

**API Endpoint:** `src/app/api/heuristics/suggestions/route.ts`** (NEW)
```typescript
// GET /api/heuristics/suggestions
// Returns smart suggestions for current user
// Requires JWT authentication
// Queries user's bills + pattern analytics
```

**UI Integration:**
- **File:** `src/app/(dashboard)/bills/page.tsx` (MODIFY - add suggestions section)
- **File:** `src/app/(dashboard)/bills/new/page.tsx` (MODIFY - show inline suggestions)
- UX Pattern:
  - Card at bottom: "Suggestions based on your setup"
  - Suggestion: "💡 89% of users with electric also track water"
  - Action button: "Add water bill" → pre-filled form
  - Dismissible: "Don't show this again"

**Multi-tenancy Requirement:**
- Pattern analytics: Anonymous aggregation, no individual org exposure
- User bills query: `WHERE org_id = <user_org_id>`
- Suggestions are based on global patterns, not other orgs' data

**Testing:**
- Unit tests for pattern matching logic
- Unit tests for suggestion generation
- E2E test: View suggestions on bills page
- E2E test: Click suggestion → creates water bill
- E2E test: Dismiss suggestion

---

## Cross-Cutting Concerns

### Database Migrations Summary

**Phase 1:** NONE
**Phase 2:**
1. Add `category` enum and column to `financial_obligations`
2. Add urgency columns to `financial_obligations`
3. Add behavior columns to `users`

**Phase 3:**
4. Add `pattern_analytics` table

**Total Migrations:** 4

---

### Dependencies to Install

```bash
npm install simple-statistics  # Statistical functions (mean, std, etc.)
```

**Already installed:**
- `date-fns` - Date math (used in RecurrenceSelector)

**NOT installing:**
- No ML libraries (TensorFlow.js, PyTorch)
- No heavy statistics libraries
- Pure TypeScript + basic stats = sufficient

---

### Testing Strategy

**Unit Tests (Vitest - Phase 2+):**
- All heuristic functions
- Pattern matching logic
- Statistical calculations

**E2E Tests (Playwright - Immediately):**
- 3-4 tests per feature
- Total: ~30 new tests for 8 features
- Full test suite: ~62 tests

**Test Coverage Goals:**
- Unit: 90%+ coverage
- E2E: All user flows covered

---

### Performance Considerations

**Caching Strategy:**
- Pattern analytics: Cache for 24 hours (updated via cron)
- User behavior: Cache per user (1-hour TTL)
- Bill history queries: Cache by org_id (15-minute TTL)

**Database Indexing:**
```sql
-- Add indexes for frequent queries
CREATE INDEX idx_bills_org_name ON financial_obligations(org_id, name);
CREATE INDEX idx_bills_org_category ON financial_obligations(org_id, category);
CREATE INDEX idx_bills_org_residence ON financial_obligations(org_id, residence_id);
```

**API Response Times:**
- Target: <200ms for all heuristic APIs
- Use edge runtime where possible (Next.js)

---

### Security & Multi-tenancy

**Critical Rules:**
1. ✅ All API routes verify JWT token
2. ✅ Extract `org_id` and `user_id` from verified token
3. ✅ All queries include `WHERE org_id = <org_id>`
4. ✅ Never expose other organizations' data
5. ✅ Pattern analytics: Anonymous aggregation only

**Authorization:**
- Public APIs: `categorize` (no authentication needed)
- Protected APIs: All others require JWT verification

---

### ADHD Optimization

**Visual Design:**
- Anomaly alerts: Red banners (impossible to miss)
- Urgency badges: Pulsing animations for critical
- Suggestions: Prominent but non-intrusive

**Interaction Design:**
- One-click actions: "Add suggested bill"
- Pre-filled forms: Reduce mental load
- Contextual messages: "Based on your history"

**Notification Strategy:**
- Critical: Immediate push + SMS + escalation
- High: Push in 1 hour
- Normal: Daily digest

---

### Phase 4: Integration & Polish (Week 4 - Optional)

**Tasks:**
1. Integrate all heuristics into existing bill flows
2. Add loading states for API calls
3. Handle edge cases (no history, irregular patterns)
4. Add user feedback mechanism ("Was this helpful?")
5. Performance optimization (caching, indexing)
6. Documentation updates

**Deliverables:**
- All 8 features fully integrated
- E2E test suite passing (100%)
- Performance targets met
- User feedback collection active

---

## Implementation Checklist

### Week 1: Core Heuristics
- [ ] Install `simple-statistics`
- [ ] Implement `amount-prediction.ts`
- [ ] Implement `temporal-analysis.ts`
- [ ] Implement `anomaly-detection.ts`
- [ ] Create API endpoints (3)
- [ ] UI integration for amount suggestions
- [ ] UI integration for due date suggestions
- [ ] UI integration for anomaly alerts
- [ ] Unit tests (all functions)
- [ ] E2E tests (3 per feature)

### Week 2: Smart Defaults
- [ ] Implement `auto-categorization.ts`
- [ ] Add `category` enum and column to schema
- [ ] Generate and push migration
- [ ] Create categorization API
- [ ] UI integration for auto-categorization
- [ ] Enhance amount suggestion API
- [ ] Implement `urgency-scoring.ts`
- [ ] Add urgency columns to schema
- [ ] Add behavior columns to users table
- [ ] Generate and push migration
- [ ] Implement `user-behavior.ts`
- [ ] Create urgency calculation API
- [ ] UI integration for urgency badges
- [ ] Unit tests (all functions)
- [ ] E2E tests (3 per feature)

### Week 3: Proactive Features
- [ ] Implement `forget-risk-prediction.ts`
- [ ] Create forget risk API
- [ ] UI integration for risk warnings
- [ ] Implement `budget-forecasting.ts`
- [ ] Implement `seasonal-factors.ts`
- [ ] Create budget forecast API
- [ ] UI integration for forecast card
- [ ] Implement `smart-suggestions.ts`
- [ ] Implement `pattern-analytics.ts`
- [ ] Add `pattern_analytics` table to schema
- [ ] Generate and push migration
- [ ] Create pattern update cron job
- [ ] Create suggestions API
- [ ] UI integration for suggestions
- [ ] Unit tests (all functions)
- [ ] E2E tests (3 per feature)

### Week 4: Integration & Polish (Optional)
- [ ] Integrate all heuristics into bill flows
- [ ] Add loading states
- [ ] Handle edge cases
- [ ] Add feedback mechanism
- [ ] Performance optimization
- [ ] Database indexing
- [ ] Full E2E test suite (62 tests)
- [ ] Documentation updates

---

## Success Criteria

**Functional:**
- ✅ All 8 heuristics implemented and tested
- ✅ UI integration complete with clear user flows
- ✅ 100% E2E test pass rate
- ✅ API response times <200ms

**User Experience:**
- ✅ Reduce bill creation time by 30%
- ✅ Catch 90% of anomalous bills (>2 std dev)
- ✅ 80%+ accuracy for auto-categorization (confidence > 0.8)
- ✅ High user satisfaction with suggestions

**Technical:**
- ✅ Zero multi-tenancy data leaks
- ✅ Zero type errors
- ✅ Clean linting (ESLint)
- ✅ Migration rollback plan tested

---

## Risks & Mitigations

**Risk:** Pattern analytics require sufficient data
**Mitigation:** Use hardcoded defaults initially, migrate to data-driven as orgs grow

**Risk:** Heuristics may make wrong predictions
**Mitigation:** Always allow user override, show confidence levels, collect feedback

**Risk:** Performance impact from real-time calculations
**Mitigation:** Caching strategy, database indexing, edge runtime

**Risk:** Complex dependencies on future phases (notifications)
**Mitigation:** Build foundation now, integrate with notifications in Phase 2

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Approve priority and timeline** (3 weeks + optional Week 4)
3. **Begin Week 1 implementation** starting with `amount-prediction.ts`
4. **Deploy to staging** after each week
5. **Alpha testing** with PelicanoFamily after Week 3
6. **Production deployment** after Week 4 (if included)

---

**Document Status:** Ready for implementation
**Next Review:** After Week 1 completion
**Author:** Sisyphus (AI Agent)
**Project:** Homebase - ADHD Executive Function Support System
