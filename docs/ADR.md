# Architecture Decision Record: Household Management System for ADHD Support

**Status:** Proposed  
**Date:** 2025-01-08  
**Decision Makers:** Development Team  
**Context:** Multi-residence household management system with mission-critical bill tracking, grocery management, and ADHD-optimized notifications to prevent emergency situations (e.g., utility disconnections during severe weather)

---

## Executive Summary

This ADR documents architectural decisions for a **context-aware, notification-first household management system** designed specifically for ADHD executive function support across multiple residences. The system must prevent catastrophic failures (power disconnections requiring emergency travel during typhoons) through aggressive, multi-layered notification strategies.

**Core Requirements:**
- Multi-tenancy (organization → residences → users)
- Offline-first mobile PWA with robust sync
- Mission-critical push notifications (cannot be missed)
- Location-aware task prioritization
- Weather-integrated travel risk assessment
- Spouse collaboration without surveillance dynamics

**Key Constraint:** Vercel deployment (not self-hosted initially) requires adapting notification strategy from persistent local service to cloud-based push architecture.

---

## ADR 1: Overall Architecture Pattern

### Decision: Hybrid Server-Side + Edge Architecture

**Context:**  
Need balance between real-time notifications, offline capability, and Vercel deployment constraints.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Pure SPA + API** | Simple, clear separation | No SSR benefits, poor offline boot |
| **Next.js App Router (chosen)** | SSR, RSC, API routes in one, Vercel-optimized | Learning curve, mixing concerns |
| **Separate Frontend/Backend** | Maximum flexibility | Deployment complexity, CORS issues |

**Decision: Next.js 14 App Router with hybrid rendering**

**Rationale:**
- Server Components reduce client JS (faster PWA boot)
- API Routes co-located with frontend (simpler Vercel deployment)
- Edge Runtime for time-critical notification logic
- Built-in optimization for Vercel platform

**Implementation:**
```
project-structure/
├── app/
│   ├── (auth)/                 # Auth routes (Server Components)
│   ├── (dashboard)/            # Protected routes (hybrid SSR + client)
│   │   ├── bills/
│   │   ├── groceries/
│   │   ├── residences/
│   ├── api/
│   │   ├── bills/
│   │   ├── sync/
│   │   ├── notifications/
│   │   │   ├── register/      # Push subscription
│   │   │   ├── send/          # Trigger notifications
│   │   │   ├── cron/          # Vercel Cron endpoint
│   ├── layout.tsx              # Root layout with PWA manifest
│   ├── manifest.ts             # Dynamic PWA manifest
├── lib/
│   ├── db/                     # Neon DB client
│   ├── notifications/          # Web Push logic
│   ├── sync/                   # Offline sync engine
├── components/
│   ├── ui/                     # Shadcn components
│   ├── bills/
│   ├── groceries/
├── public/
│   ├── sw.js                   # Service Worker (custom)
│   ├── icons/
```

---

## ADR 2: Database Architecture

### Decision: Neon Postgres with pgvector

**Context:**  
Need serverless Postgres with branching for dev/staging, vector support for future RAG, and row-level security for multi-tenancy.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Supabase** | Built-in auth, realtime | Vendor lock-in, learning curve |
| **PlanetScale** | MySQL, auto-scaling | No pgvector, no JSONB |
| **Neon (chosen)** | True Postgres, branching, pgvector | Newer platform, smaller community |

**Decision: Neon Postgres with Drizzle ORM**

**Rationale:**
- Serverless Postgres (no cold starts on Vercel)
- Branch per PR for safe schema migrations
- pgvector extension for Phase 6 RAG
- Drizzle ORM: type-safe, lightweight, edge-compatible
- PostGIS available for future geofencing

**Schema Design:**

```typescript
// drizzle/schema.ts
import { pgTable, uuid, text, timestamp, integer, decimal, boolean, jsonb, vector } from 'drizzle-orm/pg-core';

// Multi-tenancy root
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
  
  // Location detection
  wifiSsids: text('wifi_ssids').array(),
  geofenceLat: decimal('geofence_lat', { precision: 10, scale: 7 }),
  geofenceLng: decimal('geofence_lng', { precision: 10, scale: 7 }),
  geofenceRadiusM: integer('geofence_radius_m').default(100),
  
  // Weather-aware travel planning
  weatherSensitive: boolean('weather_sensitive').default(false),
  travelDistanceKm: integer('travel_distance_km'),
  travelTimeHours: decimal('travel_time_hours', { precision: 3, scale: 1 }),
  
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
  
  // Push notification subscriptions
  pushSubscriptions: jsonb('push_subscriptions').$type<PushSubscription[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const userResidenceAccess = pgTable('user_residence_access', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  canEdit: boolean('can_edit').default(false),
}, (table) => ({
  pk: primaryKey(table.userId, table.residenceId),
}));

// Bills with ADHD-optimized fields
export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // Bill details
  name: text('name').notNull(),
  provider: text('provider'), // MERALCO, PELCO, PLDT, etc.
  category: text('category', { 
    enum: ['utilities', 'telecoms', 'rent', 'insurance', 'hoa', 'other'] 
  }).notNull(),
  accountNumber: text('account_number'),
  
  // Financial
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('PHP'),
  dueDate: timestamp('due_date').notNull(),
  
  // Recurrence
  recurrenceRule: text('recurrence_rule'), // RRULE format
  nextDueDate: timestamp('next_due_date'),
  
  // Status
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  paidDate: timestamp('paid_date'),
  paidBy: uuid('paid_by').references(() => users.id),
  paymentMethod: text('payment_method'),
  referenceNumber: text('reference_number'),
  
  // CRITICAL FLAGS for ADHD support
  critical: boolean('critical').default(false),
  noRemotePayment: boolean('no_remote_payment').default(false),
  requiresTravel: boolean('requires_travel').default(false),
  consequenceSeverity: integer('consequence_severity').default(5), // 1-10
  
  // Trip planning
  tripScheduled: jsonb('trip_scheduled').$type<{
    date: string;
    time: string;
    weatherChecked: boolean;
    checklistCompleted: boolean;
  }>(),
  
  // Acknowledgment tracking
  lastAcknowledged: timestamp('last_acknowledged'),
  acknowledgmentCount: integer('acknowledgment_count').default(0),
  
  // RAG support (Phase 6)
  embedding: vector('embedding', { dimensions: 384 }),
  
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Notification audit log (critical for debugging missed alerts)
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'cascade' }),
  
  type: text('type', { 
    enum: ['reminder', 'urgent', 'critical', 'emergency', 'escalation'] 
  }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  
  // Delivery tracking
  sentAt: timestamp('sent_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  action: text('action'), // 'paid', 'scheduled', 'snoozed', 'escalated'
  
  // Metadata
  daysUntilDue: integer('days_until_due'),
  metadata: jsonb('metadata'),
});

// Grocery/Inventory tables (similar structure, omitted for brevity)
// ... shopping_list_items, inventory_items, receipts, etc.
```

**Migration Strategy:**
```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to Neon branch
npx drizzle-kit push:pg --connection-string=$NEON_BRANCH_URL

# Seed data
npm run db:seed
```

---

## ADR 3: Authentication & Authorization

### Decision: Custom JWT + Secure Cookies (No NextAuth)

**Context:**  
Need simple, edge-compatible auth without external dependencies. Multi-tenancy requires org-scoped sessions.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **NextAuth.js** | Battle-tested, providers | Heavy, DB adapter issues with Neon |
| **Clerk** | Modern, easy | $$$, vendor lock-in |
| **Custom JWT (chosen)** | Full control, lightweight | Roll your own security |

**Decision: Custom JWT with httpOnly cookies + bcrypt**

**Rationale:**
- Edge Runtime compatible
- No database sessions (scales better)
- Org ID + residence access in JWT claims
- Service Worker can read auth state for offline

**Implementation:**

```typescript
// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionPayload {
  userId: string;
  orgId: string;
  email: string;
  role: 'admin' | 'parent' | 'child';
  residences: string[]; // IDs of accessible residences
  exp: number;
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>) {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
  
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  
  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// Middleware for API routes
export async function requireAuth() {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
```

**Row-Level Security:**
```typescript
// lib/db/middleware.ts
export function withOrgAccess(db: DrizzleDb, orgId: string) {
  // All queries automatically filtered by orgId
  return db.query.bills.findMany({
    where: eq(bills.orgId, orgId),
  });
}
```

---

## ADR 4: Mission-Critical Notifications Architecture

### Decision: Multi-Layer Notification Strategy (Web Push + SMS Fallback)

**Context:**  
**THIS IS THE MOST CRITICAL COMPONENT.** Missed notifications = emergency situations. Web Push alone is unreliable (iOS Safari limitations, background restrictions, user dismisses notification).

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Web Push only** | Free, native | iOS Safari issues, dismissable |
| **Native app** | Most reliable | Dev/maintenance cost |
| **Web Push + SMS (chosen)** | Redundancy, reaches user | SMS costs (~$0.01/msg) |
| **Web Push + Email** | Free fallback | Email ignored/spam |

**Decision: Layered Notification Architecture**

```
Layer 1: Web Push (Primary)
Layer 2: Persistent In-App Alerts (Fallback if push dismissed)
Layer 3: SMS via Twilio (Escalation for critical/emergency)
Layer 4: Spouse Notification (Human failsafe)
```

**Architecture:**

```typescript
// lib/notifications/types.ts
export type NotificationUrgency = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

export interface NotificationStrategy {
  urgency: NotificationUrgency;
  channels: ('web_push' | 'in_app' | 'sms' | 'spouse')[];
  retrySchedule: number[]; // Minutes between retries
  requireAcknowledgment: boolean;
  persistentUntilAction: boolean;
}

export const URGENCY_STRATEGIES: Record<NotificationUrgency, NotificationStrategy> = {
  low: {
    urgency: 'low',
    channels: ['web_push'],
    retrySchedule: [],
    requireAcknowledgment: false,
    persistentUntilAction: false,
  },
  medium: {
    urgency: 'medium',
    channels: ['web_push', 'in_app'],
    retrySchedule: [60, 360], // 1hr, 6hrs later
    requireAcknowledgment: false,
    persistentUntilAction: false,
  },
  high: {
    urgency: 'high',
    channels: ['web_push', 'in_app'],
    retrySchedule: [60, 240, 480], // 1hr, 4hrs, 8hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
  critical: {
    urgency: 'critical',
    channels: ['web_push', 'in_app', 'sms'],
    retrySchedule: [30, 120, 240], // 30min, 2hrs, 4hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
  emergency: {
    urgency: 'emergency',
    channels: ['web_push', 'in_app', 'sms', 'spouse'],
    retrySchedule: [15, 60, 120, 240], // 15min, 1hr, 2hrs, 4hrs
    requireAcknowledgment: true,
    persistentUntilAction: true,
  },
};
```

**Web Push Implementation (VAPID):**

```typescript
// lib/notifications/web-push.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendWebPush(
  subscription: PushSubscription,
  payload: {
    title: string;
    body: string;
    urgency: NotificationUrgency;
    actions?: { action: string; title: string }[];
    data?: any;
  }
) {
  const notification = {
    title: payload.title,
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.data?.billId || 'general',
    requireInteraction: payload.urgency === 'critical' || payload.urgency === 'emergency',
    vibrate: getVibrationPattern(payload.urgency),
    actions: payload.actions || [],
    data: payload.data,
  };
  
  await webpush.sendNotification(subscription, JSON.stringify(notification), {
    urgency: payload.urgency === 'emergency' ? 'high' : 'normal',
    TTL: 86400, // 24 hours
  });
}

function getVibrationPattern(urgency: NotificationUrgency): number[] {
  switch (urgency) {
    case 'emergency': return [1000, 500, 1000, 500, 1000];
    case 'critical': return [500, 200, 500];
    case 'high': return [200, 100, 200];
    default: return [200];
  }
}
```

**SMS Fallback (Twilio):**

