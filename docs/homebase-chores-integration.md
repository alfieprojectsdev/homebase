# Chores System Integration into Homebase

## Strategic Analysis: Chores vs Standalone PWA

### The Core Question
Should chores be:
1. **Integrated into Homebase** (one app for everything)
2. **Separate PWA** (dedicated chores app)

### My Strong Recommendation: Integrate into Homebase

**Why:**
1. **Shared notification infrastructure** - You're building Phase 2 notifications NOW
2. **Shared architecture** - Same auth, multi-tenancy, database patterns
3. **Family context** - All household management in one place
4. **Code reuse** - Progress tracking, reminders, visual urgency
5. **Single PWA install** - One app on home screen, not two

**The insight:** Your chores plan is basically **Phase 7-8 with some Phase 2 features.**

---

## Feature Mapping: Chores → Homebase Phases

### Already Built (Phase 1)
✅ **Multi-tenant architecture** - Organizations = Families  
✅ **User roles** - Parent (admin), Member (children)  
✅ **Multi-residence support** - Can assign chores per residence  
✅ **Authentication** - JWT + httpOnly cookies  
✅ **Database patterns** - Drizzle ORM + Neon Postgres  

### Already Planned (Phase 2-4)
✅ **Mission-critical notifications** (Phase 2)  
✅ **Offline PWA** (Phase 4)  
✅ **Installable to home screen** (Phase 4)  
✅ **Service workers** (Phase 4)  

---

## Recommended Integration: Phase 7 "Household Chores"

### Why Phase 7?
**Before Phase 7 ships, you'll have:**
- ✅ Bills tracking (Phase 1)
- ✅ Web Push + SMS notifications (Phase 2)
- ✅ Weather integration (Phase 3)
- ✅ Offline PWA (Phase 4)
- ✅ Groceries + recipe gen (Phase 5)
- ✅ Multi-residence context awareness (Phase 6)

**Phase 7 becomes:** "Apply notification + progress tracking patterns to chores"

---

## Phase 7: Household Chores - Implementation Plan

### Database Schema (Add to existing)

```typescript
// src/lib/db/schema.ts - ADD THESE TABLES

export const chores = pgTable('chores', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  residenceId: integer('residence_id').references(() => residences.id, { onDelete: 'set null' }),
  
  // Core fields
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  // Assignment
  createdBy: integer('created_by').notNull().references(() => users.id),
  assignedTo: integer('assigned_to').array(), // Array of user IDs (Postgres array type)
  
  // Progress tracking
  progress: integer('progress').default(0), // 0-100
  progressUnit: varchar('progress_unit', { length: 20 }).default('percent'), // 'percent', 'steps', 'items'
  totalSteps: integer('total_steps'), // If using steps (e.g., "3 steps")
  completedSteps: integer('completed_steps').default(0),
  
  // Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: varchar('recurrence_pattern', { 
    length: 20, 
    enum: ['daily', 'weekly', 'biweekly', 'monthly'] 
  }),
  resetTime: varchar('reset_time', { length: 5 }).default('00:00'), // "00:00" for midnight
  
  // Reminder configuration (reuse notification system from Phase 2)
  reminderEnabled: boolean('reminder_enabled').default(true),
  reminderFrequency: varchar('reminder_frequency', { 
    length: 20,
    enum: ['hourly', 'every_2_hours', 'every_3_hours', 'custom'] 
  }),
  reminderCustomTimes: text('reminder_custom_times'), // JSON array: ["08:00", "15:00", "18:00"]
  activeStartHour: integer('active_start_hour').default(5), // 5 AM
  activeEndHour: integer('active_end_hour').default(21), // 9 PM
  lastReminderSentAt: timestamp('last_reminder_sent_at'),
  
  // Timestamps
  completedAt: timestamp('completed_at'),
  lastProgressUpdateAt: timestamp('last_progress_update_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Track chore history (for analytics/motivation)
export const choreHistory = pgTable('chore_history', {
  id: serial('id').primaryKey(),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  
  action: varchar('action', { 
    length: 50, 
    enum: ['created', 'progress_updated', 'completed', 'reset', 'reassigned', 'not_applicable'] 
  }).notNull(),
  previousProgress: integer('previous_progress'),
  newProgress: integer('new_progress'),
  notes: text('notes'), // For "N/A" reasons
  
  timestamp: timestamp('timestamp').defaultNow(),
});

// Feedback tracking (for "N/A for me" feature)
export const choreFeedback = pgTable('chore_feedback', {
  id: serial('id').primaryKey(),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  
  feedbackType: varchar('feedback_type', { 
    length: 50, 
    enum: ['not_applicable', 'too_difficult', 'already_done', 'other'] 
  }).notNull(),
  reason: text('reason'),
  snoozedUntil: timestamp('snoozed_until'), // Auto-snooze reminders for X hours
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Key Features Breakdown by Phase

### Phase 7A: Core Chores System (Week 1)

**What to build:**
```
✅ Chore CRUD (Create, Read, Update, Delete)
✅ Assign chores to children (one or multiple)
✅ Progress tracking (0-100% with visual progress bar)
✅ Visual progress bars (color-coded: red → yellow → green)
✅ Mark as complete (100% progress)
✅ Confetti animation on completion (use react-confetti)
✅ Daily reset for recurring chores (Vercel Cron job)
```

**Reuse from existing phases:**
- Multi-tenancy (already built)
- User roles (already built)
- Visual urgency patterns (from bills - Phase 1)
- Database patterns (Drizzle ORM)

---

### Phase 7B: Chore Notifications (Week 2)

**What to build:**
```
✅ Integrate with Phase 2 notification system
✅ Reminder frequency configuration (hourly, every 2hrs, every 3hrs, custom)
✅ Active hours enforcement (5 AM - 9 PM)
✅ Push notification with action buttons:
   - "Update Progress" (+25% quick action)
   - "Mark 100% Done"
   - "N/A for me"
   - "Later" (dismiss)
