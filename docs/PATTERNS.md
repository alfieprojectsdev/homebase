# Software Patterns in Homebase

## Patterns Already Implemented ✅
- **Master Data Management (ERP)**: Org → Residence → Bills hierarchy
- **Temporal Pattern (E-commerce)**: Recurrence engine (in progress)
- **Role-Based Access (Enterprise)**: Multi-user with org isolation

## Patterns to Implement by Phase

### Phase 2 (Notifications)
- **Campaign Sequences (CRM)**: Multi-channel reminder flows
  - Files: `src/lib/notifications/campaigns.ts`
  - Reference: Mailchimp automation patterns

- **Urgency Scoring (CRM)**: Risk-based prioritization
  - Files: `src/lib/scoring/urgency.ts`
  - Reference: HubSpot lead scoring

### Phase 5 (Receipts)
- **Document Management (ERP)**: Attachment lifecycle
  - Files: `src/lib/documents/`
  - Reference: SAP DMS

## Anti-Patterns to Avoid
- ❌ Over-categorization (keep ≤7 categories)
- ❌ Notification fatigue (quality > quantity)
- ❌ Premature workflow complexity

## Pattern Quick Reference
| Implementing... | Use Pattern | From Domain | Example |
|-----------------|-------------|-------------|---------|
| Bill history | Activity Timeline | CRM | Salesforce |
| Smart defaults | Template System | Wiki | Notion |
| Risk detection | Scoring Engine | CRM | HubSpot |


---

## **ERP Systems (SAP, Odoo, Microsoft Dynamics)**

### Applicable Patterns

#### 1\. **Master Data Management (MDM)**

**What it is:** Central repository of core business entities with strict data governance.

**In ERPs:**

- Customer master, vendor master, material master
- Each entity has a "golden record"
- Changes propagate to dependent records

**Apply to Homebase:**

```
// Master data entities
- Organization (family unit) ← master
  └── Residences ← master
      └── Bills ← transactional
      └── Inventory ← transactional

// Pattern: Master-transactional separation
interface MasterData {
  id: string;
  lastModified: Date;
  modifiedBy: UserId;
  version: number; // Optimistic locking
}

// Bills reference master (residence), don't duplicate
interface Bill {
  residenceId: number; // FK to master
  // NOT: residenceName, residenceAddress (duplicated data)
}
```

**Why useful:** You already have this! Your schema follows MDM principles (org → residence → bills). This validates your design.

---

#### 2\. **Document Management (DMS) Pattern**

**What it is:** Attachment lifecycle management with metadata.

**In ERPs:**

- Invoices attached to purchase orders
- Receipts attached to expense reports
- Version control, approval status

**Apply to Homebase:**

```
// Phase 5+: Bill receipt scanning
interface Document {
  id: string;
  entityType: 'bill' | 'receipt' | 'warranty';
  entityId: number;
  fileUrl: string;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: UserId;
  status: 'pending' | 'verified' | 'archived';
  ocrData?: { // Extracted from receipt
    amount: number;
    date: Date;
    merchant: string;
  };
}

// Enable: "Show me the MERALCO bill from March 2024"
```

**Real-world example:** SAP DMS, Oracle Document Cloud

---

#### 3\. **Period Close / Month-End Pattern**

**What it is:** Temporal boundaries for financial reconciliation.

**In ERPs:**

- Accounting periods lock after month-end
- Prevents backdating transactions
- Generates period reports

**Apply to Homebase:**

```
// Monthly reconciliation for ADHD users
interface MonthlyClose {
  month: string; // '2024-03'
  status: 'open' | 'closed' | 'reconciled';
  totalBillsPaid: number;
  totalAmount: number;
  unpaidBills: number;
  closedAt?: Date;
}

// UI: "Close January" button
// - Marks all paid bills as reconciled
// - Flags unpaid bills as "carried over"
// - Generates summary: "You paid 12/14 bills totaling ₱23,500"
```

**Why useful:** Creates psychological closure. ADHD brains benefit from clear "done" states.

---

#### 4\. **Three-Way Match Pattern**