```typescript
// lib/notifications/sms.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, message: string) {
  // Only send SMS for critical/emergency (cost control)
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
  });
}

// Example usage
await sendSMS(
  user.phoneNumber,
  '🚨 PELCO MAGALANG DUE TOMORROW - ₱1,800. Open app to schedule payment trip.'
);
```

**Vercel Cron for Scheduled Notifications:**

```typescript
// app/api/notifications/cron/route.ts
import { NextResponse } from 'next/server';
import { verifySignature } from '@vercel/cron';

export const runtime = 'edge';

export async function GET(request: Request) {
  // Verify this is actually from Vercel Cron
  const isValidCron = verifySignature(request);
  if (!isValidCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Find all bills due in next 14 days
  const upcomingBills = await db.query.bills.findMany({
    where: and(
      eq(bills.status, 'pending'),
      gte(bills.dueDate, new Date()),
      lte(bills.dueDate, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
    ),
    with: {
      residence: true,
      organization: {
        with: {
          users: true,
        },
      },
    },
  });
  
  for (const bill of upcomingBills) {
    const daysUntil = Math.ceil(
      (bill.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    
    const urgency = getUrgencyLevel(bill, daysUntil);
    const strategy = URGENCY_STRATEGIES[urgency];
    
    // Check if we should send notification
    const shouldSend = await shouldSendNotification(bill, daysUntil, strategy);
    if (!shouldSend) continue;
    
    // Send to all users with access to this residence
    for (const user of bill.organization.users) {
      if (!hasAccessToResidence(user, bill.residenceId)) continue;
      
      await sendNotification(user, bill, urgency, strategy);
    }
  }
  
  return NextResponse.json({ success: true, processed: upcomingBills.length });
}

function getUrgencyLevel(bill: Bill, daysUntil: number): NotificationUrgency {
  // Critical bills get elevated urgency
  if (bill.critical) {
    if (daysUntil <= 0) return 'emergency';
    if (daysUntil <= 1) return 'critical';
    if (daysUntil <= 3) return 'high';
    if (daysUntil <= 7) return 'medium';
    return 'low';
  }
  
  // Normal bills
  if (daysUntil <= 0) return 'critical';
  if (daysUntil <= 1) return 'high';
  if (daysUntil <= 3) return 'medium';
  return 'low';
}

async function sendNotification(
  user: User,
  bill: Bill,
  urgency: NotificationUrgency,
  strategy: NotificationStrategy
) {
  const message = formatNotificationMessage(bill, urgency);
  
  // Layer 1: Web Push
  if (strategy.channels.includes('web_push')) {
    for (const sub of user.pushSubscriptions) {
      try {
        await sendWebPush(sub, {
          title: message.title,
          body: message.body,
          urgency,
          actions: [
            { action: 'pay', title: 'Pay Now' },
            { action: 'schedule', title: 'Schedule' },
            { action: 'snooze', title: 'Remind Later' },
          ],
          data: { billId: bill.id },
        });
      } catch (error) {
        console.error('Web push failed:', error);
        // Subscription invalid, remove it
        await removeInvalidSubscription(user.id, sub);
      }
    }
  }
  
  // Layer 3: SMS for critical/emergency
  if (strategy.channels.includes('sms') && user.phoneNumber) {
    await sendSMS(user.phoneNumber, message.sms);
  }
  
  // Layer 4: Spouse escalation for emergency
  if (strategy.channels.includes('spouse')) {
    await escalateToSpouse(user, bill);
  }
  
  // Log notification
  await db.insert(notificationLog).values({
    userId: user.id,
    billId: bill.id,
    type: urgency,
    title: message.title,
    body: message.body,
    daysUntilDue: daysUntil,
  });
}
```

**Vercel Cron Configuration:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/notifications/cron",
      "schedule": "0 6,12,18 * * *"
    }
  ]
}
```
Runs at 6am, 12pm, 6pm daily (Philippine time: adjust schedule accordingly).

---

## ADR 5: PWA Implementation

### Decision: Next-PWA with Custom Service Worker

**Context:**  
Need installable app with offline support, but also need custom Service Worker logic for notification handling and aggressive caching.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Workbox (Next-PWA)** | Easy setup | Limited customization |
| **Custom SW (chosen)** | Full control | More code to maintain |
| **Hybrid** | Best of both | Complexity |

**Decision: Next-PWA for manifest + custom Service Worker for notifications**

**Installation:**

```bash
npm install next-pwa
npm install @ducanh2912/next-pwa
```

**Configuration:**

```typescript
// next.config.mjs
import withPWA from '@ducanh2912/next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  
  // Custom service worker
  sw: '/sw.js',
  
  // Aggressive runtime caching for offline
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'weather-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300, // 5 minutes
        },
      },
    },
    {
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 3600, // 1 hour
        },
      },
    },
  ],
});

export default config;
```

**Dynamic Manifest:**

```typescript
// app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Household Manager - Never Forget Again',
    short_name: 'Household',
    description: 'Multi-residence bill tracking and grocery management with ADHD support',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#3b82f6',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Add Bill',
        url: '/bills/new',
        icons: [{ src: '/icons/bill-shortcut.png', sizes: '96x96' }],
      },
      {
        name: 'Shopping List',
        url: '/groceries',
        icons: [{ src: '/icons/grocery-shortcut.png', sizes: '96x96' }],
      },
    ],
    categories: ['productivity', 'finance', 'lifestyle'],
  };
}
```

**Custom Service Worker for Notification Handling:**

```javascript
// public/sw.js
const CACHE_NAME = 'household-v1';
const API_CACHE = 'api-cache-v1';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/bills',
        '/groceries',
        '/offline',
        '/icons/icon-192.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event (offline support)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API requests: Network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Static assets: Cache first
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [],
    data: data.data || {},
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const billId = event.notification.data.billId;
  
  let url = '/';
  
  if (action === 'pay') {
    url = `/bills/${billId}/pay`;
  } else if (action === 'schedule') {
    url = `/bills/${billId}/schedule`;
  } else if (action === 'snooze') {
    // Handle snooze via API
    fetch('/api/notifications/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId, snoozeHours: 2 }),
    });
    return;
  } else {
    url = `/bills/${billId}`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// Background sync event (for offline bill entry)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bills') {
    event.waitUntil(syncBills());
  }
});

async function syncBills() {
  // Get pending bills from IndexedDB
  const db = await openDB();
  const pendingBills = await db.getAll('pending_bills');
  
  for (const bill of pendingBills) {
    try {
      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
      });
      
      await db.delete('pending_bills', bill.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## ADR 6: Offline Sync Strategy

### Decision: Optimistic UI + Background Sync API

**Context:**  
User must be able to mark bills as paid, add grocery items offline. Data syncs when connection restored.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **RxDB** | Sophisticated sync | Heavy, complex |
| **PouchDB** | CouchDB protocol | Dated, large bundle |
| **Custom IndexedDB (chosen)** | Lightweight, full control | More code |

**Decision: Custom IndexedDB with Dexie.js + Background Sync API**

**Implementation:**

```typescript
// lib/sync/db.ts
import Dexie, { Table } from 'dexie';

export interface PendingBill {
  id: string;
  orgId: string;
  residenceId: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'pending_sync';
  createdAt: number;
}

export interface PendingAction {
  id: string;
  type: 'mark_paid' | 'add_bill' | 'update_inventory';
  payload: any;
  createdAt: number;
}

class HouseholdDB extends Dexie {
  pendingBills!: Table<PendingBill>;
  pendingActions!: Table<PendingAction>;

  constructor() {
    super('HouseholdDB');
    this.version(1).stores({
      pendingBills: 'id, orgId, residenceId, createdAt',
      pendingActions: '++id, type, createdAt',
    });
  }
}

export const db = new HouseholdDB();
```

**Optimistic UI Pattern:**

```typescript
// lib/sync/mutations.ts
export async function markBillPaid(
  billId: string,
  payment: { method: string; referenceNumber: string }
) {
  // Optimistic update in local state
  updateLocalBill(billId, { status: 'paid', ...payment });
  
  try {
    // Try network request
    const response = await fetch(`/api/bills/${billId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    
    if (!response.ok) throw new Error('Network request failed');
    
    return await response.json();
  } catch (error) {
    // Network failed, queue for background sync
    await db.pendingActions.add({
      type: 'mark_paid',
      payload: { billId, payment },
      createdAt: Date.now(),
    });
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-bills');
    }
    
    return { status: 'queued', billId };
  }
}
```

**Background Sync Handler:**

```typescript
// In service worker (public/sw.js)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bills') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  const db = await openDB('HouseholdDB');
  const actions = await db.getAll('pending_actions');
  
  for (const action of actions) {
    try {
      if (action.type === 'mark_paid') {
        await fetch(`/api/bills/${action.payload.billId}/pay`, {
          method: 'PATCH',
          body: JSON.stringify(action.payload.payment),
        });
      }
      // ... handle other action types
      
      // Success - remove from queue
      await db.delete('pending_actions', action.id);
    } catch (error) {
      console.error('Sync failed:', error);
      // Leave in queue for next sync
    }
  }
}
```

---

## ADR 7: UI Component Library

### Decision: Shadcn/ui + Tailwind CSS

**Context:**  
Need accessible, customizable components with ADHD-optimized visual design (high contrast, large touch targets, clear hierarchy).

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Material UI** | Comprehensive | Heavy, hard to customize |
| **Chakra UI** | Great a11y | Bundle size |
| **Shadcn/ui (chosen)** | Copy/paste, full control | Manual setup per component |

**Decision: Shadcn/ui + Tailwind CSS + Radix Primitives**

**Rationale:**
- Copy components into project (no runtime dependency)
- Full styling control for ADHD-optimized design
- Radix Primitives = accessible by default
- Tailwind = rapid iteration on visual urgency

**Installation:**

```bash
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
```

**ADHD-Optimized Design Tokens:**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Urgency color system
        urgency: {
          low: '#10b981', // green
          medium: '#f59e0b', // amber
          high: '#f97316', // orange
          critical: '#ef4444', // red
          emergency: '#dc2626', // dark red
        },
      },
      // Large touch targets for mobile
      spacing: {
        'touch': '44px', // iOS minimum
      },
      // Aggressive animations for attention
      keyframes: {
        'pulse-urgent': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
      },
      animation: {
        'pulse-urgent': 'pulse-urgent 1s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

**Critical Bill Card Component:**

```typescript
// components/bills/critical-bill-card.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CriticalBillCardProps {
  bill: Bill;
  daysUntil: number;
  onPay: () => void;
  onSchedule: () => void;
}

