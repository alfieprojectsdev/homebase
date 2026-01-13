import { pgTable, serial, text, timestamp, varchar, decimal, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const residences = pgTable('residences', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  residenceId: integer('residence_id').references(() => residences.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50, enum: ['admin', 'member', 'viewer'] }).default('member').notNull(),
  lastAppOpen: timestamp('last_app_open'),
  primaryResidence: text('primary_residence'),
  overallForgetRate: decimal('overall_forget_rate', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRole = 'admin' | 'member' | 'viewer';

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

export const financialObligations = pgTable('financial_obligations', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  residenceId: integer('residence_id').references(() => residences.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: varchar('status', { length: 50, enum: ['pending', 'paid', 'overdue'] }).default('pending').notNull(),
  paidAt: timestamp('paid_at'),
  recurrenceEnabled: boolean('recurrence_enabled').default(false).notNull(),
  recurrenceFrequency: varchar('recurrence_frequency', {
    length: 20,
  }).$type<'monthly' | 'quarterly' | 'biannual' | 'annual' | null>(),
  recurrenceInterval: integer('recurrence_interval').default(1),
  recurrenceDayOfMonth: integer('recurrence_day_of_month'),
  parentBillId: integer('parent_bill_id'),
  category: categoryEnum('category').notNull().default('uncategorized'),
  urgencyScore: integer('urgency_score').notNull().default(0),
  urgencyLevel: varchar('urgency_level', { length: 20 }).notNull().default('normal'),
  urgencyReasons: text('urgency_reasons').array(),
  lastUrgencyCalculation: timestamp('last_urgency_calculation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BillStatus = 'pending' | 'paid' | 'overdue';
export type BillCategory = typeof categoryEnum.enumValues[number];
export type UrgencyLevel = 'critical' | 'high' | 'normal';

export const patternAnalytics = pgTable('pattern_analytics', {
  id: serial('id').primaryKey(),
  patternType: text('pattern_type').notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
  sampleSize: integer('sample_size').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

export const chores = pgTable('chores', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  residenceId: integer('residence_id').references(() => residences.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  assignedTo: integer('assigned_to').array(),
  progress: integer('progress').default(0),
  progressUnit: varchar('progress_unit', { length: 20 }).default('percent'),
  totalSteps: integer('total_steps'),
  completedSteps: integer('completed_steps').default(0),
  steps: text('steps'),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: varchar('recurrence_pattern', { length: 20 }),
  resetTime: varchar('reset_time', { length: 5 }).default('00:00'),
  reminderEnabled: boolean('reminder_enabled').default(true),
  reminderFrequency: varchar('reminder_frequency', { length: 20 }),
  reminderCustomTimes: text('reminder_custom_times'),
  activeStartHour: integer('active_start_hour').default(5),
  activeEndHour: integer('active_end_hour').default(21),
  lastReminderSentAt: timestamp('last_reminder_sent_at'),
  completedAt: timestamp('completed_at'),
  lastProgressUpdateAt: timestamp('last_progress_update_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const choreHistory = pgTable('chore_history', {
  id: serial('id').primaryKey(),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  action: varchar('action', { length: 50 }).notNull(),
  previousProgress: integer('previous_progress'),
  newProgress: integer('new_progress'),
  notes: text('notes'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const choreFeedback = pgTable('chore_feedback', {
  id: serial('id').primaryKey(),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  feedbackType: varchar('feedback_type', { length: 50 }).notNull(),
  reason: text('reason'),
  snoozedUntil: timestamp('snoozed_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const choreStreaks = pgTable('chore_streaks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  choreId: integer('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastCompletedAt: timestamp('last_completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
