# Implementation Plan: Chores System Integration (Phase 7)

**Document:** CHORE-plan.md
**Date:** January 12, 2026
**Status:** Planning Phase (No code modifications)
**Implementation Timeline:** 3 weeks (Month 4, after Phase 6)

---

## Overview

This plan details the implementation of the Chores System as **Phase 7** of the Homebase project. The chores system will be fully integrated into Homebase, reusing existing infrastructure (auth, multi-tenancy, notifications, database patterns) rather than building a separate PWA.

**Core Philosophy:** Reuse 90% of existing infrastructure, focus 10% on chore-specific features.

**Strategic Decision:** Integration over standalone PWA based on:
- Shared notification infrastructure (Phase 2)
- Unified family context (bills + chores in one app)
- Cost efficiency ($0 additional monthly cost)
- Faster delivery (3 weeks vs 6+ weeks standalone)

---

## Phase 7A: Core Chores System (Week 1)

### 1.1 Database Schema

**Purpose:** Add chore-related tables to existing Homebase schema

**Implementation Details:**

**File:** `src/lib/db/schema.ts` (MODIFY)
```typescript
// ==================== CHORES SYSTEM ====================

// Main chores table
export const chores = pgTable('chores', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  residenceId: integer('residence_id').references(() => residences.id, { onDelete: 'set null' }),

  // Core fields
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // Assignment
  createdBy: integer('created_by').notNull().references(() => users.id),
  assignedTo: integer('assigned_to').array(), // Array of user IDs (Postgres array)

  // Progress tracking
  progress: integer('progress').default(0), // 0-100
  progressUnit: varchar('progress_unit', { length: 20 }).default('percent'), // 'percent', 'steps'
  totalSteps: integer('total_steps'), // If using steps
  completedSteps: integer('completed_steps').default(0),

  // Step-based chore details
  steps: text('steps'), // JSON array: ["Fill watering can", "Water indoor plants", "Water balcony"]

  // Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: varchar('recurrence_pattern', {
    length: 20,
    enum: ['daily', 'weekly', 'biweekly', 'monthly']
  }),
  resetTime: varchar('reset_time', { length: 5 }).default('00:00'), // "00:00" for midnight

  // Reminder configuration
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

// Streak tracking (motivational gamification)
export const choreStreaks = pgTable('chore_streaks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),

  currentStreak: integer('current_streak').default(0), // Consecutive days completed
  longestStreak: integer('longest_streak').default(0),
  lastCompletedAt: timestamp('last_completed_at'),

  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Migration:**
```bash
npx drizzle-kit generate:pg  # Generate migration
npx drizzle-kit push:pg      # Apply to database
```

**Multi-tenancy Requirement:**
- All tables include `org_id` for row-level security
- Queries MUST filter by `WHERE org_id = <user_org_id>`
- Never expose data across organizations

---

### 1.2 Chores API Routes

**Purpose:** CRUD operations for chores with progress tracking

**Implementation Details:**

**File:** `src/app/api/chores/route.ts` (NEW)
```typescript
// GET /api/chores - List all chores for user's organization
// POST /api/chores - Create new chore

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores } from '@/lib/db/schema';
import { authHeaders } from '@/lib/auth/headers';
import { eq, and, desc } from 'drizzle-orm';

// GET - List chores
export async function GET(request: NextRequest) {
  const { userId, orgId } = await authHeaders(request);

  const allChores = await db
    .select()
    .from(chores)
    .where(eq(chores.orgId, orgId))
    .orderBy(desc(chores.createdAt));

  return NextResponse.json({ chores: allChores });
}

// POST - Create chore
export async function POST(request: NextRequest) {
  const { userId, orgId } = await authHeaders(request);
  const body = await request.json();

  const newChore = await db.insert(chores).values({
    ...body,
    orgId,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Log to history
  await db.insert(choreHistory).values({
    choreId: newChore[0].id,
    userId,
    orgId,
    action: 'created',
    previousProgress: 0,
    newProgress: 0,
  });

  return NextResponse.json({ chore: newChore[0] });
}
```

**File:** `src/app/api/chores/[id]/route.ts` (NEW)
```typescript
// GET /api/chores/[id] - Get single chore
// PATCH /api/chores/[id] - Update chore
// DELETE /api/chores/[id] - Delete chore

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
import { authHeaders } from '@/lib/auth/headers';
import { eq, and } from 'drizzle-orm';

// GET - Single chore
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId, orgId } = await authHeaders(request);

  const chore = await db
    .select()
    .from(chores)
    .where(and(
      eq(chores.id, parseInt(params.id)),
      eq(chores.orgId, orgId)
    ))
    .limit(1);

  if (!chore.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ chore: chore[0] });
}