**What it is:** Verify agreement between purchase order, receipt, and invoice before payment.

**In ERPs:**

- PO says: "Buy 100 units @ $10 = $1000"
- Receipt says: "Received 98 units"
- Invoice says: "Charging $1000"
- System flags: "Quantity mismatch!"

**Apply to Homebase:**

```
// Bill verification pattern
interface BillVerification {
  expectedAmount: number; // Historical average
  actualAmount: number;   // Current bill
  variance: number;       // Difference
  
  verify(): VerificationResult {
    const threshold = 0.20; // 20% variance
    if (Math.abs(this.variance) > threshold) {
      return {
        status: 'flagged',
        message: \`⚠️ Bill is ${this.variance > 0 ? 'higher' : 'lower'} than usual\`,
        action: 'Review before paying'
      };
    }
    return { status: 'ok' };
  }
}
```

**Real-world example:** Oracle Procurement Cloud, SAP MM

---

#### 5\. **Approval Workflow Pattern**

**What it is:** Routing documents through approval chains with escalation.

**In ERPs:**

- Purchase requisition → Manager → Finance → Procurement
- Expense report → Team Lead → VP → Finance

**Apply to Homebase (Phase 7: Spouse Collaboration):**

```
// For shared finances
interface ApprovalWorkflow {
  initiator: UserId;
  approvers: UserId[];
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected';
  
  // Example: Large purchase approval
  // User A: "I need to pay ₱50k property tax"
  // User B: Sees notification → approves
  // System: Marks as ready to pay
}

// Or simpler: "Acknowledge" pattern
// "Your spouse paid ₱4200 MERALCO" → [Acknowledge]
```

**Real-world example:** ServiceNow, Jira workflows

---

## **CRM Systems (Salesforce, HubSpot)**

### Applicable Patterns

#### 6\. **Activity Timeline Pattern**

**What it is:** Chronological feed of all interactions with a record.

**In CRMs:**

- Contact record shows: emails sent, calls made, meetings scheduled
- Unified view of relationship history

**Apply to Homebase:**

```
// Activity feed for each bill
interface Activity {
  billId: number;
  timestamp: Date;
  type: 'created' | 'updated' | 'paid' | 'reminder_sent' | 'viewed';
  user: UserId;
  metadata?: {
    amountChanged?: { from: number; to: number };
    dueDateChanged?: { from: Date; to: Date };
  };
}

// UI: Bill detail page shows:
// - Jan 5: Bill created by User A
// - Jan 10: Reminder sent
// - Jan 12: User B viewed
// - Jan 15: Marked as paid by User A
```

**Why useful:** Shared visibility in multi-user households. "Did you already pay this?" → Check timeline.

**Real-world example:** Salesforce Activity Timeline, HubSpot CRM Records

---

#### 7\. **Lead Scoring / Engagement Scoring**

**What it is:** Numerical score representing likelihood of conversion.

**In CRMs:**

- Lead score = email opens + website visits + form fills
- Hot leads (90+), warm (50-89), cold (<50)

**Apply to Homebase:**

```
// "Forget Risk Score" (you already discussed this!)
function calculateForgetRisk(bill: Bill): number {
  let risk = 0;
  
  // Engagement scoring
  if (daysSinceLastAppOpen > 7) risk += 30;
  if (bill.residence !== primaryResidence) risk += 25;
  if (userLatePaymentRate > 0.3) risk += 20;
  if (!hasNotificationsEnabled) risk += 25;
  
  return Math.min(risk, 100);
}

// Trigger intervention at risk > 70
```

**Real-world example:** HubSpot Lead Scoring, Salesforce Einstein Scoring

---

#### 8\. **Campaign Management Pattern**

**What it is:** Scheduled, multi-channel communication sequences.

**In CRMs:**

- Drip campaigns: Day 1 email, Day 3 SMS, Day 7 call
- A/B testing different messages

**Apply to Homebase (Phase 2: Notifications):**

