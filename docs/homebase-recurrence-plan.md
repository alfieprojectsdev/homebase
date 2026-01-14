# Homebase Bill Recurrence - Implementation Plan

## Current Situation

✅ **What's Working:**
- Phase 1 foundation complete (auth, bills CRUD, multi-tenancy)
- Visual urgency system functioning
- Database schema has recurrence fields but they're unused

❌ **Critical Gap:**
- Users must manually re-enter same bills every month
- PELCO, MERALCO, PLDT bills repeat monthly but require manual recreation
- Immediate friction point affecting adoption

## Implementation Strategy

We'll implement **both** the quick fix AND the full system:

### Phase 1.5A: Quick Win (Today - 30 minutes)
Add a "🔄 Duplicate for Next Month" button to existing bills

### Phase 1.5B: Full Recurrence (This Week - 2-3 hours)
Implement auto-recurring bills with proper UI/logic

---

## Phase 1.5A: Quick Duplicate Button

### Files to Modify

#### 1. Update Bills List Page
**File:** `src/app/(dashboard)/bills/page.tsx`

**Add duplicate handler:**
```typescript
const handleDuplicate = async (bill: Bill) => {
  try {
    // Calculate next month's due date
    const currentDue = new Date(bill.dueDate);
    const nextDue = new Date(currentDue);
    nextDue.setMonth(nextDue.getMonth() + 1);
    
    const response = await fetch('/api/bills', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: bill.name,
        amount: bill.amount,
        dueDate: nextDue.toISOString(),
        residenceId: bill.residenceId,
      }),
    });

    if (!response.ok) throw new Error('Failed to duplicate bill');
    
    alert(`✓ Created ${bill.name} for ${nextDue.toLocaleDateString()}`);
    fetchBills();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to duplicate bill');
  }
};
```

**Add button to bill card (after "Mark as Paid"):**
```tsx
<button
  onClick={() => handleDuplicate(bill)}
  className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
  style={{ minHeight: '44px' }}
>
  🔄 Next Month
</button>
```

---

## Phase 1.5B: Full Recurrence System

### Database Schema Updates

#### 1. Add Recurrence Fields
**File:** `src/lib/db/schema.ts`

**Add to `financialObligations` table:**
```typescript
export const financialObligations = pgTable('financial_obligations', {
  // ... existing fields ...
  
  // NEW: Recurrence fields
  recurrenceEnabled: boolean('recurrence_enabled').default(false),
  recurrenceFrequency: varchar('recurrence_frequency', { 
    length: 20, 
    enum: ['monthly', 'quarterly', 'biannual', 'annual'] 
  }),
  recurrenceInterval: integer('recurrence_interval').default(1),
  recurrenceDayOfMonth: integer('recurrence_day_of_month'), // 1-31
  parentBillId: integer('parent_bill_id').references(() => financialObligations.id),
});
```

**Run migration:**
```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### New Utility Functions

#### 2. Recurrence Logic Utilities
**File:** `src/lib/utils/recurrence.ts` (CREATE NEW)

```typescript
export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual';

export function calculateNextDueDate(
  currentDueDate: Date,
  frequency: RecurrenceFrequency,
  interval: number = 1,
  dayOfMonth?: number
): Date {
  const next = new Date(currentDueDate);
  
  switch (frequency) {
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * interval));
      break;
    case 'biannual':
      next.setMonth(next.getMonth() + (6 * interval));
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }
  
  // Handle specific day of month (e.g., always on 15th)
  if (dayOfMonth) {
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(dayOfMonth, maxDay));
  }
  
  return next;
}

export function getRecurrenceLabel(
  frequency: RecurrenceFrequency,
  interval: number = 1
): string {
  const freq = interval === 1 ? frequency : `${interval} ${frequency}`;
  return `Repeats ${freq}`;
}
```

### UI Components

#### 3. Recurrence Selector Component
**File:** `src/components/RecurrenceSelector.tsx` (CREATE NEW)

```tsx
'use client';

import { useState } from 'react';

interface RecurrenceSelectorProps {
  enabled: boolean;
  frequency: string;
  interval: number;
  dayOfMonth?: number;
  onUpdate: (config: {
    enabled: boolean;
    frequency: string;
    interval: number;
    dayOfMonth?: number;
  }) => void;
}