✅ Handle notification click → open specific chore
```

**Reuse from Phase 2:**
- Web Push notification infrastructure
- Service worker setup
- Notification permission flow
- Push subscription management

---

### Phase 7C: Advanced Features (Week 3)

**What to build:**
```
✅ "N/A for me" feedback tracking
✅ Parent dashboard to review feedback
✅ Chore history (who did what, when)
✅ Streak tracking (motivational gamification)
✅ Weekly/monthly completion charts
✅ Household leaderboard (optional, configurable)
```

---

## Critical Design Decisions

### 1. Progress Tracking: Two Modes

**Mode A: Percentage (0-100%)**
- Best for: Cleaning, organizing, general chores
- UI: Slider or +25% increment buttons
- Example: "Clean your room" (25% = picked up clothes, 50% = made bed, etc.)

**Mode B: Step-by-Step**
- Best for: Multi-step chores, child with ASD (12yo)
- UI: Checklist with steps
- Example: "Water plants" → Step 1: Fill watering can ✓, Step 2: Water indoor plants ✓, Step 3: Water balcony plants ✓
- Progress auto-calculated: 2/3 steps = 67%

**Recommendation:** Support BOTH, configurable per chore.

```typescript
// Schema addition
choreType: varchar('chore_type', { 
  length: 20, 
  enum: ['percentage', 'steps'] 
}).default('percentage'),

// For step-based chores
steps: text('steps'), // JSON array: ["Fill watering can", "Water indoor plants", "Water balcony"]
completedSteps: integer('completed_steps').default(0),
```

---

### 2. Visual Progress Bar Component

**Reuse urgency color system from bills:**

```tsx
// src/components/chores/ProgressBar.tsx

interface ProgressBarProps {
  progress: number; // 0-100
  choreTitle: string;
}