```
// Notification campaign for critical bills
interface NotificationCampaign {
  trigger: 'bill_due_soon';
  steps: [
    { day: -7, channel: 'push', message: 'Bill due in 7 days' },
    { day: -3, channel: 'push', message: 'URGENT: Bill due in 3 days' },
    { day: -1, channel: ['push', 'sms'], message: 'CRITICAL: Pay today' },
    { day: 0, channel: ['push', 'sms', 'email'], message: 'OVERDUE' },
  ];
}

// Enable A/B testing: Which message reduces late payments?
```

**Real-world example:** Mailchimp Automations, HubSpot Workflows

---

#### 9\. **Territory Management**

**What it is:** Assign records to users based on geography/rules.

**In CRMs:**

- West Coast accounts → Sales Rep A
- East Coast → Sales Rep B

**Apply to Homebase:**

```
// Bill ownership by residence or category
interface BillOwnership {
  userId: UserId;
  rules: {
    residences?: number[]; // "I handle all City B bills"
    categories?: string[]; // "I handle all utilities"
    default?: boolean;     // Catch-all
  };
}

// Auto-assign new bills based on rules
// Reduces "whose job is this?" friction
```

**Real-world example:** Salesforce Territory Management

---

## **LMS Platforms (Moodle, Canvas)**

### Applicable Patterns

#### 10\. **Gradebook / Progress Tracking**

**What it is:** Visual representation of completion status.

**In LMS:**

- Course progress: 7/10 modules completed (70%)
- Grade breakdown: Assignments 85%, Quizzes 92%, Final 88%

**Apply to Homebase:**

```
// Monthly bill completion tracking
interface MonthlyProgress {
  month: string;
  totalBills: number;
  paidBills: number;
  progress: number; // 0-100
  status: 'on-track' | 'at-risk' | 'overdue';
  
  // Gamification for ADHD motivation
  streak?: number; // "12 months, all bills paid on time!"
  badges?: string[]; // "Perfect Month", "Early Bird"
}

// UI: Progress bar + confetti when 100%
```

**Why useful:** Visual progress = dopamine for ADHD brains.

**Real-world example:** Canvas Progress Indicators, Duolingo Streaks

---

#### 11\. **Assignment Due Date Clustering**

**What it is:** Visual calendar showing deadline density.

**In LMS:**

- Week view: 5 assignments due Thursday (red flag)
- Suggests: "Start early, heavy week ahead"

**Apply to Homebase:**

```
// Bill clustering analysis
function analyzeBillClustering(bills: Bill[]) {
  const clusters = groupByWeek(bills);
  
  return clusters.map(week => ({
    weekStart: week.start,
    billCount: week.bills.length,
    totalAmount: sum(week.bills.map(b => b.amount)),
    severity: week.bills.length > 5 ? 'high' : 'normal',
    suggestion: week.bills.length > 5 
      ? 'Consider paying some bills early to spread load'
      : null
  }));
}

// UI: Calendar heatmap like GitHub contributions
// Dark red = many bills due that week
```

**Real-world example:** Google Calendar density view, Moodle Calendar

---

#### 12\. **Rubric / Criteria-Based Assessment**

**What it is:** Structured evaluation framework.

**In LMS:**

- Essay graded on: Thesis (25%), Evidence (25%), Grammar (25%), Creativity (25%)

**Apply to Homebase:**

```
// Bill payment urgency rubric
const urgencyRubric = {
  temporal: {
    weight: 0.3,
    criteria: {
      'due_today': 10,
      'due_tomorrow': 8,
      'due_3_days': 5,
      'due_week': 2
    }
  },
  financial: {
    weight: 0.2,
    criteria: {
      'high_amount': 8,
      'medium_amount': 5,
      'low_amount': 2
    }
  },
  consequences: {
    weight: 0.5,
    criteria: {
      'utility_shutoff': 10,
      'late_fee': 5,
      'credit_impact': 7,
      'no_consequence': 0
    }
  }
};

// More structured than ad-hoc scoring
```

**Real-world example:** Canvas SpeedGrader, Blackboard Rubrics

---

## **Knowledge Management (Confluence, Notion)**

### Applicable Patterns

#### 13\. **Template System**