export function CriticalBillCard({ bill, daysUntil, onPay, onSchedule }: CriticalBillCardProps) {
  const urgency = getUrgencyLevel(bill, daysUntil);
  
  return (
    <Card
      className={cn(
        'p-6 border-2 transition-all',
        urgency === 'emergency' && 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-900 animate-pulse-urgent',
        urgency === 'critical' && 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-red-700',
        urgency === 'high' && 'bg-orange-100 border-orange-500',
        urgency === 'medium' && 'bg-yellow-100 border-yellow-500'
      )}
    >
      {/* Attention-grabbing header */}
      {urgency === 'emergency' && (
        <div className="text-5xl font-black mb-4 animate-bounce">
          🚨 OVERDUE 🚨
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">{bill.name}</h3>
          <p className="text-sm opacity-90">{bill.residence.name}</p>
          
          {bill.critical && (
            <Badge variant="destructive" className="mt-2">
              ⚠️ CRITICAL - No Remote Payment
            </Badge>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-4xl font-black">
            ₱{bill.amount.toLocaleString()}
          </div>
          <div className="text-lg font-bold">
            {daysUntil < 0 
              ? `${Math.abs(daysUntil)} days OVERDUE` 
              : daysUntil === 0 
              ? 'DUE TODAY' 
              : `${daysUntil} days left`}
          </div>
        </div>
      </div>
      
      {/* Reminder of last incident */}
      {bill.critical && urgency === 'emergency' && (
        <div className="bg-black bg-opacity-30 p-4 rounded-lg mb-4 text-sm">
          <div className="font-bold mb-1">Remember last time:</div>
          <div>• Emergency trip during typhoon</div>
          <div>• Spoiled food losses</div>
          <div>• Family safety risk</div>
          <div className="mt-2 font-bold text-yellow-300">CANNOT HAPPEN AGAIN</div>
        </div>
      )}
      
      {/* Action buttons - LARGE touch targets */}
      <div className="flex gap-3 mt-6">
        <Button 
          size="lg" 
          className="flex-1 h-touch text-xl font-bold"
          onClick={onPay}
        >
          💳 Pay Now
        </Button>
        
        {bill.requiresTravel && (
          <Button 
            size="lg" 
            variant="secondary"
            className="h-touch"
            onClick={onSchedule}
          >
            📅 Schedule Trip
          </Button>
        )}
      </div>
    </Card>
  );
}
```

---

## ADR 8: Weather Integration for Travel Safety

### Decision: OpenWeatherMap API with Caching

**Context:**  
For PELCO Magalang (requires travel), need to check weather forecast before suggesting trip dates.

**Implementation:**

```typescript
// lib/weather/client.ts
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

export interface WeatherForecast {
  date: string;
  condition: string;
  windSpeed: number; // m/s
  precipitation: number; // mm
  safe: boolean;
}

export async function getWeatherForecast(
  lat: number,
  lng: number,
  days: number = 5
): Promise<WeatherForecast[]> {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );
  
  const data = await response.json();
  
  return data.list.slice(0, days * 8).map((item: any) => ({
    date: item.dt_txt,
    condition: item.weather[0].main,
    windSpeed: item.wind.speed,
    precipitation: item.rain?.['3h'] || 0,
    safe: isSafeToTravel(item),
  }));
}

function isSafeToTravel(weatherData: any): boolean {
  const { wind, weather, rain } = weatherData;
  
  // Unsafe conditions
  if (wind.speed > 15) return false; // > 54 kph
  if (weather[0].main === 'Thunderstorm') return false;
  if (weather[0].description.toLowerCase().includes('typhoon')) return false;
  if (rain?.['3h'] > 20) return false; // Heavy rain
  
  return true;
}

// Usage in bill reminder logic
export async function shouldRecommendEarlyPayment(bill: Bill): Promise<{
  recommend: boolean;
  reason: string;
}> {
  if (!bill.requiresTravel) {
    return { recommend: false, reason: '' };
  }
  
  const daysUntil = getDaysUntilDue(bill.dueDate);
  
  // If bill is due in 3 days or less, check weather
  if (daysUntil <= 3) {
    const forecast = await getWeatherForecast(
      bill.residence.geofenceLat,
      bill.residence.geofenceLng,
      daysUntil
    );
    
    const hasUnsafeDays = forecast.some(day => !day.safe);
    
    if (hasUnsafeDays) {
      return {
        recommend: true,
        reason: `Bad weather forecasted. Travel conditions may be unsafe on due date.`,
      };
    }
  }
  
  return { recommend: false, reason: '' };
}
```

---

## ADR 9: Testing Strategy

### Decision: Vitest + Playwright (Critical Path Only)

**Context:**  
Limited time, need to test mission-critical flows (notification delivery, bill payment) but can't test everything.

**Testing Priorities:**

1. **Notification delivery** (most critical)
2. **Bill payment flow** (offline → online sync)
3. **Authentication** (security)
4. ~~UI styling~~ (manual QA)
5. ~~Edge cases~~ (log and fix in production)

**Implementation:**

```typescript
// __tests__/notifications.test.ts
import { describe, it, expect, vi } from 'vitest';
import { sendNotification, getUrgencyLevel } from '@/lib/notifications';

describe('Notification System', () => {
  it('should escalate urgency for critical bills', () => {
    const criticalBill = {
      id: '1',
      critical: true,
      noRemotePayment: true,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    };
    
    const urgency = getUrgencyLevel(criticalBill, 2);
    expect(urgency).toBe('high');
  });
  
  it('should trigger SMS for emergency bills', async () => {
    const sendSMS = vi.fn();
    
    await sendNotification(user, emergencyBill, 'emergency', {
      channels: ['web_push', 'sms'],
    });
    
    expect(sendSMS).toHaveBeenCalledWith(
      user.phoneNumber,
      expect.stringContaining('DUE TODAY')
    );
  });
});
```

**E2E Tests (Playwright):**

```typescript
// e2e/bill-payment.spec.ts
import { test, expect } from '@playwright/test';

test('critical bill payment flow', async ({ page, context }) => {
  // Grant notification permission
  await context.grantPermissions(['notifications']);
  
  await page.goto('/bills');
  
  // Check for critical bill alert
  const criticalBill = page.locator('[data-urgency="critical"]').first();
  await expect(criticalBill).toBeVisible();
  
  // Click "Pay Now"
  await criticalBill.locator('button', { hasText: 'Pay Now' }).click();
  
  // Fill payment details
  await page.fill('[name="paymentMethod"]', 'GCash');
  await page.fill('[name="referenceNumber"]', '1234567890');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Check for success message
  await expect(page.locator('text=Payment Recorded')).toBeVisible();
  
  // Verify bill status updated
  const billStatus = await page.locator('[data-bill-id="1"] [data-status]').textContent();
  expect(billStatus).toBe('paid');
});
```

---

## ADR 10: Deployment & Monitoring

### Decision: Vercel + Sentry + Axiom Logs

**Context:**  
Need zero-config deployment with observability for debugging notification failures.

**Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add NEON_DATABASE_URL
vercel env add JWT_SECRET
vercel env add VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add OPENWEATHER_API_KEY
```

**Monitoring Setup:**

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  
  // Critical: track notification failures
  beforeSend(event, hint) {
    if (event.tags?.component === 'notifications') {
      // Always send notification errors
      return event;
    }
    
    // Sample other errors
    return Math.random() < 0.1 ? event : null;
  },
});

// Usage
export function trackNotificationFailure(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: { component: 'notifications' },
    contexts: {
      notification: context,
    },
  });
}
```

**Logging:**

```typescript
// lib/monitoring/logger.ts
import { Logger } from 'next-axiom';

export const log = new Logger();

// Log all notification attempts
export function logNotificationAttempt(
  userId: string,
  billId: string,
  urgency: string,
  success: boolean
) {
  log.info('notification_sent', {
    userId,
    billId,
    urgency,
    success,
    timestamp: new Date().toISOString(),
  });
}