export default function ProgressBar({ progress, choreTitle }: ProgressBarProps) {
  const getColorClass = () => {
    if (progress === 100) return 'bg-green-600';
    if (progress >= 70) return 'bg-green-400';
    if (progress >= 30) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    return progress >= 30 ? 'text-gray-800' : 'text-white';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{choreTitle}</span>
        <span className="text-sm font-semibold">{progress}%</span>
      </div>
      <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass()} transition-all duration-500 flex items-center justify-center ${getTextColor()}`}
          style={{ width: `${progress}%` }}
        >
          {progress > 20 && (
            <span className="text-xs font-bold">{progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Confetti Animation (Completion Celebration)

**Use existing React ecosystem:**

```tsx
// src/components/chores/ChoreCard.tsx

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function ChoreCard({ chore }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (chore.progress === 100 && !chore.previousProgress !== 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [chore.progress]);

  return (
    <div className="relative">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      {/* Chore card content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

---

### 4. Daily Reset (Reuse Bill Recurrence Pattern)

**Vercel Cron Job:**

```typescript
// src/app/api/chores/reset-daily/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find chores due for reset (recurring, completed, reset time matches)
    const choresToReset = await db
      .select()
      .from(chores)
      .where(
        and(
          eq(chores.isRecurring, true),
          eq(chores.progress, 100),
          eq(chores.resetTime, currentTime)
        )
      );

    // Reset each chore
    for (const chore of choresToReset) {
      await db
        .update(chores)
        .set({
          progress: 0,
          completedSteps: 0,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(chores.id, chore.id));

      // Log to history
      await db.insert(choreHistory).values({
        choreId: chore.id,
        userId: chore.createdBy,
        orgId: chore.orgId,
        action: 'reset',
        previousProgress: 100,
        newProgress: 0,
      });
    }

    return NextResponse.json({
      success: true,
      resetCount: choresToReset.length,
    });
  } catch (error) {
    console.error('Daily reset error:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
```

**Vercel cron config:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/chores/reset-daily",
      "schedule": "0 * * * *" // Run every hour at :00 (checks resetTime)
    }
  ]
}
```

---

### 5. Notification Actions (Reuse Phase 2 Infrastructure)

**Service Worker (extends Phase 2):**

```javascript
// public/firebase-messaging-sw.js (or equivalent)

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { choreId, currentProgress, action } = event.notification.data;

  if (action === 'update_25') {
    // Open app with URL params to auto-increment
    event.waitUntil(
      clients.openWindow(`/chores/${choreId}?action=add_progress&value=25`)
    );
  } else if (action === 'mark_done') {
    event.waitUntil(
      clients.openWindow(`/chores/${choreId}?action=mark_done`)
    );
  } else if (action === 'not_applicable') {
    // Log feedback, snooze reminders
    event.waitUntil(
      fetch(`/api/chores/${choreId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedbackType: 'not_applicable',
          snoozedUntil: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours
        }),
      })
    );
  } else {
    // Default: open chores dashboard
    event.waitUntil(clients.openWindow('/chores'));
  }
});
```

---

## Age-Appropriate UI Considerations

### 9-Year-Old (Old Android Phone)
**Design priorities:**
- ✅ **Large touch targets** (48px minimum, already in your system)
- ✅ **Simple +25% increment buttons** (easier than slider)
- ✅ **Bright, clear colors** (red/yellow/green progress)
- ✅ **Big emoji indicators** (✅ for done, ⏰ for pending)
- ✅ **Confetti reward** (instant dopamine hit)

**UI Example:**
```
┌─────────────────────────────────────┐
│  🧹 Clean Your Room                 │
│  ▓▓▓▓▓░░░░░░░░  50%                 │
│                                      │
│  [ +25% ]  [ +25% ]  [ Done ✓ ]    │
└─────────────────────────────────────┘
```

### 12-Year-Old with ASD (iPad)
**Design priorities:**
- ✅ **Step-by-step checklists** (structured, predictable)
- ✅ **Clear visual feedback** (checkmarks, progress updates)
- ✅ **No ambiguity** ("50% done" vs "half done")
- ✅ **Consistent patterns** (same UI for all chores)
- ✅ **Larger screen = more detail** (show all steps at once)

**UI Example:**
```
┌─────────────────────────────────────┐
│  💧 Water the Plants                │
│  Progress: 2/3 steps (67%)          │
│                                      │
│  ✅ 1. Fill watering can             │
│  ✅ 2. Water indoor plants           │
│  ⬜ 3. Water balcony plants          │
│                                      │
│  [ Next Step → ]                    │
└─────────────────────────────────────┘
```

### 16-Year-Old (Old Android + MacBook)
**Design priorities:**
- ✅ **Quick interactions** (minimal clicks)
- ✅ **Text input option** (can type specific progress notes)
- ✅ **Desktop optimization** (keyboard shortcuts)
- ✅ **Mature design** (less "kiddy" than siblings' UI)
- ✅ **Detailed history** (see completion streaks)

**UI Example:**
```
┌─────────────────────────────────────┐
│  📚 Organize Study Desk              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░  85%               │
│                                      │
│  Progress: [85%] [+5] [Done]        │
│  Note: "Sorted textbooks, need to   │
│         organize drawer tomorrow"    │
│  Streak: 12 days 🔥                  │
└─────────────────────────────────────┘
```

---

## Integration Timeline

### Month 4 (After Phase 6)

**Week 1: Phase 7A - Core System**
```
Mon-Tue: Database schema + API routes
Wed-Thu: Chore CRUD UI + progress tracking
Fri: Daily reset cron job + testing
Weekend: Polish + family testing
```

**Week 2: Phase 7B - Notifications**
```
Mon-Tue: Extend Phase 2 notifications for chores
Wed-Thu: Action buttons + "N/A" handling
Fri: Test notification flow end-to-end
Weekend: Deploy + real-world testing
```

**Week 3: Phase 7C - Enhancements**
```
Mon-Tue: History tracking + feedback UI
Wed-Thu: Streak tracking + charts
Fri: Parent review dashboard
Weekend: Final polish
```

---

## Why NOT Build as Separate PWA

**Your original plan suggests a standalone chores PWA. Here's why integration is better:**

### ❌ Separate PWA Downsides
1. **Duplicate infrastructure** - Auth, database, notifications all rebuilt
2. **Split data** - Bills in one app, chores in another (context loss)
3. **Multiple installs** - Family manages 2 home screen icons
4. **Different tech stacks** - Firebase (chores PWA) vs Neon/Drizzle (Homebase)
5. **Maintenance burden** - Two codebases to update, deploy, debug

### ✅ Homebase Integration Benefits
1. **Shared notification system** - Already building in Phase 2
2. **Unified family context** - See bills + chores in one dashboard
3. **Single PWA** - One install, one login, one app
4. **Code reuse** - Progress bars, reminders, visual urgency
5. **Faster development** - Phase 7 takes 3 weeks vs 6+ weeks standalone

---

## Cost Comparison

### Separate Firebase PWA
```
Firebase pricing:
- Firestore: ~$5/month (10K+ writes for notifications)
- Cloud Functions: ~$3/month (reminder cron jobs)
- FCM: Free
Total: ~$8/month + development time (6-8 weeks)
```

### Homebase Integration (Phase 7)
```
Neon Postgres: Already paying
Vercel: Already paying (cron included)
Additional cost: $0/month
Development time: 3 weeks (reuses infrastructure)
```

**Savings:** $8/month + 3-5 weeks faster delivery ✅

---

## Recommended Action Plan

### Option A: Full Integration (RECOMMENDED)
```
✅ Now: Finish Phase 1 password reset
✅ Week 1-2: Phase 2 (notifications)
✅ Week 3-4: Phase 3 (weather)
✅ Week 5-6: Phase 4 (offline PWA)
✅ Month 2-3: Phase 5-6 (groceries + recipes + multi-residence)
✅ Month 4: Phase 7 (chores) ← INSERT HERE
```

### Option B: Quick Prototype (Phase 1.9)
```
Build minimal chores NOW (1 week):
- Basic chore CRUD
- Simple progress tracking
- No notifications yet
- Prove the concept
Then:
- Refine in Phase 7 with full notifications
```

---

## Summary & Recommendation

### ✅ YES - Integrate chores into Homebase as Phase 7

**Why:**
1. **Architecture alignment** - Reuses 90% of Phase 1-6 infrastructure
2. **Notification reuse** - Phase 2 system handles chore reminders
3. **Family context** - Bills + chores + groceries in one place
4. **Cost efficiency** - $0 extra monthly cost
5. **Faster delivery** - 3 weeks vs 6+ weeks standalone
6. **Better UX** - One PWA, one login, unified experience

**When:**
- **Phase 7 (Month 4)** - After groceries + multi-residence
- Builds on: Phase 2 notifications + Phase 4 offline PWA
- Timeline: 3 weeks (7A: core, 7B: notifications, 7C: enhancements)

**Tech Stack (Same as Homebase):**
- Next.js 14 + React
- Neon Postgres + Drizzle ORM
- Vercel deployment
- Web Push API (Phase 2)
- react-confetti for celebrations

**Alternative:**
- Build Phase 1.9 prototype (1 week) to test chores UI
- Full implementation in Phase 7 (Month 4)

---

## Next Question

Do you want me to:
1. **Generate Phase 7 database schema** (copy-paste ready)?
2. **Create chore progress bar component** (with age-appropriate variants)?
3. **Design notification action handlers** (reusing Phase 2 infrastructure)?
4. **Stay focused on Phase 2** (notifications - your current priority)?

What feels right? 🏠✨