**What it is:** Pre-structured formats for common document types.

**In Wikis:**

- Meeting notes template
- Project brief template
- Onboarding checklist template

**Apply to Homebase:**

```
// Bill templates for common types
interface BillTemplate {
  name: string;
  category: string;
  defaultAmount?: number;
  recurrence: RecurrencePattern;
  reminders: ReminderConfig;
  
  // Pre-fill new bills
  // User clicks: "Add from template: Electricity Bill"
  // Form auto-fills: Category, typical amount, 30-day recurrence
}

const commonTemplates = [
  { name: 'Monthly Electric', category: 'utility', recurrence: { every: 30 } },
  { name: 'Annual Insurance', category: 'insurance', recurrence: { every: 365 } },
  { name: 'Netflix', category: 'subscription', amount: 459, recurrence: { every: 30 } }
];
```

**Real-world example:** Notion Templates, Confluence Blueprints

---

#### 14\. **Tagging / Taxonomy Pattern**

**What it is:** Multi-dimensional categorization beyond folders.

**In Wikis:**

- Page can be tagged: #engineering, #product, #urgent
- Find all #urgent pages across spaces

**Apply to Homebase:**

```
// Flexible bill categorization
interface Bill {
  // ...existing fields
  tags: string[]; // Multiple dimensions
}

// Examples:
// Bill: MERALCO
//   category: 'utility'
//   tags: ['essential', 'variable-amount', 'online-payable']

// Enables queries like:
// - Show all 'essential' bills (water, electric, rent)
// - Show all 'online-payable' (can pay via app)
// - Show all 'fixed-amount' (budgeting easier)
```

**Real-world example:** Evernote Tags, Notion Multi-select

---

#### 15\. **Linked References / Backlinks**

**What it is:** Bi-directional links showing relationships.

**In Wikis:**

- Page A links to Page B
- Page B shows "Referenced in: Page A, Page C"

**Apply to Homebase:**

```
// Bill relationships
interface BillLink {
  fromBillId: number;
  toBillId: number;
  relationship: 'bundle' | 'depends' | 'alternative';
}

// Examples:
// - Internet + Cable TV (bundle discount)
// - Condo dues → Water bill included
// - Insurance policy → Premium split into monthly payments

// UI: "This bill is bundled with Cable TV"
```

**Real-world example:** Roam Research, Obsidian backlinks

---

## **Version Control Systems (Git, SVN)**

### Applicable Patterns

#### 16\. **Audit Trail / History**

**What it is:** Immutable log of all changes.

**In VCS:**

- Every commit logged: who, when, what changed
- Can revert to any previous state

**Apply to Homebase:**

```
// Bill change history (already common in finance apps)
interface BillHistory {
  billId: number;
  changes: ChangeLog[];
}

interface ChangeLog {
  timestamp: Date;
  userId: UserId;
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string; // "Corrected amount after checking bill"
}

// Enables:
// - "Why did this amount change?"
// - "Who moved the due date?"
// - Dispute resolution: "I swear I marked it paid!"
```

**Real-world example:** Stripe API changelog, Salesforce Field History

---

#### 17\. **Branching / What-If Scenarios**

**What it is:** Create parallel versions to test changes.

**In VCS:**

- Main branch = production
- Feature branch = experimental work
- Merge if successful, discard if not

**Apply to Homebase (Advanced):**

```
// Budget scenario planning
interface BudgetScenario {
  name: string;
  basedOn: 'current' | ScenarioId;
  changes: {
    addBills?: Partial<Bill>[];
    removeBills?: number[];
    updateAmounts?: { billId: number; newAmount: number }[];
  };
  
  // Example: "What if we cancel Netflix and add Spotify?"
  calculate(): {
    monthlyChange: number;
    annualSavings: number;
  };
}
```

**Real-world example:** Financial modeling tools, Excel scenarios

---

## **Healthcare (Epic, Cerner) - Bonus Domain**

### Applicable Patterns

#### 18\. **Problem List Pattern**

**What it is:** Persistent list of active issues requiring attention.

**In EHR:**