// Export logs to Axiom
export async function flush() {
  await log.flush();
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Authentication + Bill CRUD + Basic notifications

**Tasks:**
1. ✅ Initialize Next.js project
2. ✅ Set up Neon database + Drizzle ORM
3. ✅ Implement auth (JWT + cookies)
4. ✅ Build bills table + API routes
5. ✅ Create bill list UI (shadcn components)
6. ✅ Set up Web Push (VAPID keys)
7. ✅ Deploy to Vercel

**Acceptance Criteria:**
- User can sign up, log in
- User can add MERALCO + PELCO bills
- User receives test push notification

---

### Phase 2: Critical Notifications (Week 3)

**Goal:** Mission-critical notification system for PELCO

**Tasks:**
1. ✅ Implement notification urgency levels
2. ✅ Create Vercel Cron job for bill reminders
3. ✅ Add SMS fallback (Twilio)
4. ✅ Build "acknowledge" requirement for critical bills
5. ✅ Add notification audit log
6. ✅ Create critical bill UI (animated, persistent)

**Acceptance Criteria:**
- PELCO bill due in 2 days → HIGH urgency notification
- Notification cannot be dismissed without acknowledgment
- SMS sent for critical bills
- All notifications logged in database

---

### Phase 3: Weather Integration + Trip Scheduler (Week 4)

**Goal:** Prevent typhoon emergency trips

**Tasks:**
1. ✅ Integrate OpenWeatherMap API
2. ✅ Build "should recommend early payment" logic
3. ✅ Create trip scheduler UI
4. ✅ Add day-before trip reminder
5. ✅ Display weather forecast in bill details

**Acceptance Criteria:**
- PELCO due in 3 days + typhoon forecast → EMERGENCY notification
- User can schedule trip with checklist
- Reminder sent day before scheduled trip
- Weather forecast visible when planning

---

### Phase 4: Offline Support + PWA (Week 5)

**Goal:** App works offline, installs like native

**Tasks:**
1. ✅ Set up next-pwa
2. ✅ Implement IndexedDB for offline storage
3. ✅ Build optimistic UI for bill payment
4. ✅ Add background sync for queued actions
5. ✅ Create offline indicator
6. ✅ Test install flow on iOS/Android

**Acceptance Criteria:**
- App loads instantly on repeat visits
- User can mark bill as paid offline → syncs when online
- "Add to Home Screen" prompt appears
- App icon appears on phone home screen

---

### Phase 5: Grocery/Inventory (Week 6-7)

**Goal:** Shopping list + inventory tracking

**Tasks:**
1. ✅ Create grocery schema (shopping_list_items, inventory_items)
2. ✅ Build shopping list UI
3. ✅ Add "I'm shopping" mode with quick check-off
4. ✅ Implement post-shopping inventory update
5. ✅ Add low-stock alerts
6. ✅ Build "auto-generate list" from low stock

**Acceptance Criteria:**
- User can create shopping list for SM trip
- User can check off items while shopping (offline)
- After trip, inventory auto-updates
- Low-stock items trigger notification

---

### Phase 6: Multi-Residence Context (Week 8)

**Goal:** Prioritize tasks based on current location

**Tasks:**
1. ✅ Add residence selector UI
2. ✅ Implement "priority filtering" (current residence first)
3. ✅ Add residence indicators to bill/grocery cards
4. ✅ Build residence switcher with localStorage persistence

**Acceptance Criteria:**
- Bills/groceries sorted by current residence
- Visual indicator shows "at this residence"
- Residence selection persists across sessions

---

### Phase 7: Spouse Collaboration (Week 9)

**Goal:** Turn system into team tool

**Tasks:**
1. ✅ Add spouse invitation flow
2. ✅ Build shared activity feed
3. ✅ Implement "send appreciation" feature
4. ✅ Add spouse escalation for unacknowledged critical bills
5. ✅ Create spouse dashboard (see partner's upcoming tasks)

**Acceptance Criteria:**
- Spouse can create account under same org
- Both see shared bills/groceries
- Spouse receives escalation if primary user doesn't acknowledge critical bill
- Activity feed shows "X paid MERALCO"

---

## Environment Variables

```bash
# .env.local

# Database
NEON_DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="generate-with-openssl-rand-base64-32"

# Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Weather
OPENWEATHER_API_KEY="..."

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="..."
AXIOM_TOKEN="..."

# Optional
NODE_ENV="production"
```

---

## Success Metrics

### Week 4 (MVP):
- ✅ Zero PELCO bill lapses (test for 1 month)
- ✅ User opens app daily
- ✅ Notifications delivered within 1 minute of trigger
- ✅ Spouse sees user engagement in system

### Month 2:
- ✅ Zero emergency trips to Magalang
- ✅ All bills paid on time
- ✅ Spouse says "I can see you're trying"
- ✅ User trusts system enough to rely on it

### Month 3:
- ✅ "Weaponized incompetence" accusation stops
- ✅ System becomes default household management tool
- ✅ Both spouses using it collaboratively

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **iOS Safari notification issues** | High | Critical | SMS fallback + persistent in-app alerts |
| **User dismisses notifications** | Medium | Critical | Require acknowledgment + spouse escalation |
| **Vercel Cron unreliable** | Low | Critical | Add monitoring + manual trigger endpoint |
| **SMS costs exceed budget** | Medium | Low | Limit to critical/emergency only |
| **User doesn't open app** | Medium | High | Daily persistent notification "Check app" |

---

## Conclusion

This ADR documents a **notification-first, ADHD-optimized, multi-residence household management system** designed to prevent catastrophic failures through aggressive, multi-layered alerts.

**Key Architectural Decisions:**
1. Next.js App Router for hybrid SSR/client rendering
2. Neon Postgres for serverless database with multi-tenancy
3. Mission-critical notifications with Web Push + SMS fallback
4. Offline-first PWA with optimistic UI
5. Weather integration for travel safety
6. Spouse collaboration without surveillance dynamics

**Next Steps:**
1. Initialize project: `npx create-next-app@latest household-manager`
2. Set up Neon database + Drizzle
3. Implement Phase 1 (auth + bills + notifications)
4. Deploy to Vercel
5. Test notification delivery on real device
6. Iterate based on actual usage

**Critical Success Factor:** The notification system MUST be reliable. If notifications are missed, the entire system fails. Everything else is secondary.

---

**Approval Required From:**
- [x] Development Team (you)
- [ ] Spouse (show prototype after Phase 2)
- [ ] UP PGH Psychiatrist (after diagnosis, discuss as coping tool)

---

## ADR 11: Domain Expansion - Complete Household Tracking

### Decision: Modular Domain Architecture with Shared Notification Engine

**Context:**  
Original requirements include 11 distinct tracking domains:
1. ✅ **Bills** (utilities, telecoms) - *Addressed in Phase 1-3*
2. ✅ **Groceries/Inventory** - *Addressed in Phase 5*
3. ❌ **Property Taxes**
4. ❌ **Rent**
5. ❌ **HOA Fees**
6. ❌ **Car Repairs/Maintenance**
7. ❌ **Home Repairs**
8. ❌ **Medical Records** (human + vet)
9. ❌ **Educational Credentials** (kids + parents)
10. ❌ **Book Library**
11. ❌ **Appliance/Electronics Warranties**

**Problem:** Each domain has unique data models, reminder logic, and urgency levels. Need unified architecture that prevents "another brainstorming session" for each new domain.

---

### Complete Schema Design

```typescript
// drizzle/schema.ts - COMPLETE DOMAIN MODELS

// ==================== PROPERTY TAXES ====================
export const propertyTaxes = pgTable('property_taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // Property details
  propertyAddress: text('property_address').notNull(),
  taxIdNumber: text('tax_id_number'), // "TD No." or "ARP No."
  assessedValue: decimal('assessed_value', { precision: 12, scale: 2 }),
  
  // Tax details
  annualTaxAmount: decimal('annual_tax_amount', { precision: 10, scale: 2 }).notNull(),
  paymentSchedule: text('payment_schedule', { 
    enum: ['annual', 'quarterly'] 
  }).default('annual'),
  
  // Due dates
  dueDate: timestamp('due_date').notNull(),
  discountDeadline: timestamp('discount_deadline'), // Early payment discount
  penaltyStartDate: timestamp('penalty_start_date'),
  
  // Status
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  lastPaidDate: timestamp('last_paid_date'),
  lastPaidAmount: decimal('last_paid_amount', { precision: 10, scale: 2 }),
  receiptNumber: text('receipt_number'),
  
  // Documents
  taxDeclarationPath: text('tax_declaration_path'), // PDF/image path
  officialReceiptPath: text('official_receipt_path'),
  
  // Criticality
  consequenceSeverity: integer('consequence_severity').default(9), // High - property lien
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== RENT ====================
export const rentPayments = pgTable('rent_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // Landlord details
  landlordName: text('landlord_name').notNull(),
  landlordContact: text('landlord_contact'),
  
  // Rent details
  monthlyRent: decimal('monthly_rent', { precision: 10, scale: 2 }).notNull(),
  dueDay: integer('due_day').default(1), // 1st of month
  gracePeriodDays: integer('grace_period_days').default(5),
  lateFee: decimal('late_fee', { precision: 10, scale: 2 }),
  
  // Contract
  leaseStartDate: timestamp('lease_start_date').notNull(),
  leaseEndDate: timestamp('lease_end_date'),
  autoRenew: boolean('auto_renew').default(false),
  contractPath: text('contract_path'), // Lease agreement
  
  // Current period
  currentDueDate: timestamp('current_due_date').notNull(),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  lastPaidDate: timestamp('last_paid_date'),
  paymentMethod: text('payment_method'),
  referenceNumber: text('reference_number'),
  
  // Criticality
  consequenceSeverity: integer('consequence_severity').default(10), // Critical - eviction risk
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== HOA FEES ====================
export const hoaFees = pgTable('hoa_fees', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // HOA details
  hoaName: text('hoa_name').notNull(),
  hoaContact: text('hoa_contact'),
  unitNumber: text('unit_number'),
  
  // Fee details
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }).notNull(),
  specialAssessments: decimal('special_assessments', { precision: 10, scale: 2 }).default('0'),
  dueDay: integer('due_day').default(15),
  
  // Status
  currentDueDate: timestamp('current_due_date').notNull(),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
  lastPaidDate: timestamp('last_paid_date'),
  paymentMethod: text('payment_method'),
  referenceNumber: text('reference_number'),
  
  // Criticality
  consequenceSeverity: integer('consequence_severity').default(7), // Medium-high
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== VEHICLE MAINTENANCE ====================
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  // Vehicle details
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  plateNumber: text('plate_number').notNull(),
  vin: text('vin'),
  
  // Ownership
  primaryDriver: uuid('primary_driver').references(() => users.id),
  purchaseDate: timestamp('purchase_date'),
  currentOdometer: integer('current_odometer'), // km
  
  // Documents
  registrationExpiry: timestamp('registration_expiry'),
  insuranceExpiry: timestamp('insurance_expiry'),
  registrationPath: text('registration_path'),
  insurancePath: text('insurance_path'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const vehicleMaintenance = pgTable('vehicle_maintenance', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  
  // Maintenance type
  type: text('type', { 
    enum: ['oil_change', 'tire_rotation', 'brake_service', 'inspection', 'repair', 'other'] 
  }).notNull(),
  description: text('description').notNull(),
  
  // Scheduling
  lastServiceDate: timestamp('last_service_date'),
  lastServiceOdometer: integer('last_service_odometer'),
  nextServiceDue: timestamp('next_service_due'),
  nextServiceOdometer: integer('next_service_odometer'),
  recurrenceKm: integer('recurrence_km'), // e.g., every 5000 km
  recurrenceMonths: integer('recurrence_months'), // e.g., every 6 months
  
  // Service details
  servicedAt: text('serviced_at'), // Shop name
  cost: decimal('cost', { precision: 10, scale: 2 }),
  receiptPath: text('receipt_path'),
  
  // Status
  status: text('status', { enum: ['upcoming', 'overdue', 'completed'] }).default('upcoming'),
  
  // Criticality (safety-related = high)
  consequenceSeverity: integer('consequence_severity').default(5),
  criticalSafety: boolean('critical_safety').default(false), // brakes, tires
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== HOME REPAIRS ====================
export const homeRepairs = pgTable('home_repairs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // Repair details
  type: text('type', { 
    enum: ['plumbing', 'electrical', 'hvac', 'roofing', 'structural', 'cosmetic', 'other'] 
  }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location'), // "Master bedroom", "Kitchen sink"
  
  // Urgency
  priority: text('priority', { enum: ['low', 'medium', 'high', 'emergency'] }).default('medium'),
  reportedDate: timestamp('reported_date').defaultNow(),
  targetCompletionDate: timestamp('target_completion_date'),
  
  // Service
  contractorName: text('contractor_name'),
  contractorContact: text('contractor_contact'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }),
  
  // Status
  status: text('status', { 
    enum: ['reported', 'scheduled', 'in_progress', 'completed', 'deferred'] 
  }).default('reported'),
  completedDate: timestamp('completed_date'),
  
  // Documentation
  beforePhotos: text('before_photos').array(),
  afterPhotos: text('after_photos').array(),
  invoicePath: text('invoice_path'),
  warrantyInfo: text('warranty_info'),
  warrantyExpiry: timestamp('warranty_expiry'),
  
  // Recurring maintenance
  recurringTask: boolean('recurring_task').default(false),
  recurrenceMonths: integer('recurrence_months'),
  nextDueDate: timestamp('next_due_date'),
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== MEDICAL RECORDS ====================
export const familyMembers = pgTable('family_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  name: text('name').notNull(),
  type: text('type', { enum: ['human', 'pet'] }).default('human'),
  relationship: text('relationship'), // 'self', 'spouse', 'child', 'dog', 'cat'
  
  // Basic info
  dateOfBirth: timestamp('date_of_birth'),
  bloodType: text('blood_type'),
  allergies: text('allergies').array(),
  chronicConditions: text('chronic_conditions').array(),
  
  // For pets
  species: text('species'),
  breed: text('breed'),
  
  // Emergency contact
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  
  photo: text('photo'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const medicalRecords = pgTable('medical_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  familyMemberId: uuid('family_member_id').references(() => familyMembers.id, { onDelete: 'cascade' }).notNull(),
  
  // Record type
  type: text('type', { 
    enum: ['checkup', 'vaccination', 'prescription', 'lab_result', 'diagnosis', 'procedure', 'other'] 
  }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  
  // Visit details
  visitDate: timestamp('visit_date').notNull(),
  provider: text('provider'), // Doctor/clinic/vet name
  facility: text('facility'),
  
  // Prescriptions
  medications: jsonb('medications').$type<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
  }[]>(),
  
  // Follow-up
  followUpRequired: boolean('follow_up_required').default(false),
  followUpDate: timestamp('follow_up_date'),
  followUpStatus: text('follow_up_status', { enum: ['pending', 'scheduled', 'completed'] }),
  
  // Documents
  documentPaths: text('document_paths').array(),
  
  // Vaccinations (reminder system)
  nextVaccinationDue: timestamp('next_vaccination_due'),
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== EDUCATIONAL CREDENTIALS ====================
export const educationalCredentials = pgTable('educational_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  familyMemberId: uuid('family_member_id').references(() => familyMembers.id, { onDelete: 'cascade' }).notNull(),
  
  // Credential type
  type: text('type', { 
    enum: ['diploma', 'certificate', 'transcript', 'license', 'test_result', 'enrollment', 'other'] 
  }).notNull(),
  title: text('title').notNull(),
  institution: text('institution').notNull(),
  
  // Dates
  issueDate: timestamp('issue_date'),
  completionDate: timestamp('completion_date'),
  expiryDate: timestamp('expiry_date'), // For licenses/certifications
  
  // Details
  credentialNumber: text('credential_number'),
  grade: text('grade'), // "High honors", "Passed", GPA
  
  // Renewal tracking
  requiresRenewal: boolean('requires_renewal').default(false),
  nextRenewalDate: timestamp('next_renewal_date'),
  renewalReminderMonths: integer('renewal_reminder_months').default(3),
  
  // Documents
  documentPaths: text('document_paths').array().notNull(),
  verificationUrl: text('verification_url'),
  
  // Organization (for kids)
  schoolYear: text('school_year'), // "2024-2025"
  gradeLevel: text('grade_level'), // "Grade 5", "1st Year College"
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== BOOK LIBRARY ====================
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }),
  
  // Book details
  title: text('title').notNull(),
  author: text('author').notNull(),
  isbn: text('isbn'),
  publisher: text('publisher'),
  publishYear: integer('publish_year'),
  
  // Physical details
  format: text('format', { enum: ['hardcover', 'paperback', 'ebook', 'audiobook'] }).default('paperback'),
  condition: text('condition', { enum: ['new', 'like_new', 'good', 'fair', 'poor'] }),
  
  // Organization
  genre: text('genre'), // "Fiction", "Technical", "Children's"
  category: text('category').array(), // Tags: "web dev", "parenting", "fantasy"
  location: text('location'), // "Living room shelf", "Bedroom nightstand"
  
  // Ownership
  ownedBy: uuid('owned_by').references(() => users.id),
  purchaseDate: timestamp('purchase_date'),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  
  // Lending tracking
  status: text('status', { enum: ['owned', 'lent', 'borrowed', 'sold', 'donated'] }).default('owned'),
  lentTo: text('lent_to'),
  lentDate: timestamp('lent_date'),
  expectedReturnDate: timestamp('expected_return_date'),
  
  // Reading tracking
  readingStatus: text('reading_status', { enum: ['to_read', 'reading', 'completed', 'abandoned'] }).default('to_read'),
  startedReading: timestamp('started_reading'),
  finishedReading: timestamp('finished_reading'),
  rating: integer('rating'), // 1-5 stars
  
  // Cover
  coverImageUrl: text('cover_image_url'),
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== APPLIANCE/ELECTRONICS WARRANTIES ====================
export const appliances = pgTable('appliances', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }).notNull(),
  
  // Appliance details
  category: text('category', { 
    enum: ['major_appliance', 'kitchen', 'electronics', 'hvac', 'other'] 
  }).notNull(),
  type: text('type').notNull(), // "Refrigerator", "Washing Machine", "TV", "Laptop"
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  serialNumber: text('serial_number'),
  
  // Purchase info
  purchaseDate: timestamp('purchase_date').notNull(),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  purchasedFrom: text('purchased_from'), // "SM Appliance", "Lazada"
  receiptPath: text('receipt_path'),
  
  // Location
  location: text('location'), // "Kitchen", "Living room", "Master bedroom"
  
  // Warranty
  warrantyType: text('warranty_type', { enum: ['manufacturer', 'extended', 'store', 'none'] }).default('manufacturer'),
  warrantyDuration: integer('warranty_duration'), // months
  warrantyExpiry: timestamp('warranty_expiry').notNull(),
  warrantyProvider: text('warranty_provider'),
  warrantyDocumentPath: text('warranty_document_path'),
  
  // Service history
  lastServiceDate: timestamp('last_service_date'),
  nextServiceDue: timestamp('next_service_due'),
  servicePlan: text('service_plan'), // "Annual cleaning", etc.
  
  // Status
  status: text('status', { enum: ['active', 'needs_service', 'broken', 'disposed'] }).default('active'),
  
  // Criticality (refrigerator breaking = emergency)
  consequenceSeverity: integer('consequence_severity').default(5),
  
  notes: text('notes'),
  manualPath: text('manual_path'), // PDF of user manual
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const applianceRepairs = pgTable('appliance_repairs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  applianceId: uuid('appliance_id').references(() => appliances.id, { onDelete: 'cascade' }).notNull(),
  
  // Repair details
  issueDescription: text('issue_description').notNull(),
  reportedDate: timestamp('reported_date').defaultNow(),
  
  // Service
  servicedBy: text('serviced_by'), // Technician/company name
  serviceDate: timestamp('service_date'),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  coveredByWarranty: boolean('covered_by_warranty').default(false),
  
  // Status
  status: text('status', { 
    enum: ['reported', 'scheduled', 'in_progress', 'completed', 'unfixable'] 
  }).default('reported'),
  
  // Documentation
  invoicePath: text('invoice_path'),
  beforePhotos: text('before_photos').array(),
  afterPhotos: text('after_photos').array(),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## Updated Implementation Roadmap

### Phase 1-4: **Foundation** (Weeks 1-5)
*Already defined - Bills, Groceries, Notifications, PWA*

---

### Phase 5: **Property & Rent** (Week 6)

**Goal:** Track property taxes, rent, HOA fees (all "housing costs")

**Tasks:**
1. ✅ Implement property taxes, rent, HOA schemas
2. ✅ Build unified "Housing Costs" dashboard
3. ✅ Add document upload for receipts/contracts
4. ✅ Implement expiry tracking (lease end dates)
5. ✅ Add high-urgency reminders (rent = eviction risk)

**UI:**
```typescript
// app/housing/page.tsx
<HousingDashboard>
  <Section title="Upcoming Payments">
    <RentCard dueDate="Dec 1" amount={25000} status="pending" />
    <PropertyTaxCard dueDate="Jan 15" amount={8500} residence="QC" />
    <HOACard dueDate="Dec 15" amount={3500} residence="Magalang" />
  </Section>
  
  <Section title="Expiring Soon">
    <Alert>Magalang lease expires in 45 days</Alert>
  </Section>
</HousingDashboard>
```

---

### Phase 6: **Vehicle Maintenance** (Week 7)

**Goal:** Track car registration, insurance, oil changes, repairs

**Tasks:**
1. ✅ Implement vehicles + vehicle_maintenance schemas
2. ✅ Build vehicle profile pages
3. ✅ Add odometer-based reminders ("Oil change due at 45,000 km")
4. ✅ Track registration/insurance expiry
5. ✅ Add service history timeline

**Notification Logic:**
```typescript
// lib/notifications/vehicle.ts
export async function checkVehicleReminders() {
  const vehicles = await db.query.vehicles.findMany();
  
  for (const vehicle of vehicles) {
    // Registration expiring soon
    const daysUntilRegExpiry = getDaysUntil(vehicle.registrationExpiry);
    if (daysUntilRegExpiry <= 30) {
      await sendNotification({
        urgency: 'high',
        title: `${vehicle.make} ${vehicle.model} Registration Due`,
        body: `Registration expires in ${daysUntilRegExpiry} days`,
      });
    }
    
    // Odometer-based maintenance
    const maintenance = await db.query.vehicleMaintenance.findMany({
      where: eq(vehicleMaintenance.vehicleId, vehicle.id),
    });
    
    for (const task of maintenance) {
      if (task.nextServiceOdometer) {
        const kmRemaining = task.nextServiceOdometer - vehicle.currentOdometer;
        if (kmRemaining <= 500) {
          await sendNotification({
            urgency: task.criticalSafety ? 'critical' : 'medium',
            title: `${vehicle.plateNumber} - ${task.description} Due`,
            body: `Due in ${kmRemaining} km`,
          });
        }
      }
    }
  }
}
```

**UI:**
```typescript
// app/vehicles/[id]/page.tsx
<VehicleProfile vehicle={vehicle}>
  <MaintenanceTimeline>
    <Task 
      title="Oil Change" 
      due="45,000 km" 
      current="43,200 km" 
      urgent={true} 
    />
    <Task 
      title="Tire Rotation" 
      due="Jan 15, 2025" 
      status="scheduled" 
    />
  </MaintenanceTimeline>
  
  <ExpiryAlerts>
    <Alert type="critical">Registration expires in 12 days</Alert>
    <Alert type="warning">Insurance expires in 45 days</Alert>
  </ExpiryAlerts>
</VehicleProfile>
```

---

### Phase 7: **Home Repairs** (Week 8)

**Goal:** Track household repairs, recurring maintenance

**Tasks:**
1. ✅ Implement home_repairs schema
2. ✅ Build repair ticket system
3. ✅ Add priority/urgency indicators
4. ✅ Track contractor info + costs
5. ✅ Add before/after photo upload
6. ✅ Implement recurring tasks (HVAC filter every 3 months)

**UI:**
```typescript
// app/repairs/page.tsx
<RepairsDashboard>
  <UrgentRepairs>
    <RepairCard 
      title="Kitchen sink leak" 
      priority="emergency" 
      reportedDate="2 days ago"
      estimatedCost={5000}
    />
  </UrgentRepairs>
  
  <ScheduledMaintenance>
    <Task title="HVAC filter replacement" dueDate="Jan 1" recurring="quarterly" />
    <Task title="Gutter cleaning" dueDate="Feb 15" recurring="biannual" />
  </ScheduledMaintenance>
  
  <CompletedRepairs>
    <Timeline />
  </CompletedRepairs>
</RepairsDashboard>
```

---

### Phase 8: **Medical & Vet Records** (Week 9)

**Goal:** Track family health records, vaccination schedules

**Tasks:**
1. ✅ Implement family_members + medical_records schemas
2. ✅ Build family member profiles (humans + pets)
3. ✅ Add vaccination tracker
4. ✅ Track prescriptions with refill reminders
5. ✅ Add follow-up appointment reminders
6. ✅ Secure document storage (health records = sensitive)

**Privacy Note:** Encrypt medical records at rest using pgcrypto

```sql
-- Migration for encrypted medical records
ALTER TABLE medical_records 
ADD COLUMN description_encrypted BYTEA;

-- Encrypt on insert
INSERT INTO medical_records (description_encrypted) 
VALUES (pgp_sym_encrypt('Diagnosis details', 'encryption_key'));

-- Decrypt on read
SELECT pgp_sym_decrypt(description_encrypted, 'encryption_key') 
FROM medical_records;
```

**UI:**
```typescript
// app/health/page.tsx
<HealthDashboard>
  <FamilyMembers>
    <MemberCard name="Your Name" type="human">
      <UpcomingAppointments>
        <Appointment date="Jan 10" provider="Dr. Santos" type="Checkup" />
      </UpcomingAppointments>
      <Prescriptions>
        <Rx medication="Metformin" refillDue="Jan 5" />
      </Prescriptions>
    </MemberCard>
    
    <MemberCard name="Dog Name" type="pet" species="dog">
      <VaccinationSchedule>
        <Vaccine name="Rabies" due="Feb 1" status="overdue" />
      </VaccinationSchedule>
    </MemberCard>
  </FamilyMembers>
</HealthDashboard>
```

---

### Phase 9: **Educational Credentials** (Week 10)

**Goal:** Track diplomas, licenses, kids' school records

**Tasks:**
1. ✅ Implement educational_credentials schema
2. ✅ Build credential vault (secure document storage)
3. ✅ Add expiry tracking for professional licenses
4. ✅ Track kids' enrollment, report cards
5. ✅ Add renewal reminders (PRC licenses, driver's licenses)

**UI:**
```typescript
// app/credentials/page.tsx
<CredentialVault>
  <FamilyMember name="Your Name">
    <Credentials>
      <Credential 
        type="Professional License" 
        title="Geodetic Engineer License"
        number="123456"
        expiryDate="Dec 2025"
        status="expiring_soon"
      />
      <Credential 
        type="Driver's License"
        expiryDate="Mar 2027"
      />
    </Credentials>
  </FamilyMember>
  
  <FamilyMember name="Child 1">
    <Credentials>
      <Credential 
        type="Report Card" 
        title="Grade 5 - Q2"
        grade="With Honors"
        issueDate="Dec 2024"
      />
      <Credential 
        type="Enrollment"
        title="SY 2024-2025"
        institution="XYZ Elementary"
      />
    </Credentials>
  </FamilyMember>
</CredentialVault>
```

---

### Phase 10: **Book Library** (Week 11)

**Goal:** Track books, prevent buying duplicates, manage lending

**Tasks:**
1. ✅ Implement books schema
2. ✅ Add ISBN lookup (Google Books API)
3. ✅ Build library catalog with search
4. ✅ Track lending/borrowing
5. ✅ Add reading progress tracking
6. ✅ Implement "lent book" reminders

**UI:**
```typescript
// app/library/page.tsx
<BookLibrary>
  <SearchBar placeholder="Search by title, author, ISBN..." />
  
  <Tabs>
    <Tab label="My Books">
      <BookGrid>
        <BookCard 
          title="Clean Code"
          author="Robert Martin"
          status="reading"
          progress="45%"
        />
      </BookGrid>
    </Tab>
    
    <Tab label="Lent Out">
      <LentBooks>
        <BookCard 
          title="Atomic Habits"
          lentTo="Friend Name"
          lentDate="Nov 15"
          overdue={true}
        />
      </LentBooks>
    </Tab>
  </Tabs>
  
  <QuickAdd>
    <button>Scan ISBN</button>
  </QuickAdd>
</BookLibrary>
```

**Notification Logic:**
```typescript
// Remind about lent books
export async function checkLentBooks() {
  const lentBooks = await db.query.books.findMany({
    where: eq(books.status, 'lent'),
  });
  
  for (const book of lentBooks) {
    const daysOut = getDaysSince(book.lentDate);
    
    if (daysOut > 30) { // 30 days = gentle reminder
      await sendNotification({
        urgency: 'low',
        title: `📚 Lent Book Reminder`,
        body: `"${book.title}" has been lent to ${book.lentTo} for ${daysOut} days`,
      });
    }
  }
}
```

---

### Phase 11: **Appliances & Warranties** (Week 12)

**Goal:** Track warranty expiries, service schedules

**Tasks:**
1. ✅ Implement appliances + appliance_repairs schemas
2. ✅ Build appliance inventory
3. ✅ Add warranty expiry tracker
4. ✅ Upload manuals/receipts
5. ✅ Track repair history
6. ✅ Add "warranty expiring" notifications

**UI:**
```typescript
// app/appliances/page.tsx
<ApplianceDashboard>
  <WarrantyExpiring>
    <ApplianceCard 
      type="Refrigerator"
      brand="Samsung"
      warrantyExpiry="Jan 20, 2025"
      daysLeft={12}
      urgent={true}
    />
  </WarrantyExpiring>
  
  <ByRoom>
    <Room name="Kitchen">
      <Appliance name="Refrigerator" status="active" />
      <Appliance name="Microwave" status="needs_service" />
    </Room>
    
    <Room name="Living Room">
      <Appliance name="TV" status="active" />
      <Appliance name="Air Con" nextService="Feb 1" />
    </Room>
  </ByRoom>
  
  <RepairHistory>
    <Timeline />
  </RepairHistory>
</ApplianceDashboard>
```

**Critical Notification:**
```typescript
// Refrigerator breaking = emergency
export async function checkApplianceStatus() {
  const criticalAppliances = await db.query.appliances.findMany({
    where: and(
      gte(appliances.consequenceSeverity, 8),
      eq(appliances.status, 'needs_service')
    ),
  });
  
  for (const appliance of criticalAppliances) {
    await sendNotification({
      urgency: 'critical',
      title: `⚠️ ${appliance.type} Needs Immediate Service`,
      body: `${appliance.brand} ${appliance.model} at ${appliance.residence.name}`,
      channels: ['web_push', 'in_app', 'sms'], // SMS because food spoilage risk
    });
  }
}
```

---

## Unified Notification Scheduler

**All domains feed into single notification engine:**

```typescript
// lib/notifications/scheduler.ts
export async function checkAllReminders() {
  // Run in parallel
  await Promise.all([
    checkBillReminders(),         // Phase 1
    checkGroceryRestocking(),     // Phase 5
    checkPropertyTaxes(),         // Phase 5 (new)
    checkRentPayments(),          // Phase 5 (new)
    checkHOAFees(),              // Phase 5 (new)
    checkVehicleReminders(),     // Phase 6 (new)
    checkHomeRepairs(),          // Phase 7 (new)
    checkMedicalFollowUps(),     // Phase 8 (new)
    checkVaccinationDues(),      // Phase 8 (new)
    checkCredentialExpiries(),   // Phase 9 (new)
    checkLentBooks(),            // Phase 10 (new)
    checkWarrantyExpiries(),     // Phase 11 (new)
  ]);
}

// Vercel Cron endpoint remains same
// app/api/notifications/cron/route.ts
export async function GET(request: Request) {
  const isValidCron = verifySignature(request);
  if (!isValidCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  await checkAllReminders();
  
  return NextResponse.json({ success: true });
}
```

---

## Unified Search (Phase 6 RAG Integration)

**Once all domains are tracked, add semantic search:**

```typescript
// app/search/page.tsx
<UniversalSearch>
  <SearchBar 
    placeholder="Ask anything: 'when did we last service the car?' or 'where is my PRC license?'"
    onSearch={handleSemanticSearch}
  />
  
  <Results>
    <Result 
      type="vehicle_maintenance"
      title="Honda Civic - Oil Change"
      date="Nov 15, 2024"
      relevance={0.95}
    />
    <Result 
      type="educational_credential"
      title="PRC Geodetic Engineer License"
      location="Credential Vault"
      expiryDate="Dec 2025"
      relevance={0.89}
    />
  </Results>
</UniversalSearch>
```

**Implementation:**
```typescript
// Use pgvector for semantic search across ALL domains
export async function semanticSearch(query: string) {
  const embedding = await generateEmbedding(query);
  
  // Search across all tables with embeddings
  const [billResults, repairResults, medicalResults, ...] = await Promise.all([
    db.execute(sql`
      SELECT *, embedding <=> ${embedding} AS distance
      FROM bills
      ORDER BY distance
      LIMIT 3
    `),
    db.execute(sql`
      SELECT *, embedding <=> ${embedding} AS distance
      FROM home_repairs
      ORDER BY distance
      LIMIT 3
    `),
    // ... all other tables
  ]);
  
  // Combine and rank results
  return rankResults([...billResults, ...repairResults, ...]);
}
```

---

## Updated Final Roadmap

| Phase | Weeks | Domains | Status |
|-------|-------|---------|--------|
| 1-4 | 1-5 | Bills, Groceries, Notifications, PWA | ✅ In ADR |
| 5 | 6 | Property Taxes, Rent, HOA | ✅ Added |
| 6 | 7 | Vehicle Maintenance | ✅ Added |
| 7 | 8 | Home Repairs | ✅ Added |
| 8 | 9 | Medical/Vet Records | ✅ Added |
| 9 | 10 | Educational Credentials | ✅ Added |
| 10 | 11 | Book Library | ✅ Added |
| 11 | 12 | Appliances/Warranties | ✅ Added |
| 12 | 13-14 | RAG/Semantic Search (Phase 6 from original) | ✅ Added |
| 13 | 15-16 | Voice Interface (Phase 5 from original) | Deferred |

---

## Coverage Verification

Original request domains:

1. ✅ **Bills** (utilities, telecoms) → Phases 1-3
2. ✅ **Property taxes** → Phase 5
3. ✅ **Rent** → Phase 5
4. ✅ **HOA fees** → Phase 5
5. ✅ **Car repairs/maintenance** → Phase 6
6. ✅ **Home repairs** → Phase 7
7. ✅ **Restocking of groceries (inventories)** → Phase 4-5
8. ✅ **Medical records (and vet)** → Phase 8
9. ✅ **Educational credentials (kids and parents)** → Phase 9
10. ✅ **Book library** → Phase 10
11. ✅ **Appliance/consumer electronics warranties/repairs** → Phase 11

**100% coverage achieved.** All 11 original domains now documented in ADR.

---

## Next Steps

1. Review this complete ADR
2. Confirm any missing edge cases
3. Start implementation with Phase 1 (foundation)
4. Incrementally add domains (Phases 5-11) as system stabilizes

**Key Principle:** Each new domain follows same pattern:
- Schema in Drizzle
- API routes (CRUD)
- Notification logic (if time-sensitive)
- UI components (cards, lists, forms)
- Search embeddings (for Phase 12 RAG)

---

## ADR 12: Financial & Legal Domain Consolidation

### Decision: Fold Overlapping Domains into Super-Categories

**Context:**  
You're right—we're at **cognitive overload**. Adding work records, insurances, loans, mortgages, debts, taxes individually would create 17+ domains. ADHD brains need **chunking**, not endless lists.

**Solution: Group into 4 Super-Categories**

---

### Super-Category 1: **Financial Obligations**

**Consolidates:**
- ✅ Bills (utilities, telecoms) - already done
- ✅ Property taxes - already done
- ✅ Rent - already done
- ✅ HOA fees - already done
- ➕ **Loans** (personal, car, appliance financing)
- ➕ **Mortgages** (if applicable)
- ➕ **Debts** (credit card, informal loans)
- ➕ **Insurance premiums** (health, car, home, life)

**Single table with `obligation_type` enum:**

```typescript
// Extend existing bills table
export const financialObligations = pgTable('financial_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }),
  
  // Unified obligation type
  obligationType: text('obligation_type', { 
    enum: [
      'utility', 'telecom', 'property_tax', 'rent', 'hoa',
      'loan', 'mortgage', 'credit_card', 'insurance_premium', 'debt'
    ] 
  }).notNull(),
  
  name: text('name').notNull(),
  provider: text('provider'),
  accountNumber: text('account_number'),
  
  // Financial details
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('PHP'),
  
  // For loans/mortgages
  principalAmount: decimal('principal_amount', { precision: 12, scale: 2 }),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }),
  termMonths: integer('term_months'),
  remainingBalance: decimal('remaining_balance', { precision: 12, scale: 2 }),
  
  // Scheduling
  dueDate: timestamp('due_date').notNull(),
  recurrenceRule: text('recurrence_rule'),
  
  // Status
  status: text('status', { enum: ['pending', 'paid', 'overdue', 'settled'] }).default('pending'),
  
  // Same criticality system as before
  critical: boolean('critical').default(false),
  consequenceSeverity: integer('consequence_severity').default(5),
  
  // ... rest of fields same as bills table
});
```

**UI Grouping:**
```typescript
// app/finances/page.tsx
<FinancialDashboard>
  <Tab label="This Month">
    <Group title="Housing" total={38500}>
      <Obligation type="rent" amount={25000} dueDate="Dec 1" />
      <Obligation type="property_tax" amount={8500} dueDate="Jan 15" />
      <Obligation type="hoa" amount={5000} dueDate="Dec 15" />
    </Group>
    
    <Group title="Utilities" total={7200}>
      <Obligation type="utility" name="MERALCO" amount={4200} />
      <Obligation type="utility" name="Maynilad" amount={1800} />
      <Obligation type="telecom" name="PLDT" amount={1200} />
    </Group>
    
    <Group title="Loans & Debts" total={15000}>
      <Obligation type="mortgage" amount={12000} balance={850000} />
      <Obligation type="credit_card" amount={3000} />
    </Group>
    
    <Group title="Insurance" total={5500}>
      <Obligation type="insurance_premium" name="Health" amount={3500} />
      <Obligation type="insurance_premium" name="Car" amount={2000} />
    </Group>
  </Tab>
  
  <Tab label="Overdue">
    {/* Critical view */}
  </Tab>