// PATCH - Update chore (including progress)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId, orgId } = await authHeaders(request);
  const body = await request.json();

  // Get current chore
  const current = await db
    .select()
    .from(chores)
    .where(and(
      eq(chores.id, parseInt(params.id)),
      eq(chores.orgId, orgId)
    ))
    .limit(1);

  if (!current.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const previousProgress = current[0].progress;

  // Update chore
  const updated = await db
    .update(chores)
    .set({
      ...body,
      updatedAt: new Date(),
      lastProgressUpdateAt: new Date(),
      completedAt: body.progress === 100 ? new Date() : null,
    })
    .where(and(
      eq(chores.id, parseInt(params.id)),
      eq(chores.orgId, orgId)
    ))
    .returning();

  // Log to history
  await db.insert(choreHistory).values({
    choreId: parseInt(params.id),
    userId,
    orgId,
    action: body.progress === 100 ? 'completed' : 'progress_updated',
    previousProgress,
    newProgress: body.progress,
  });

  // Update streak if completed
  if (body.progress === 100) {
    await updateStreak(parseInt(params.id), userId, orgId);
  }

  return NextResponse.json({ chore: updated[0] });
}

// DELETE - Delete chore
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId, orgId } = await authHeaders(request);

  await db
    .delete(chores)
    .where(and(
      eq(chores.id, parseInt(params.id)),
      eq(chores.orgId, orgId)
    ));

  return NextResponse.json({ success: true });
}
```

**Multi-tenancy Requirement:**
- All routes verify JWT via `authHeaders`
- Extract `userId` and `orgId` from verified token
- All queries include `WHERE org_id = <org_id>`
- Returns 404 if chore doesn't belong to user's org

---

### 1.3 Progress Bar Component

**Purpose:** Visual progress tracking with color-coded urgency (reuses bills pattern)

**Implementation Details:**

**File:** `src/components/chores/ProgressBar.tsx` (NEW)
```typescript
interface ProgressBarProps {
  progress: number; // 0-100
  choreTitle: string;
  showPercentage?: boolean;
}