- Patient problem list: Diabetes (active), Hypertension (active), Flu (resolved)
- Each visit references relevant problems

**Apply to Homebase:**

```
// Active household issues
interface ProblemList {
  items: Problem[];
}

interface Problem {
  id: string;
  title: string;
  status: 'active' | 'monitoring' | 'resolved';
  severity: 'critical' | 'moderate' | 'minor';
  createdAt: Date;
  resolvedAt?: Date;
  relatedBills?: number[];
  
  // Examples:
  // - "Water heater making noise" (active, critical, related to maintenance fund)
  // - "High electricity usage last 3 months" (monitoring, moderate)
}

// Links bills to larger context
```

**Real-world example:** Epic Problem List, Apple Health Issues

---

#### 19\. **Medication Adherence Tracking**

**What it is:** Monitor if patient takes meds on schedule, with reminders.

**In Healthcare:**

- Med schedule: Take pill at 8am, 2pm, 8pm
- Missed dose alert
- Adherence score: 92% (23/25 doses taken)

**Apply to Homebase:**

```
// Bill payment adherence
interface AdherenceMetrics {
  totalBills: number;
  paidOnTime: number;
  paidLate: number;
  unpaid: number;
  adherenceRate: number; // 0-100
  
  // ADHD-friendly: Non-judgmental tracking
  message: adherenceRate > 90 
    ? "🎉 Excellent! You're crushing it"
    : adherenceRate > 70
    ? "👍 Good job! A few late, but no major issues"
    : "💪 Room for improvement. Let's set up more reminders";
}
```

**Why useful:** Healthcare knows how to motivate adherence without shame. ADHD users need the same approach.

---

## **Retail/E-commerce (Shopify, Amazon)**

### Applicable Patterns

#### 20\. **Subscription Management**

**What it is:** Handle recurring charges, pauses, cancellations.

**In E-commerce:**

- Subscribe to monthly box
- Skip next month
- Cancel anytime
- Price changes handled automatically

**Apply to Homebase:**

```
// This is your recurrence feature!
interface RecurringBill extends Bill {
  recurrence: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // Every N days/weeks/months
    endDate?: Date;   // Optional end
    pausedUntil?: Date; // Temporary pause
  };
  
  nextOccurrence: Date;
  history: Bill[]; // Past instances
  
  // Actions
  pause(until: Date): void;
  skipNext(): void;
  updateAmount(newAmount: number): void; // Future instances only
}
```

**Real-world example:** Stripe Subscriptions, Chargebee

---

#### 21\. **Cart Abandonment Recovery**

**What it is:** Remind users about incomplete actions.

**In E-commerce:**

- User adds items to cart, leaves site
- Email next day: "You left items in your cart!"
- Converts 15-20% of abandoned carts

**Apply to Homebase:**

```
// Incomplete bill payment recovery
interface AbandonedAction {
  action: 'started_payment' | 'viewed_bill' | 'opened_app';
  timestamp: Date;
  billId: number;
  completed: boolean;
}

// Pattern:
// - User opens bill, closes app without paying
// - Next day: "You viewed MERALCO bill yesterday. Still need to pay?"
// - Converts 'almost paid' into 'paid'
```

**Real-world example:** Shopify abandoned cart emails

---

## **Project Management (Jira, Asana)**

### Applicable Patterns

#### 22\. **Kanban Board**

**What it is:** Visual workflow with columns (To Do → In Progress → Done).

**In PM tools:**

- Drag tasks across columns
- WIP limits per column
- Visual bottleneck detection

**Apply to Homebase:**

```
// Bill payment workflow
const billKanban = {
  columns: [
    { name: 'Upcoming', bills: [...] },
    { name: 'Due Soon', bills: [...] },
    { name: 'Action Required', bills: [...] },
    { name: 'Paid', bills: [...] }
  ]
};

// Visual drag-and-drop UI
// ADHD benefit: Spatial organization easier than lists
```

**Real-world example:** Trello boards, GitHub Projects

---

#### 23\. **Sprint Planning / Time Boxing**

**What it is:** Fixed-duration work cycles with defined goals.

**In PM tools:**