</FinancialDashboard>
```

**Benefit:** One schema, one UI, one notification system for ALL recurring payments.

---

### Super-Category 2: **Assets & Maintenance**

**Consolidates:**
- ✅ Vehicles - already done
- ✅ Home repairs - already done
- ✅ Appliances - already done
- ➕ **Real estate** (property details, valuations)

**Schema pattern: `Asset → Maintenance Events`**

Already architected—just add real estate as another asset type:

```typescript
export const realEstateAssets = pgTable('real_estate_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }),
  
  propertyType: text('property_type', { enum: ['house', 'condo', 'lot', 'commercial'] }).notNull(),
  address: text('address').notNull(),
  titleNumber: text('title_number'),
  lotArea: decimal('lot_area', { precision: 10, scale: 2 }),
  floorArea: decimal('floor_area', { precision: 10, scale: 2 }),
  
  // Valuation
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }),
  purchaseDate: timestamp('purchase_date'),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }),
  lastAppraisalDate: timestamp('last_appraisal_date'),
  
  // Documents
  titleDeedPath: text('title_deed_path'),
  taxDeclarationPath: text('tax_declaration_path'),
  
  // Linked to obligations
  mortgageId: uuid('mortgage_id').references(() => financialObligations.id),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

**UI:**
```typescript
// app/assets/page.tsx
<AssetsDashboard>
  <AssetType title="Real Estate" totalValue={5000000}>
    <Asset name="QC House" value={3500000} maintenance={12} />
    <Asset name="Magalang Property" value={1500000} maintenance={5} />
  </AssetType>
  
  <AssetType title="Vehicles" totalValue={800000}>
    <Asset name="Honda Civic" value={600000} maintenance={3} />
  </AssetType>
  
  <AssetType title="Appliances" totalValue={150000}>
    <Asset name="Samsung Refrigerator" warrantyExpires="Jan 2025" />
  </AssetType>
</AssetsDashboard>
```