export default function RecurrenceSelector({
  enabled,
  frequency,
  interval,
  dayOfMonth,
  onUpdate,
}: RecurrenceSelectorProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [freq, setFreq] = useState(frequency || 'monthly');
  const [int, setInt] = useState(interval || 1);
  const [day, setDay] = useState(dayOfMonth);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    onUpdate({
      enabled: checked,
      frequency: freq,
      interval: int,
      dayOfMonth: day,
    });
  };

  const handleChange = () => {
    onUpdate({
      enabled: isEnabled,
      frequency: freq,
      interval: int,
      dayOfMonth: day,
    });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-300 rounded-md bg-gray-50">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recurrence-enabled"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-5 h-5"
        />
        <label htmlFor="recurrence-enabled" className="text-lg font-medium">
          🔄 Make this a recurring bill
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-3 pl-7">
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select
              value={freq}
              onChange={(e) => {
                setFreq(e.target.value);
                handleChange();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (every 3 months)</option>
              <option value="biannual">Biannual (every 6 months)</option>
              <option value="annual">Annual (yearly)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Repeat every
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={int}
              onChange={(e) => {
                setInt(parseInt(e.target.value));
                handleChange();
              }}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md"
            />
            <span className="ml-2 text-sm text-gray-600">
              {freq === 'monthly' && int > 1 ? 'months' : freq}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Day of month (optional)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={day || ''}
              onChange={(e) => {
                setDay(e.target.value ? parseInt(e.target.value) : undefined);
                handleChange();
              }}
              placeholder="e.g., 15 for 15th of each month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the same day as the due date
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### API Route Updates

#### 4. Update Bill Creation to Support Recurrence
**File:** `src/app/api/bills/route.ts`

**Update POST handler:**
```typescript
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      name, amount, dueDate, residenceId,
      recurrenceEnabled, recurrenceFrequency, 
      recurrenceInterval, recurrenceDayOfMonth 
    } = body;

    // ... existing validations ...

    const [bill] = await db
      .insert(financialObligations)
      .values({
        orgId: authUser.orgId,
        residenceId: residenceId ? parseInt(residenceId) : null,
        name,
        amount: amount.toString(),
        dueDate: new Date(dueDate),
        status: 'pending',
        
        // NEW: Recurrence fields
        recurrenceEnabled: recurrenceEnabled || false,
        recurrenceFrequency: recurrenceEnabled ? recurrenceFrequency : null,
        recurrenceInterval: recurrenceEnabled ? (recurrenceInterval || 1) : null,
        recurrenceDayOfMonth: recurrenceEnabled ? recurrenceDayOfMonth : null,
      })
      .returning();

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Create bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 5. Update Pay Bill to Auto-Create Next Occurrence
**File:** `src/app/api/bills/[id]/pay/route.ts`

**Replace POST handler:**
```typescript
import { calculateNextDueDate } from '@/lib/utils/recurrence';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the bill first to check recurrence
    const [currentBill] = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!currentBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Mark current bill as paid
    const [paidBill] = await db
      .update(financialObligations)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .returning();

    let nextBill = null;

    // If recurring, create next occurrence
    if (currentBill.recurrenceEnabled && currentBill.recurrenceFrequency) {
      const nextDueDate = calculateNextDueDate(
        new Date(currentBill.dueDate),
        currentBill.recurrenceFrequency as RecurrenceFrequency,
        currentBill.recurrenceInterval || 1,
        currentBill.recurrenceDayOfMonth || undefined
      );

      [nextBill] = await db
        .insert(financialObligations)
        .values({
          orgId: currentBill.orgId,
          residenceId: currentBill.residenceId,
          name: currentBill.name,
          amount: currentBill.amount,
          dueDate: nextDueDate,
          status: 'pending',
          recurrenceEnabled: true,
          recurrenceFrequency: currentBill.recurrenceFrequency,
          recurrenceInterval: currentBill.recurrenceInterval,
          recurrenceDayOfMonth: currentBill.recurrenceDayOfMonth,
          parentBillId: currentBill.id,
        })
        .returning();
    }

    return NextResponse.json({ 
      bill: paidBill,
      nextBill,
      message: nextBill 
        ? `✓ Paid and created next occurrence for ${nextDueDate.toLocaleDateString()}`
        : '✓ Bill marked as paid'
    });
  } catch (error) {
    console.error('Pay bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Update Forms

#### 6. Add Recurrence to New Bill Form
**File:** `src/app/(dashboard)/bills/new/page.tsx`

**Import component:**
```typescript
import RecurrenceSelector from '@/components/RecurrenceSelector';
```

**Add state:**
```typescript
const [recurrence, setRecurrence] = useState({
  enabled: false,
  frequency: 'monthly',
  interval: 1,
  dayOfMonth: undefined,
});
```

**Update form submission:**
```typescript
body: JSON.stringify({
  ...formData,
  recurrenceEnabled: recurrence.enabled,
  recurrenceFrequency: recurrence.frequency,
  recurrenceInterval: recurrence.interval,
  recurrenceDayOfMonth: recurrence.dayOfMonth,
}),
```

**Add component to form (before buttons):**
```tsx
<RecurrenceSelector
  enabled={recurrence.enabled}
  frequency={recurrence.frequency}
  interval={recurrence.interval}
  dayOfMonth={recurrence.dayOfMonth}
  onUpdate={setRecurrence}
/>
```

#### 7. Show Recurrence Indicator in Bills List
**File:** `src/app/(dashboard)/bills/page.tsx`

**Add recurrence icon to bill card:**
```tsx
{bill.recurrenceEnabled && (
  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
    🔄 Recurring
  </span>
)}
```

---

## Testing Checklist

### Phase 1.5A Testing
- [ ] Add a bill (MERALCO)
- [ ] Click "🔄 Next Month" button
- [ ] Verify new bill created with next month's date
- [ ] Verify original bill unchanged

### Phase 1.5B Testing
- [ ] Create new bill with recurrence enabled (monthly)
- [ ] Mark as paid
- [ ] Verify next month's bill auto-created
- [ ] Verify recurrence settings copied
- [ ] Test quarterly recurrence
- [ ] Test day-of-month override (always on 15th)
- [ ] Test edge case: Feb 31 → Feb 28/29
- [ ] Edit recurring bill, disable recurrence
- [ ] Verify no new bills created after that

---

## Success Criteria

✅ Phase 1.5 Complete When:
- [ ] Can mark PELCO as recurring (monthly)
- [ ] Paying PELCO auto-creates next month's PELCO
- [ ] Can see 🔄 indicator on recurring bills
- [ ] Can disable/edit recurrence settings
- [ ] No duplicate bills created
- [ ] Works for monthly, quarterly, annual bills

---

## Next Steps After 1.5

Once recurrence works, proceed to:
1. **Phase 2:** Mission-critical notifications (web push + SMS)
2. **Phase 3:** Weather integration for PELCO hard-deadline warnings
3. **Phase 4:** Offline PWA with background sync

---

## Estimated Timeline

- **Phase 1.5A (Quick Duplicate):** 30 minutes
- **Phase 1.5B (Full Recurrence):** 2-3 hours
- **Testing:** 30 minutes
- **Total:** Half day of focused work

Let's ship this! 🚀