export default function ProgressBar({ progress, choreTitle, showPercentage = true }: ProgressBarProps) {
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
        {showPercentage && (
          <span className="text-sm font-semibold">{progress}%</span>
        )}
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

**ADHD Optimization:**
- High contrast colors (red/yellow/green)
- Large touch targets (44px minimum)
- Clear visual feedback (percentage inside bar)
- Instant response to updates (500ms transition)

---

### 1.4 Chore Card Component (with Confetti)

**Purpose:** Display chore with progress and celebrate completion

**Implementation Details:**

**File:** `src/components/chores/ChoreCard.tsx` (NEW)
```typescript
'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import ProgressBar from './ProgressBar';

interface ChoreCardProps {
  chore: {
    id: number;
    title: string;
    description?: string;
    progress: number;
    totalSteps?: number;
    completedSteps?: number;
    steps?: string[];
  };
  onProgressUpdate: (id: number, progress: number) => void;
  previousProgress?: number;
}

export default function ChoreCard({ chore, onProgressUpdate, previousProgress }: ChoreCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    // Trigger confetti when progress reaches 100%
    if (chore.progress === 100 && previousProgress !== 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [chore.progress, previousProgress]);

  const handleIncrement = (increment: number) => {
    const newProgress = Math.min(100, chore.progress + increment);
    onProgressUpdate(chore.id, newProgress);
  };

  const handleMarkDone = () => {
    onProgressUpdate(chore.id, 100);
  };

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

      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-bold mb-2">{chore.title}</h3>
        {chore.description && (
          <p className="text-gray-600 mb-4">{chore.description}</p>
        )}

        <ProgressBar progress={chore.progress} choreTitle={chore.title} />

        {/* Step-based display */}
        {chore.steps && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Steps: {chore.completedSteps || 0}/{chore.totalSteps || chore.steps.length}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {chore.steps.map((step, index) => (
                <li
                  key={index}
                  className={
                    index < (chore.completedSteps || 0)
                      ? 'text-green-600 line-through'
                      : 'text-gray-700'
                  }
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleIncrement(25)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 text-sm font-medium min-h-[44px]"
          >
            +25%
          </button>
          <button
            onClick={() => handleIncrement(25)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 text-sm font-medium min-h-[44px]"
          >
            +25%
          </button>
          <button
            onClick={handleMarkDone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 text-sm font-medium min-h-[44px]"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Dependencies:**
```bash
npm install react-confetti react-use
```

**ADHD Optimization:**
- Instant confetti reward on completion (dopamine hit)
- Large touch targets (44px minimum)
- Clear visual hierarchy (title → progress → actions)
- Immediate feedback on button press

---

### 1.5 Chores Dashboard Page

**Purpose:** Main chores listing with filtering and sorting

**Implementation Details:**

**File:** `src/app/(dashboard)/chores/page.tsx` (NEW)
```typescript
'use client';

import { useEffect, useState } from 'react';
import ChoreCard from '@/components/chores/ChoreCard';

export default function ChoresPage() {
  const [chores, setChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      const response = await fetch('/api/chores');
      const data = await response.json();
      setChores(data.chores);
    } catch (error) {
      console.error('Failed to fetch chores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (id: number, progress: number) => {
    try {
      const response = await fetch(`/api/chores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      const data = await response.json();
      setChores(chores.map(c => c.id === id ? data.chore : c));
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const filteredChores = chores.filter(chore => {
    if (filter === 'pending') return chore.progress < 100;
    if (filter === 'completed') return chore.progress === 100;
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center">Loading chores...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🧹 Chores</h1>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">
          + Add Chore
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium capitalize min-h-[44px] ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Chores list */}
      <div className="space-y-4">
        {filteredChores.map(chore => (
          <ChoreCard
            key={chore.id}
            chore={chore}
            onProgressUpdate={handleProgressUpdate}
            previousProgress={undefined} // Track in parent state if needed
          />
        ))}
      </div>

      {filteredChores.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No chores found. Add your first chore to get started!
        </div>
      )}
    </div>
  );
}
```

---

### 1.6 Create/Edit Chore Page

**Purpose:** Form for creating and editing chores

**Implementation Details:**

**File:** `src/app/(dashboard)/chores/new/page.tsx` (NEW)
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewChorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [] as number[],
    isRecurring: false,
    recurrencePattern: 'daily' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    resetTime: '00:00',
    reminderEnabled: true,
    reminderFrequency: 'hourly' as 'hourly' | 'every_2_hours' | 'every_3_hours' | 'custom',
    reminderCustomTimes: '',
    progressUnit: 'percent' as 'percent' | 'steps',
    steps: '',
    totalSteps: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reminderCustomTimes: formData.reminderCustomTimes ? JSON.parse(formData.reminderCustomTimes) : null,
          steps: formData.steps ? JSON.parse(formData.steps) : null,
        }),
      });

      if (response.ok) {
        router.push('/chores');
      }
    } catch (error) {
      console.error('Failed to create chore:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Chore</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg min-h-[44px]"
            placeholder="e.g., Clean your room"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg min-h-[120px]"
            rows={4}
            placeholder="Optional details about this chore"
          />
        </div>

        {/* Progress Unit */}
        <div>
          <label className="block text-sm font-medium mb-2">Progress Tracking</label>
          <select
            value={formData.progressUnit}
            onChange={(e) => setFormData({ ...formData, progressUnit: e.target.value as any })}
            className="w-full px-4 py-3 border rounded-lg min-h-[44px]"
          >
            <option value="percent">Percentage (0-100%)</option>
            <option value="steps">Step-by-step checklist</option>
          </select>
        </div>

        {/* Steps (if step-based) */}
        {formData.progressUnit === 'steps' && (
          <div>
            <label className="block text-sm font-medium mb-2">Steps (JSON array)</label>
            <textarea
              value={formData.steps}
              onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg min-h-[120px]"
              rows={4}
              placeholder='["Step 1", "Step 2", "Step 3"]'
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter as JSON array: ["Step 1", "Step 2", "Step 3"]
            </p>
          </div>
        )}

        {/* Recurrence */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="w-5 h-5"
          />
          <label htmlFor="isRecurring" className="text-sm font-medium">
            Recurring chore
          </label>
        </div>

        {formData.isRecurring && (
          <div className="ml-8 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pattern</label>
              <select
                value={formData.recurrencePattern}
                onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as any })}
                className="w-full px-4 py-3 border rounded-lg min-h-[44px]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reset Time (24h format)</label>
              <input
                type="time"
                value={formData.resetTime}
                onChange={(e) => setFormData({ ...formData, resetTime: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg min-h-[44px]"
              />
            </div>
          </div>
        )}

        {/* Reminders */}
        <div>
          <label className="block text-sm font-medium mb-2">Reminder Frequency</label>
          <select
            value={formData.reminderFrequency}
            onChange={(e) => setFormData({ ...formData, reminderFrequency: e.target.value as any })}
            className="w-full px-4 py-3 border rounded-lg min-h-[44px]"
          >
            <option value="hourly">Every hour</option>
            <option value="every_2_hours">Every 2 hours</option>
            <option value="every_3_hours">Every 3 hours</option>
            <option value="custom">Custom times</option>
          </select>
        </div>

        {formData.reminderFrequency === 'custom' && (
          <div>
            <label className="block text-sm font-medium mb-2">Custom Times (JSON array)</label>
            <textarea
              value={formData.reminderCustomTimes}
              onChange={(e) => setFormData({ ...formData, reminderCustomTimes: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg min-h-[120px]"
              rows={4}
              placeholder='["08:00", "12:00", "18:00"]'
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter as JSON array: ["08:00", "12:00", "18:00"]
            </p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 min-h-[44px]"
          >
            {loading ? 'Creating...' : 'Create Chore'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### 1.7 Daily Reset Cron Job

**Purpose:** Reset recurring chores daily (reuses bill recurrence pattern)

**Implementation Details:**

**File:** `src/app/api/chores/reset-daily/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
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

**Vercel Cron Configuration:**
**File:** `vercel.json` (MODIFY)
```json
{
  "crons": [
    {
      "path": "/api/chores/reset-daily",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Environment Variable:**
```bash
# .env.production
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

---

## Phase 7B: Chore Notifications (Week 2)

### 2.1 Notification Extension (Phase 2 Integration)

**Purpose:** Extend Phase 2 notification system to handle chore reminders

**Implementation Details:**

**File:** `src/lib/notifications/chores.ts` (NEW)
```typescript
import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';

interface ChoreNotificationContext {
  userId: number;
  orgId: number;
}

export async function sendChoreReminders(context: ChoreNotificationContext) {
  const now = new Date();
  const currentHour = now.getHours();

  // Find chores needing reminders
  const choresNeedingReminder = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.orgId, context.orgId),
        eq(chores.reminderEnabled, true),
        lt(chores.progress, 100), // Not completed
        // Active hours check
        // Last reminder check
      )
    );

  for (const chore of choresNeedingReminder) {
    // Check if within active hours
    if (currentHour < chore.activeStartHour || currentHour >= chore.activeEndHour) {
      continue;
    }

    // Check if reminder due based on frequency
    const shouldSend = await shouldSendReminder(chore, now);

    if (shouldSend) {
      await sendChoreNotification(chore, context.userId);

      // Update last reminder time
      await db
        .update(chores)
        .set({ lastReminderSentAt: now })
        .where(eq(chores.id, chore.id));
    }
  }
}

async function shouldSendReminder(chore: any, now: Date): Promise<boolean> {
  // Implement logic based on reminderFrequency
  // hourly, every_2_hours, every_3_hours, custom
  return true; // Simplified
}

async function sendChoreNotification(chore: any, userId: number) {
  // Reuse Phase 2 notification infrastructure
  // Send push notification with action buttons
}
```

**Notification Payload Structure:**
```typescript
{
  title: chore.title,
  body: `${chore.progress}% complete - Don't forget to finish!`,
  icon: '/chore-icon.png',
  data: {
    choreId: chore.id,
    type: 'chore_reminder',
    actions: [
      { action: 'update_25', title: '+25%' },
      { action: 'mark_done', title: 'Mark Done' },
      { action: 'not_applicable', title: 'N/A' },
      { action: 'dismiss', title: 'Later' },
    ]
  }
}
```

---

### 2.2 Service Worker Notification Handlers

**Purpose:** Handle notification clicks with action buttons

**Implementation Details:**

**File:** `public/sw.js` (MODIFY - extend existing Phase 2 service worker)
```javascript
// Extend existing service worker

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
          snoozedUntil: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
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

### 2.3 Feedback API Route

**Purpose:** Handle "N/A for me" feedback and snooze reminders

**Implementation Details:**

**File:** `src/app/api/chores/[id]/feedback/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreFeedback, choreHistory } from '@/lib/db/schema';
import { authHeaders } from '@/lib/auth/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await authHeaders(request);
  const body = await request.json();

  // Log feedback
  await db.insert(choreFeedback).values({
    choreId: parseInt(params.id),
    userId,
    orgId,
    feedbackType: body.feedbackType,
    reason: body.reason,
    snoozedUntil: body.snoozedUntil ? new Date(body.snoozedUntil) : null,
  });

  // Log to history
  await db.insert(choreHistory).values({
    choreId: parseInt(params.id),
    userId,
    orgId,
    action: 'not_applicable',
    notes: body.reason,
  });

  return NextResponse.json({ success: true });
}
```

---

### 2.4 Streak Tracking Helper

**Purpose:** Track consecutive day completions for motivation

**Implementation Details:**

**File:** `src/lib/chores/streaks.ts` (NEW)
```typescript
import { db } from '@/lib/db';
import { choreStreaks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function updateStreak(choreId: number, userId: number, orgId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get current streak
  const existing = await db
    .select()
    .from(choreStreaks)
    .where(
      and(
        eq(choreStreaks.userId, userId),
        eq(choreStreaks.choreId, choreId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    // Create new streak
    await db.insert(choreStreaks).values({
      userId,
      orgId,
      choreId,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedAt: now,
    });
    return;
  }

  const streak = existing[0];
  const lastCompleted = new Date(streak.lastCompletedAt);
  const lastDay = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());

  const daysDiff = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak = streak.currentStreak;

  if (daysDiff === 0) {
    // Already completed today, don't update
    return;
  } else if (daysDiff === 1) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  await db
    .update(choreStreaks)
    .set({
      currentStreak: newStreak,
      longestStreak: Math.max(streak.longestStreak, newStreak),
      lastCompletedAt: now,
      updatedAt: now,
    })
    .where(eq(choreStreaks.id, streak.id));
}
```

---

## Phase 7C: Advanced Features (Week 3)

### 3.1 Chore History Dashboard

**Purpose:** Parent dashboard to review chore history

**Implementation Details:**

**File:** `src/app/(dashboard)/chores/history/page.tsx` (NEW)
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ChoreHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/chores/history');
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading history...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Chore History</h1>

      <div className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{entry.choreTitle}</p>
                <p className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium capitalize">
                  {entry.action.replace('_', ' ')}
                </span>
                {entry.previousProgress !== undefined && (
                  <p className="text-sm text-gray-500">
                    {entry.previousProgress}% → {entry.newProgress}%
                  </p>
                )}
              </div>
            </div>
            {entry.notes && (
              <p className="mt-2 text-sm text-gray-600 italic">{entry.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**File:** `src/app/api/chores/history/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreHistory, chores } from '@/lib/db/schema';
import { authHeaders } from '@/lib/auth/headers';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { userId, orgId } = await authHeaders(request);

  const history = await db
    .select({
      id: choreHistory.id,
      action: choreHistory.action,
      previousProgress: choreHistory.previousProgress,
      newProgress: choreHistory.newProgress,
      notes: choreHistory.notes,
      timestamp: choreHistory.timestamp,
      choreTitle: chores.title,
    })
    .from(choreHistory)
    .innerJoin(chores, eq(choreHistory.choreId, chores.id))
    .where(eq(choreHistory.orgId, orgId))
    .orderBy(desc(choreHistory.timestamp))
    .limit(100);

  return NextResponse.json({ history });
}
```

---

### 3.2 Streaks Leaderboard

**Purpose:** Gamification through friendly competition

**Implementation Details:**

**File:** `src/app/(dashboard)/chores/leaderboard/page.tsx` (NEW)
```typescript
'use client';

import { useEffect, useState } from 'react';

interface StreakEntry {
  userId: number;
  userName: string;
  totalStreaks: number;
  longestStreak: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/chores/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading leaderboard...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🏆 Leaderboard</h1>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            className={`flex items-center justify-between bg-white rounded-lg shadow p-4 ${
              index === 0 ? 'border-2 border-yellow-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-gray-400">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-lg">{entry.userName}</p>
                <p className="text-sm text-gray-500">
                  Longest streak: {entry.longestStreak} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {entry.totalStreaks}
              </p>
              <p className="text-sm text-gray-500">current streaks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**File:** `src/app/api/chores/leaderboard/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreStreaks, users } from '@/lib/db/schema';
import { authHeaders } from '@/lib/auth/headers';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { orgId } = await authHeaders(request);

  const leaderboard = await db
    .select({
      userId: users.id,
      userName: users.name,
      totalStreaks: choreStreaks.currentStreak,
      longestStreak: choreStreaks.longestStreak,
    })
    .from(choreStreaks)
    .innerJoin(users, eq(choreStreaks.userId, users.id))
    .where(eq(choreStreaks.orgId, orgId))
    .orderBy(desc(choreStreaks.currentStreak));

  // Group by user and sum streaks
  const aggregated = leaderboard.reduce((acc: any[], entry) => {
    const existing = acc.find(e => e.userId === entry.userId);
    if (existing) {
      existing.totalStreaks += entry.totalStreaks;
      existing.longestStreak = Math.max(existing.longestStreak, entry.longestStreak);
    } else {
      acc.push({ ...entry });
    }
    return acc;
  }, []);

  return NextResponse.json({ leaderboard: aggregated });
}
```

---

### 3.3 Parent Feedback Review

**Purpose:** Review feedback from children about chores

**Implementation Details:**

**File:** `src/app/(dashboard)/chores/feedback/page.tsx` (NEW)
```typescript
'use client';

import { useEffect, useState } from 'react';

interface FeedbackEntry {
  id: number;
  choreTitle: string;
  userName: string;
  feedbackType: string;
  reason?: string;
  createdAt: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/chores/feedback');
      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading feedback...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">💬 Feedback</h1>

      <div className="space-y-4">
        {feedback.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{entry.choreTitle}</p>
                <p className="text-sm text-gray-500">
                  {entry.userName} • {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                {entry.feedbackType.replace('_', ' ')}
              </span>
            </div>
            {entry.reason && (
              <p className="text-gray-700 italic">{entry.reason}</p>
            )}
          </div>
        ))}
      </div>

      {feedback.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No feedback yet. Feedback will appear here when children mark chores as "N/A".
        </div>
      )}
    </div>
  );
}
```

---

## Age-Appropriate UI Variants

### 9-Year-Old UI Variant

**File:** `src/components/chores/ChoreCardJunior.tsx` (NEW)
```typescript
// Simplified UI for younger children
// Large buttons, emojis, simple interactions

export default function ChoreCardJunior({ chore, onProgressUpdate }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-4 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">🧹</span>
        <h3 className="text-2xl font-bold">{chore.title}</h3>
      </div>

      <ProgressBar progress={chore.progress} choreTitle={chore.title} showPercentage={false} />

      <div className="grid grid-cols-3 gap-3 mt-4">
        <button onClick={() => onProgressUpdate(25)} className="h-16 text-2xl bg-blue-500 text-white rounded-xl">
          +25%
        </button>
        <button onClick={() => onProgressUpdate(25)} className="h-16 text-2xl bg-blue-500 text-white rounded-xl">
          +25%
        </button>
        <button onClick={() => onProgressUpdate(100)} className="h-16 text-2xl bg-green-500 text-white rounded-xl">
          ✅ Done
        </button>
      </div>
    </div>
  );
}
```

---

### 12-Year-Old with ASD (Step-Based)

**File:** `src/components/chores/ChoreCardSteps.tsx` (NEW)
```typescript
// Step-based checklist for ASD child
// Clear structure, predictable, visual checkmarks

export default function ChoreCardSteps({ chore, onStepToggle, onMarkDone }: Props) {
  const steps = JSON.parse(chore.steps || '[]');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">💧</span>
        <div>
          <h3 className="text-xl font-bold">{chore.title}</h3>
          <p className="text-sm text-gray-600">
            Progress: {chore.completedSteps}/{chore.totalSteps} steps
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {steps.map((step: string, index: number) => (
          <button
            key={index}
            onClick={() => onStepToggle(index)}
            className={`w-full text-left p-4 rounded-lg border-2 flex items-center gap-3 ${
              index < chore.completedSteps
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-gray-50 border-gray-300 text-gray-700'
            }`}
          >
            <span className="text-2xl">
              {index < chore.completedSteps ? '✅' : '⬜'}
            </span>
            <span className="text-lg">{step}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onMarkDone}
        className="w-full h-14 bg-green-500 text-white rounded-lg text-xl font-bold"
      >
        Mark All Steps Done ✅
      </button>
    </div>
  );
}
```

---

### 16-Year-Old (Mature UI)

**File:** `src/components/chores/ChoreCardTeen.tsx` (NEW)
```typescript
// Mature UI with history, streaks, notes
// More detail, keyboard shortcuts

export default function ChoreCardTeen({ chore, onProgressUpdate, onAddNote }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{chore.title}</h3>
        <div className="flex items-center gap-2 text-orange-600">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold">{chore.streak || 0}</span>
        </div>
      </div>

      <ProgressBar progress={chore.progress} choreTitle={chore.title} />

      <div className="flex items-center gap-2 mt-4">
        <input
          type="number"
          value={chore.progress}
          onChange={(e) => onProgressUpdate(parseInt(e.target.value))}
          className="w-24 h-10 text-center border rounded-lg"
          min="0"
          max="100"
        />
        <span className="text-lg">%</span>
        <button onClick={() => onProgressUpdate(100)} className="ml-auto px-4 py-2 bg-green-500 text-white rounded-lg">
          Done
        </button>
      </div>

      {chore.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 italic">{chore.notes}</p>
        </div>
      )}

      <textarea
        placeholder="Add a note..."
        onChange={(e) => onAddNote(e.target.value)}
        className="w-full mt-3 p-3 border rounded-lg resize-none"
        rows={2}
      />
    </div>
  );
}
```

---

## Database Indexing

**Purpose:** Optimize queries for performance

**Implementation Details:**

**Migration file:** `drizzle/XXXXX_add_indexes.sql`
```sql
-- Optimize chores queries
CREATE INDEX idx_chores_org_id ON chores(org_id);
CREATE INDEX idx_chores_residence_id ON chores(residence_id);
CREATE INDEX idx_chores_assigned_to ON chores USING GIN(assigned_to);
CREATE INDEX idx_chores_is_recurring ON chores(is_recurring);
CREATE INDEX idx_chores_progress ON chores(progress);

-- Optimize history queries
CREATE INDEX idx_chore_history_org_id ON chore_history(org_id);
CREATE INDEX idx_chore_history_chore_id ON chore_history(chore_id);
CREATE INDEX idx_chore_history_user_id ON chore_history(user_id);
CREATE INDEX idx_chore_history_timestamp ON chore_history(timestamp DESC);

-- Optimize feedback queries
CREATE INDEX idx_chore_feedback_org_id ON chore_feedback(org_id);
CREATE INDEX idx_chore_feedback_chore_id ON chore_feedback(chore_id);
CREATE INDEX idx_chore_feedback_user_id ON chore_feedback(user_id);

-- Optimize streak queries
CREATE INDEX idx_chore_streaks_org_id ON chore_streaks(org_id);
CREATE INDEX idx_chore_streaks_user_id ON chore_streaks(user_id);
CREATE INDEX idx_chore_streaks_chore_id ON chore_streaks(chore_id);
```

---

## Testing Strategy

### Unit Tests (Vitest - Phase 7C)

**File:** `src/lib/chores/__tests__/streaks.test.ts` (NEW)
```typescript
import { describe, it, expect } from 'vitest';
import { updateStreak } from '../streaks';

describe('Streak Tracking', () => {
  it('should increment streak on consecutive days', async () => {
    // Test implementation
  });

  it('should reset streak on missed day', async () => {
    // Test implementation
  });

  it('should not update streak if already completed today', async () => {
    // Test implementation
  });
});
```

---

### E2E Tests (Playwright - Immediate)

**Phase 7A Tests (Week 1):**
- Create chore
- Update progress (+25%, +50%, 100%)
- Mark chore as complete → confetti triggers
- Daily reset (mock cron)
- Multi-tenancy isolation

**Phase 7B Tests (Week 2):**
- Notification sends for overdue chore
- Notification action: +25% increments progress
- Notification action: Mark done
- Notification action: N/A → feedback logged
- Snooze duration respected

**Phase 7C Tests (Week 3):**
- View chore history
- View leaderboard
- Submit feedback
- Streak tracking

**Total: ~25 new tests**

---

## Implementation Checklist

### Week 1: Phase 7A - Core System
- [ ] Add chores tables to schema (chores, choreHistory, choreFeedback, choreStreaks)
- [ ] Generate and push migration
- [ ] Create `/api/chores` route (GET, POST)
- [ ] Create `/api/chores/[id]` route (GET, PATCH, DELETE)
- [ ] Implement ProgressBar component
- [ ] Implement ChoreCard component with confetti
- [ ] Create `/chores` dashboard page
- [ ] Create `/chores/new` create page
- [ ] Create `/chores/[id]/edit` edit page
- [ ] Implement daily reset cron job
- [ ] Add database indexes
- [ ] E2E tests: CRUD operations
- [ ] E2E tests: Progress tracking
- [ ] E2E tests: Confetti on completion
- [ ] E2E tests: Daily reset
- [ ] E2E tests: Multi-tenancy

### Week 2: Phase 7B - Notifications
- [ ] Extend Phase 2 notification system for chores
- [ ] Implement `sendChoreReminders` function
- [ ] Create `/api/chores/[id]/feedback` route
- [ ] Extend service worker for chore notification actions
- [ ] Implement `shouldSendReminder` logic
- [ ] Implement `updateStreak` helper
- [ ] Test notification flow end-to-end
- [ ] E2E tests: Notification sends
- [ ] E2E tests: Notification actions
- [ ] E2E tests: Feedback handling
- [ ] E2E tests: Snooze duration

### Week 3: Phase 7C - Advanced Features
- [ ] Create `/chores/history` page
- [ ] Create `/api/chores/history` route
- [ ] Create `/chores/leaderboard` page
- [ ] Create `/api/chores/leaderboard` route
- [ ] Create `/chores/feedback` page
- [ ] Create `/api/chores/feedback` route
- [ ] Implement ChoreCardJunior (9yo variant)
- [ ] Implement ChoreCardSteps (12yo ASD variant)
- [ ] Implement ChoreCardTeen (16yo variant)
- [ ] Add keyboard shortcuts for teen variant
- [ ] Unit tests for streak tracking
- [ ] E2E tests: History dashboard
- [ ] E2E tests: Leaderboard
- [ ] E2E tests: Feedback system
- [ ] E2E tests: Age-appropriate variants

---

## Dependencies to Install

```bash
npm install react-confetti react-use
```

**Already installed (reuse):**
- `date-fns` - Date operations
- `drizzle-orm` - Database ORM
- All other dependencies from Phases 1-6

---

## Multi-tenancy & Security

**Critical Rules:**
1. ✅ All API routes verify JWT token via `authHeaders`
2. ✅ Extract `org_id` and `user_id` from verified token
3. ✅ All queries include `WHERE org_id = <org_id>`
4. ✅ Never expose data from other organizations
5. ✅ Cron job protected by `CRON_SECRET`

**Authorization:**
- Admin (parent): Can create/edit all chores
- Member (child): Can only update progress on assigned chores
- Feedback routes: Only assigned users can submit feedback

---

## Performance Considerations

**Caching Strategy:**
- Leaderboard: Cache for 1 hour (updated via background job)
- History: No caching (real-time data)
- Streak calculations: Optimize with indexes

**API Response Times:**
- Target: <200ms for chore CRUD operations
- Target: <300ms for history queries (indexed)

**Database Optimization:**
- GIN index on `assigned_to` array column
- DESC index on `timestamp` for history queries
- Composite indexes on `(org_id, residence_id)`

---

## Success Criteria

**Functional:**
- ✅ All chore CRUD operations working
- ✅ Progress tracking with visual bars
- ✅ Confetti on completion
- ✅ Daily reset for recurring chores
- ✅ Notification reminders with actions
- ✅ Streak tracking and leaderboard
- ✅ Feedback collection system
- ✅ Age-appropriate UI variants

**User Experience:**
- ✅ Reduce chore completion time by 40%
- ✅ Increase chore completion rate by 30%
- ✅ Positive feedback from all 3 children
- ✅ Parents can review history and feedback

**Technical:**
- ✅ Zero multi-tenancy data leaks
- ✅ Zero type errors
- ✅ Clean linting (ESLint)
- ✅ 100% E2E test pass rate
- ✅ API response times <300ms

---

## Risks & Mitigations

**Risk:** Notification spam (too many reminders)
**Mitigation:**
- Enforce active hours (5 AM - 9 PM)
- Respect snooze duration
- Allow users to disable reminders per chore

**Risk:** Children marking chores as "N/A" to skip work
**Mitigation:**
- Parents receive notification of feedback
- Parents can disable "N/A" feature per chore
- Track N/A frequency and flag abuse

**Risk:** Confetti animation performance on older devices
**Mitigation:**
- Limit confetti particles to 200
- Auto-disable on low-end devices (detect via navigator)
- Add setting to disable animations

**Risk:** Step-based chores too complex for 9yo
**Mitigation:**
- Default to percentage mode for all users
- Allow parents to choose mode per child
- Provide age-appropriate UI variants

---

## Next Steps

1. **Complete Phase 1-6** before starting Phase 7
2. **Review this plan** with family (get input from children)
3. **Begin Week 1 implementation** starting with schema
4. **Deploy to staging** after each week
5. **Family testing** with PelicanoFamily
6. **Production deployment** after Week 3

---

## Alternative: Phase 1.9 Prototype

**If you want to test chores NOW (before Phase 6):**

**Build in 1 week:**
- ✅ Basic chore CRUD
- ✅ Simple progress tracking
- ✅ No notifications yet
- ✅ No advanced features

**Then:**
- Refine in Phase 7 with full features

**Trade-off:**
- Pros: Validate concept early, get family feedback
- Cons: Technical debt, will refactor in Phase 7

---

**Document Status:** Ready for implementation (Phase 7, Month 4)
**Next Review:** After Phase 6 completion
**Author:** Sisyphus (AI Agent)
**Project:** Homebase - ADHD Executive Function Support System
**Integration:** Fully integrated, NOT standalone PWA