- 2-week sprint
- Commit to X tasks
- Review at end

**Apply to Homebase:**

```
// "Bill week" concept
interface BillWeek {
  startDate: Date;
  endDate: Date;
  bills: Bill[];
  goal: 'Pay all bills this week';
  
  // Gamification:
  // - Monday: Plan which bills to pay
  // - Throughout week: Check off as paid
  // - Friday: Review, celebrate if 100%
}

// ADHD benefit: Creates artificial deadline urgency
```

**Real-world example:** Jira Sprints, Asana Goals

---

## **Recommended Pattern Combinations**

For **Homebase Phase 1-3**, I recommend:

### Core Patterns (Implement First)

1. **Master Data Management** (ERP) - ✅ You already have this
2. **Activity Timeline** (CRM) - Add event log to bills
3. **Recurrence Management** (E-commerce) - Your current focus
4. **Progress Tracking** (LMS) - Monthly completion dashboard
5. **Audit Trail** (VCS) - Who changed what, when

### ADHD-Optimized Patterns (Phase 2-4)

6. **Campaign Management** (CRM) - Multi-channel notification sequences
7. **Forget Risk Scoring** (CRM) - Predictive intervention
8. **Adherence Tracking** (Healthcare) - Non-judgmental progress metrics
9. **Kanban View** (PM) - Visual bill status board
10. **Template System** (Wiki) - Quick bill creation

### Advanced Patterns (Phase 5+)

11. **Document Management** (ERP) - Receipt/warranty attachments
12. **Approval Workflows** (ERP) - Spouse collaboration
13. **Scenario Planning** (VCS) - Budget what-if analysis

---

## **Anti-Patterns to Avoid**

From studying failed implementations:

❌ **Over-categorization** (Wiki anti-pattern)

- Too many folders/categories → analysis paralysis
- Keep categories flat: 5-7 max

❌ **Premature workflow complexity** (ERP anti-pattern)

- Don't build multi-step approval flows until you need them
- Start simple: Add bill → Pay bill → Done

❌ **Notification fatigue** (CRM anti-pattern)

- Sending too many reminders → user tunes out
- Quality > quantity: Only send critical alerts

❌ **Feature creep** (All domains)

- ERPs try to do everything → bloated
- Homebase: Do bills perfectly, then expand

---

## **Reading List (Actual Sources)**

If you want to dive deeper:

### Books

- **"Designing Data-Intensive Applications"** by Martin Kleppmann - Chapter 3 (Storage), Chapter 11 (Stream Processing)
- **"Enterprise Integration Patterns"** by Hohpe & Woolf - Messaging patterns applicable to notifications
- **"Domain-Driven Design"** by Eric Evans - Aggregate patterns (Organization → Residence → Bills)

### Papers

- **"The Unified Star Schema"** (Kimball) - Data warehouse patterns for reporting
- **"Event Sourcing"** (Fowler) - Audit trail pattern
- **"CQRS Pattern"** - Separate read/write models (overkill for you, but interesting)

### Open Source to Study

- **Odoo ERP** (Python) - Master data, workflows
- **ERPNext** (Python) - Simpler ERP, good patterns
- **Mautic** (PHP) - Marketing automation, campaign patterns
- **Mattermost** (Go) - Notification system architecture

---

## **TL;DR - Pattern Cheat Sheet**

| Pattern | From | Apply To | Priority |
| --- | --- | --- | --- |
| Master Data Management | ERP | Org/Residence structure | ✅ Have it |
| Activity Timeline | CRM | Bill change history | High |
| Recurrence Engine | E-commerce | Bill schedules | 🔄 Doing now |
| Urgency Scoring | CRM | Notification priority | High |
| Progress Tracking | LMS | Monthly completion | Medium |
| Templates | Wiki | Quick bill creation | Medium |
| Audit Trail | VCS | Change logging | Medium |
| Campaign Sequences | CRM | Multi-step reminders | Phase 2 |
| Document Mgmt | ERP | Receipt storage | Phase 5 |
| Approval Workflow | ERP | Spouse approval | Phase 7 |