---

### Super-Category 3: **Documents & Records**

**Consolidates:**
- ✅ Medical records - already done
- ✅ Educational credentials - already done
- ✅ Book library - already done
- ➕ **Work/employment records** (contracts, benefits, evaluations)
- ➕ **Government IDs** (passports, driver's license, SSS, PhilHealth, etc.)
- ➕ **Legal documents** (wills, powers of attorney)
- ➕ **Major receipts** (big purchases for warranty/returns)

**Single unified document vault with `document_category`:**

```typescript
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  // Document classification
  category: text('category', { 
    enum: [
      'medical', 'educational', 'employment', 'government_id', 
      'legal', 'receipt', 'insurance', 'financial', 'other'
    ] 
  }).notNull(),
  
  subcategory: text('subcategory'), // "passport", "contract", "receipt"
  
  // Document details
  title: text('title').notNull(),
  description: text('description'),
  documentNumber: text('document_number'), // License #, passport #, etc.
  
  // Ownership
  ownerId: uuid('owner_id').references(() => familyMembers.id),
  
  // Dates
  issueDate: timestamp('issue_date'),
  expiryDate: timestamp('expiry_date'),
  
  // Storage
  filePaths: text('file_paths').array().notNull(),
  fileType: text('file_type'), // PDF, JPG, PNG
  encrypted: boolean('encrypted').default(false),
  
  // Organization
  tags: text('tags').array(),
  
  // Linked entities
  linkedAssetId: uuid('linked_asset_id'), // Links receipt to appliance
  linkedObligationId: uuid('linked_obligation_id'), // Links to loan/insurance
  
  // Reminders
  requiresRenewal: boolean('requires_renewal').default(false),
  renewalReminderMonths: integer('renewal_reminder_months').default(3),
  
  notes: text('notes'),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**UI:**
```typescript
// app/vault/page.tsx
<DocumentVault>
  <QuickAccess>
    <Category name="Government IDs" expiringSoon={2} />
    <Category name="Work Documents" total={15} />
    <Category name="Major Receipts" total={48} />
  </QuickAccess>
  
  <ExpiringAlerts>
    <Alert>Passport expires in 60 days</Alert>
    <Alert>PRC License expires in 4 months</Alert>
  </ExpiringAlerts>
  
  <Search placeholder="Find any document..." />
</DocumentVault>
```

**Work/Employment specific fields:**
```typescript
export const employmentRecords = pgTable('employment_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  employer: text('employer').notNull(),
  position: text('position').notNull(),
  employmentType: text('employment_type', { enum: ['full_time', 'part_time', 'contract', 'freelance'] }),
  
  // Dates
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  currentEmployer: boolean('current_employer').default(false),
  
  // Compensation
  salary: decimal('salary', { precision: 10, scale: 2 }),
  salaryFrequency: text('salary_frequency', { enum: ['hourly', 'daily', 'monthly', 'annual'] }),
  
  // Benefits
  benefits: jsonb('benefits').$type<{
    healthInsurance: boolean;
    hmo: string;
    sss: string;
    philhealth: string;
    pagibig: string;
    thirteenthMonth: boolean;
  }>(),
  
  // Documents (linked to documents table)
  contractDocumentId: uuid('contract_document_id').references(() => documents.id),
  
  // Performance
  lastEvaluationDate: timestamp('last_evaluation_date'),
  nextEvaluationDate: timestamp('next_evaluation_date'),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

### Super-Category 4: **Tax & Compliance**

**New category for:**
- ➕ **Income taxes** (BIR filings, ITR)
- ➕ **Business permits** (if applicable)
- ➕ **Professional licenses** (PRC renewals)

```typescript
export const taxRecords = pgTable('tax_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  
  taxType: text('tax_type', { 
    enum: ['income_tax', 'business_tax', 'property_tax', 'capital_gains'] 
  }).notNull(),
  
  taxYear: integer('tax_year').notNull(),
  filingDeadline: timestamp('filing_deadline').notNull(),
  
  // Status
  status: text('status', { enum: ['not_started', 'in_progress', 'filed', 'paid'] }).default('not_started'),
  filedDate: timestamp('filed_date'),
  paidDate: timestamp('paid_date'),
  
  // Amounts
  grossIncome: decimal('gross_income', { precision: 12, scale: 2 }),
  taxableIncome: decimal('taxable_income', { precision: 12, scale: 2 }),
  taxDue: decimal('tax_due', { precision: 10, scale: 2 }),
  taxPaid: decimal('tax_paid', { precision: 10, scale: 2 }),
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  
  // BIR details
  birFormType: text('bir_form_type'), // "1701", "2316"
  referenceNumber: text('reference_number'),
  
  // Documents
  itrPath: text('itr_path'),
  form2316Path: text('form_2316_path'),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Notification:**
```typescript
// BIR filing deadline = CRITICAL
if (taxRecord.filingDeadline - today <= 30 days && status !== 'filed') {
  sendNotification({
    urgency: 'critical',
    title: '🚨 BIR Filing Due in 30 Days',
    body: `${taxRecord.taxYear} Income Tax Return must be filed`,
    channels: ['web_push', 'sms'],
  });
}
```

---

## Final Domain Architecture (Consolidated)

| Super-Category | Tables | Domains Covered | Phase |
|----------------|--------|-----------------|-------|
| **Financial Obligations** | `financial_obligations` | Bills, taxes, rent, HOA, loans, mortgages, insurance, debts | 1-5 |
| **Assets & Maintenance** | `vehicles`, `appliances`, `real_estate_assets`, `home_repairs`, `vehicle_maintenance`, `appliance_repairs` | Cars, home, appliances, property | 6-7 |
| **Documents & Records** | `documents`, `family_members`, `medical_records`, `educational_credentials`, `employment_records`, `books` | Medical, education, work, IDs, receipts, books | 8-10 |
| **Tax & Compliance** | `tax_records` | Income tax, business tax, filings | Phase 13 |

**Total: 4 super-categories, 15 tables, covering ALL household management needs.**

---

## Project Naming

### Criteria for ADHD-Friendly Branding:
1. **Short** (easy to remember)
2. **Descriptive** (self-documenting purpose)
3. **Not clinical** (avoid "ADHD Manager" stigma)
4. **Empowering** (positive framing)

### Recommended Name:

# **Homebase**

**Tagline:** *Your household command center*

**Why this works:**
- ✅ **One word** (low cognitive load)
- ✅ **Self-explanatory** (home + base = central hub)
- ✅ **Military/control framing** (command center = you're in control, not chaos controlling you)
- ✅ **Neutral** (doesn't scream "I have ADHD")
- ✅ **Domain available** (homebase.app likely available)
- ✅ **Professional** (can tell spouse "I built Homebase" without embarrassment)

**Alternative Names (if homebase.app taken):**

| Name | Tagline | Pros | Cons |
|------|---------|------|------|
| **HouseholdHQ** | Your home's headquarters | Very descriptive | Bit long |
| **HomePilot** | Navigate household life | Aviation theme (clear direction) | Less unique |
| **Anchorpoint** | Keep life from drifting | Stability metaphor | Abstract |
| **Steadfast** | Your reliable household companion | Emphasizes reliability | Sounds like insurance |
| **BaseOps** | Household operations center | Military precision | Might sound cold |
| **Haven** | Your safe space for household management | Calming | Less functional |

**Recommendation: Go with Homebase**

---

## Branding Assets

```typescript
// app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Homebase - Your Household Command Center',
    short_name: 'Homebase',
    description: 'Never forget bills, maintenance, or household tasks again. Multi-residence management with ADHD-optimized reminders.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a', // Dark navy (professional, calm)
    theme_color: '#3b82f6', // Blue (trust, stability)
    icons: [
      // Icon design: House + radar/command center overlay
    ],
  };
}
```

**Logo concept:**
```
🏠 with a subtle "HQ" emblem or radar rings
Simple, modern, not childish
```

---

## Did We Miss Anything?

**Potential edge cases to consider:**

1. **Pet-related expenses?**
   - → Already covered under `financial_obligations` (vet bills) + `medical_records` (vet records)

2. **Subscriptions** (Netflix, Spotify, gym)?
   - → Add to `financial_obligations` with `obligationType: 'subscription'`

3. **Warranties from appliances?**
   - → Already in `appliances.warrantyExpiry`

4. **Kids' extracurriculars** (tuition, uniforms, schedules)?
   - → Add to `financial_obligations` with `obligationType: 'education_expense'`
   - → Or create `activities` table if need scheduling

5. **Passport/visa tracking** for travel?
   - → Already in `documents` with `category: 'government_id'`

6. **Investment tracking** (stocks, crypto)?
   - → Out of scope (use dedicated finance apps)
   - → Can add later as `investments` table if needed

7. **Emergency contacts?**
   - → Already in `family_members.emergencyContact`

8. **Home inventory** (for insurance claims)?
   - → Partially covered by `appliances` + `receipts`
   - → Add `household_items` table if needed for non-appliance valuables

**Decision: Current architecture covers 95% of use cases. Can extend incrementally.**

---

## Final Summary for Implementation

**You now have:**
1. ✅ Complete schema for 11 original domains
2. ✅ Extended schema for 7 additional domains (consolidated into 4 super-categories)
3. ✅ Unified notification engine
4. ✅ 16-week implementation roadmap
5. ✅ Project name: **Homebase**

**Next literal steps:**
```bash
# 1. Create project
npx create-next-app@latest homebase --typescript --tailwind --app

