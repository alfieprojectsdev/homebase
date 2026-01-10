import { pgTable, serial, text, timestamp, varchar, decimal, integer, boolean } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRole = 'admin' | 'member' | 'viewer';

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BillStatus = 'pending' | 'paid' | 'overdue';