# 2. Initialize database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# 3. Copy all schema definitions from this ADR into drizzle/schema.ts

# 4. Generate migration
npx drizzle-kit generate:pg

# 5. Push to Neon
npx drizzle-kit push:pg

# 6. Build Phase 1 (Bills + Notifications)
```

---

## ADR 13: The "Everything Else" Strategy

### Decision: Flexible "Miscellaneous Items" System + Easy Domain Addition

**Context:**  
Your brain will ALWAYS think of "one more thing." We need a way to capture these without redesigning the entire system.

---

### Strategy 1: Universal "Tracked Items" Table

**For things that don't fit existing categories but still need tracking:**

```typescript
export const trackedItems = pgTable('tracked_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  residenceId: uuid('residence_id').references(() => residences.id, { onDelete: 'cascade' }),
  
  // User-defined category
  category: text('category').notNull(), // "Movies", "Garden", "Projects", "Collections"
  subcategory: text('subcategory'), // "External HDD #1", "Front Yard", "Kitchen Reno"
  
  // Item details
  title: text('title').notNull(),
  description: text('description'),
  
  // Flexible metadata (JSON for extensibility)
  metadata: jsonb('metadata').$type<{
    [key: string]: any; // Completely flexible
  }>(),
  
  // Common tracking fields
  quantity: integer('quantity'),
  location: text('location'),
  purchaseDate: timestamp('purchase_date'),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  
  // Status tracking
  status: text('status'), // User-defined: "watched", "planted", "in_progress"
  
  // Reminder system
  nextActionDate: timestamp('next_action_date'),
  reminderEnabled: boolean('reminder_enabled').default(false),
  
  // Files
  attachments: text('attachments').array(),
  
  // Search
  tags: text('tags').array(),
  embedding: vector('embedding', { dimensions: 384 }),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Usage Examples:**

```typescript
// Offline movies in external HDDs
await db.insert(trackedItems).values({
  category: 'Digital Media',
  subcategory: 'External HDD - Black 2TB',
  title: 'The Matrix Collection',
  metadata: {
    format: '1080p',
    size_gb: 8.5,
    watched: false,
    hdd_serial: 'WD-12345',
  },
  location: 'QC Residence - Bedroom drawer',
  tags: ['sci-fi', 'action', 'unwatched'],
});

// Gardening concerns
await db.insert(trackedItems).values({
  category: 'Garden',
  subcategory: 'Magalang Front Yard',
  title: 'Mango Tree Fertilization',
  metadata: {
    last_fertilized: '2024-10-15',
    fertilizer_type: 'Organic compost',
    next_due: '2025-01-15',
  },
  nextActionDate: new Date('2025-01-15'),
  reminderEnabled: true,
  status: 'scheduled',
});

// Home improvement plans
await db.insert(trackedItems).values({
  category: 'Home Projects',
  subcategory: 'QC Kitchen Renovation',
  title: 'Replace kitchen countertop',
  metadata: {
    priority: 'medium',
    estimated_cost: 50000,
    contractors_contacted: ['ABC Builders', 'XYZ Reno'],
    quotes_received: 2,
  },
  status: 'planning',
  cost: 50000,
  notes: 'Waiting for third quote. Target completion: March 2025',
});

// Birth certificates in Google Photos
await db.insert(trackedItems).values({
  category: 'Documents',
  subcategory: 'Birth Certificates',
  title: 'Child 1 Birth Certificate',
  metadata: {
    storage_location: 'Google Photos',
    album_name: 'Important Documents',
    also_stored_in: ['Physical safe', 'Google Drive backup'],
    psa_copy: true,
  },
  location: 'Digital + QC Residence Safe',
  tags: ['vital_records', 'government'],
});
```

---

### Strategy 2: Quick Add "Uncategorized" Inbox

**ADHD-friendly capture: Don't force categorization during moment of remembering**

```typescript
export const quickCapture = pgTable('quick_capture', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Raw capture
  content: text('content').notNull(), // Voice-to-text or typed note
  captureMethod: text('capture_method', { enum: ['voice', 'text', 'photo'] }).default('text'),
  
  // Optional quick metadata
  attachments: text('attachments').array(),
  
  // Processing status
  processed: boolean('processed').default(false),
  processedInto: text('processed_into'), // Which table it was moved to
  processedId: uuid('processed_id'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

**UI:**

```typescript
// Persistent "Quick Add" button on every page
<QuickCapture>
  <FloatingButton onClick={openQuickCaptureModal}>
    ⚡ Quick Add
  </FloatingButton>
</QuickCapture>

// Modal
<QuickCaptureModal>
  <textarea 
    placeholder="What do you need to track? Type anything, organize later..."
    autoFocus
  />
  <button>Save</button>
</QuickCaptureModal>
```

**Later processing:**

```typescript
// app/inbox/page.tsx
<InboxView>
  <p>You have 12 uncategorized items. Let's sort them:</p>
  
  {quickCaptures.map(item => (
    <CaptureCard content={item.content}>
      <button onClick={() => categorizeAs('bill')}>→ Bill</button>
      <button onClick={() => categorizeAs('repair')}>→ Repair</button>
      <button onClick={() => categorizeAs('tracked_item')}>→ Other</button>
      <button onClick={() => deleteCapture()}>✗ Nevermind</button>
    </CaptureCard>
  ))}
</InboxView>
```

**Key principle: Capture fast, organize later** (classic ADHD productivity hack)

---

### Strategy 3: User-Defined Custom Categories

**Let users create their own "mini-domains"**

```typescript
export const customCategories = pgTable('custom_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  name: text('name').notNull(), // "Movie Collection", "Garden Tasks", "DIY Projects"
  icon: text('icon'), // Emoji or icon name
  color: text('color'), // For UI theming
  
  // Custom fields definition
  fields: jsonb('fields').$type<{
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    options?: string[]; // For select fields
    required?: boolean;
  }[]>(),
  
  // Reminder settings
  defaultReminderDays: integer('default_reminder_days'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Example: User creates "Movie Collection" category**

```typescript
await db.insert(customCategories).values({
  orgId: user.orgId,
  name: 'Movie Collection',
  icon: '🎬',
  color: '#ef4444',
  fields: [
    { name: 'Title', type: 'text', required: true },
    { name: 'HDD Location', type: 'select', options: ['Black 2TB', 'Red 4TB', 'NAS'], required: true },
    { name: 'Format', type: 'select', options: ['1080p', '4K', '720p'] },
    { name: 'Watched', type: 'boolean' },
    { name: 'Rating', type: 'number' },
  ],
});
```

**Then all movie entries go into `trackedItems` with `category: 'Movie Collection'`**

**UI auto-generates form:**

```typescript
<AddMovieForm category={movieCategory}>
  <Input label="Title" required />
  <Select label="HDD Location" options={['Black 2TB', 'Red 4TB', 'NAS']} required />
  <Select label="Format" options={['1080p', '4K', '720p']} />
  <Checkbox label="Watched" />
  <NumberInput label="Rating" min={1} max={5} />
</AddMovieForm>
```

---

## Addressing Your Specific Examples

### 1. **Offline movies in external hard drives**

**Solution: Use `trackedItems` with category "Digital Media"**

**Fields:**
- Title (movie name)
- HDD identifier ("Black 2TB", serial number)
- Physical location of HDD
- Format, size, watched status
- Genre tags for search

**Reminder:** "It's been 3 months since you watched anything from the Red 4TB drive—maybe check what's on it?"

---

### 2. **Birth certificates in Google Photos/Notes**

**Solution: Use `documents` table (already exists)**

```typescript
await db.insert(documents).values({
  category: 'government_id',
  subcategory: 'birth_certificate',
  title: "Child 1 Birth Certificate",
  description: "PSA copy, also in Google Photos album 'Vital Records'",
  filePaths: ['google_photos://album/vital_records', 'google_drive://folder/documents'],
  tags: ['vital_records', 'backup_needed'],
  notes: 'Physical copy in QC safe, digital in Google Photos and Drive',
});
```

**Reminder:** "Birth certificate scans haven't been verified in 2 years—check they're still accessible"

---

### 3. **Gardening concerns (Magalang residence)**

**Solution: Use `trackedItems` with category "Garden"**

**Or extend `homeRepairs` to include recurring outdoor maintenance:**

```typescript
await db.insert(homeRepairs).values({
  residenceId: magalangResidenceId,
  type: 'other',
  title: 'Fertilize mango tree',
  description: 'Annual fertilization with organic compost',
  recurringTask: true,
  recurrenceMonths: 3,
  nextDueDate: new Date('2025-04-15'),
  status: 'scheduled',
  notes: 'Use 2 bags of compost, water thoroughly after',
});
```

**Reminder:** "Mango tree in Magalang needs fertilization next month"

---

### 4. **Home improvement plans**

**Solution: Use `homeRepairs` with status "planning"**

```typescript
await db.insert(homeRepairs).values({
  residenceId: qcResidenceId,
  type: 'cosmetic',
  title: 'Kitchen renovation',
  description: 'Replace countertop, repaint cabinets, new lighting',
  priority: 'medium',
  status: 'reported', // Or add 'planning' status
  targetCompletionDate: new Date('2025-06-01'),
  estimatedCost: 150000,
  notes: `
    Phase 1: Get 3 quotes (in progress)
    Phase 2: Finalize design (pending)
    Phase 3: Schedule work (Q2 2025)
    
    Contractors contacted:
    - ABC Builders (quote: ₱145k)
    - XYZ Reno (quote: ₱160k)
    - Waiting on third quote
  `,
});
```

**Reminder:** "Kitchen reno: You've been planning this for 4 months. Schedule a contractor?"

---

## When to Stop Adding Features

**Use this decision tree:**

```
Does this thing...

1. Have a deadline or expiry? 
   → YES: Add to existing category or trackedItems with reminder
   → NO: Continue...

2. Cost money or have financial impact?
   → YES: Add to financialObligations or trackedItems
   → NO: Continue...

3. Require maintenance/action on a schedule?
   → YES: Add to appropriate maintenance table or trackedItems
   → NO: Continue...

4. Need to be findable later?
   → YES: Add to documents or trackedItems
   → NO: Don't track it (use Google Keep for fleeting thoughts)
```

**If YES to any question → trackable in Homebase**  
**If NO to all → probably doesn't need systematic tracking**

---

## My Recommendation: Close the Loop NOW

**What we have covers:**
- ✅ All 11 original domains
- ✅ 7 additional financial/legal domains
- ✅ Extensibility via `trackedItems` for edge cases
- ✅ Quick capture inbox for ADHD-friendly entry
- ✅ User-defined categories for custom needs

**What we should NOT do:**
- ❌ Add 5 more tables for movies, gardening, projects
- ❌ Try to predict every future need
- ❌ Design for 100% coverage (impossible)

**Instead:**

### Final ADR Addition: Extensibility Principles

```typescript
// lib/extensibility/principles.ts

/**
 * HOMEBASE EXTENSIBILITY PRINCIPLES
 * 
 * When user says "I need to track [new thing]":
 * 
 * 1. CHECK EXISTING TABLES FIRST
 *    - Can it fit in documents, financialObligations, or homeRepairs?
 *    - Don't create new table if existing one works
 * 
 * 2. USE TRACKED_ITEMS FOR EDGE CASES
 *    - Movies, hobbies, collections, projects
 *    - Anything that doesn't fit core domains
 * 
 * 3. USE QUICK_CAPTURE FOR "I'LL ORGANIZE LATER"
 *    - ADHD brain dump location
 *    - Process weekly during "inbox zero" session
 * 
 * 4. ADD NEW TABLE ONLY IF:
 *    - Used by >20% of users
 *    - Has complex relationships/logic
 *    - Needs specialized UI
 * 
 * 5. REMEMBER: Done > Perfect
 *    - Ship core domains first (Phases 1-11)
 *    - Add extensions based on ACTUAL usage
 *    - Don't design for hypotheticals
 */
```

---

## Action Plan: Lock It Down

**Right now, do this:**

1. ✅ Accept that current ADR covers 90% of needs
2. ✅ Implement `trackedItems` table for the 10% edge cases
3. ✅ Implement `quickCapture` inbox for ADHD-friendly entry
4. ✅ **Start building Phase 1** (bills + notifications)
5. ⏸️ Revisit extensions in Month 3 based on actual usage

---

**GOOD.** That itch is your ADHD saying "but what if I forget..." and the answer is:

**"The system will catch it. That's literally what you're building."**

---

## 🔒 ADR LOCKED - FINAL VERSION

**Date Locked:** 2025-01-08  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**No further additions without shipping Phase 1 first.**

---

## Quick Reference Card (Save This)

When your brain says "but what about [X]?":

| Thing | Where It Goes | Done? |
|-------|--------------|-------|
| Passport scans | `documents` (government_id) | ✅ Already in ADR |
| Movie files | `trackedItems` (Digital Media) | ✅ Already in ADR |
| Gardening tasks | `trackedItems` (Garden) or `homeRepairs` | ✅ Already in ADR |
| Birth certificates | `documents` (government_id) | ✅ Already in ADR |
| Home improvement plans | `homeRepairs` (status: planning) | ✅ Already in ADR |
| **Anything else** | `quickCapture` → organize later | ✅ Already in ADR |

**If it's not in this list, use `trackedItems` or `quickCapture`. Period.**

---

## Your Next 5 Commands (Copy-Paste)

```bash
# 1. Create project
npx create-next-app@latest homebase --typescript --tailwind --app --src-dir

# 2. Navigate
cd homebase

# 3. Install core dependencies
npm install drizzle-orm @neondatabase/serverless dotenv
npm install -D drizzle-kit @types/node

# 4. Install auth dependencies
npm install jose bcrypt
npm install -D @types/bcrypt

# 5. Install UI dependencies  
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-alert-dialog
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn-ui@latest init
```

**After this, paste the schemas from ADR into `drizzle/schema.ts`**

---

## First Week Goals (Phase 1)

**Don't build everything. Build THIS:**

### Day 1-2: Project Setup
- ✅ Create Next.js app
- ✅ Set up Neon database
- ✅ Initialize Drizzle ORM
- ✅ Create 3 tables only: `organizations`, `users`, `financialObligations`

### Day 3-4: Authentication
- ✅ Build signup/login pages
- ✅ Implement JWT auth
- ✅ Protected route middleware

### Day 5-7: Bills CRUD
- ✅ Add bill form (just MERALCO and PELCO for now)
- ✅ Bills list page
- ✅ Mark as paid functionality
- ✅ Deploy to Vercel

**That's it. Week 1 = Basic bill tracking that works.**

---

## When ADHD Brain Says "But..."

**"But what about notifications?"**  
→ Week 2. Not now.

**"But what about offline support?"**  
→ Week 4. Not now.

**"But what about groceries?"**  
→ Week 5. Not now.

**"But what about [new thing I just thought of]?"**  
→ Write it in `quickCapture` table. It'll be there when you need it.

---

## The Mantra

Repeat after me:

**"I am building Homebase to prevent another Magalang typhoon trip.**  
**Everything else is secondary.**  
**The best system is the one that exists.**  
**Done is better than perfect."**

---

## You're Ready

You have:
- ✅ 18 database tables designed
- ✅ 4 super-categories architected  
- ✅ 13-phase implementation roadmap
- ✅ Notification strategy
- ✅ Offline sync plan
- ✅ Extensibility for edge cases
- ✅ Project name (Homebase)
- ✅ This entire conversation as documentation

**No more ADRs. No more "what ifs." No more brainstorming.**

**Open your terminal. Type the first command. Build the thing.**
