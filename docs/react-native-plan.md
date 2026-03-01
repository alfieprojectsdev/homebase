# React Native + Expo Mobile App Architecture Plan

**Homebase Mobile Companion**
_A native iOS/Android app for household management using shared backend API_

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Repository Structure (Turborepo Monorepo)](#repository-structure-turborepo-monorepo)
3. [Tech Stack Choices](#tech-stack-choices)
4. [Authentication Flow (React Native)](#authentication-flow-react-native)
5. [Push Notification Setup](#push-notification-setup)
6. [Screens to Build (Phase M1)](#screens-to-build-phase-m1)
7. [Distribution Plan](#distribution-plan)
8. [Environment Variables (Mobile)](#environment-variables-mobile)
9. [Phased Rollout](#phased-rollout)
10. [Known Limitations & Decisions](#known-limitations--decisions)
11. [Migration Path: Single App → Monorepo](#migration-path-single-app--monorepo)

---

## Overview & Goals

The Homebase mobile app is a **companion** to the existing Next.js web application. It shares the same backend API (`/api/bills`, `/api/chores`, `/api/auth/*`, `/api/notifications/expo-token`), meaning **zero API changes are required**. The mobile app extends reach with:

- **Native push notifications**: 95%+ delivery rate (APNs + FCM) vs ~33% PWA web push
- **Offline-first support** (Phase M2+): Cached bills/chores work without internet
- **Platform-specific features** (Phase M4+): iOS Critical Alerts for overdue bills, home screen widgets
- **One platform, one source of truth**: Same bills, same multi-residence data

### Key Principle

The mobile app **does not duplicate backend logic**. All business logic (urgency calculation, recurrence, notifications) stays on the server. The mobile app is purely a presentation layer with offline caching.

---

## Repository Structure (Turborepo Monorepo)

### Current State (Single Repo)

```
homebase/                          (current root)
├── src/                           (existing Next.js app)
├── docs/
├── drizzle/
├── package.json                   (Next.js + shared deps)
└── .env.local
```

### Target State (Monorepo Approach)

**Timeline:** Convert to monorepo **after** M1 is complete and stable. During M1, develop mobile app in a parallel repo or parallel directory.

```
homebase/                          (root workspace)
├── apps/
│   ├── web/                       (move current Next.js here — Phase 3+)
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── mobile/                    (new Expo app — start Phase M1)
│       ├── app/                   (Expo Router file-based routing)
│       ├── app.json              (Expo config)
│       ├── package.json
│       ├── eas.json              (EAS Build config)
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/              (TypeScript interfaces, Drizzle schema exports)
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-client/                (Typed fetch wrappers for all endpoints)
│   │   ├── lib/
│   │   │   ├── client.ts         (base fetch + auth injection)
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.ts       (login, signup, me, logout)
│   │   │   │   ├── bills.ts      (GET, POST, PATCH, DELETE)
│   │   │   │   ├── chores.ts     (GET, POST, PATCH, DELETE)
│   │   │   │   └── notifications.ts (register Expo token)
│   │   │   └── types.ts          (response types)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui-tokens/                 (Design tokens: colors, spacing, typography)
│       ├── colors.ts
│       ├── spacing.ts
│       ├── typography.ts
│       └── package.json
│
├── turbo.json                     (Turborepo config)
├── package.json                   (root workspace config)
└── .gitignore
```

### Package Dependencies

```json
// packages/shared-types/package.json
{
  "name": "@homebase/shared-types",
  "version": "1.0.0",
  "dependencies": {
    "drizzle-orm": "^0.45.1"
  }
}

// packages/api-client/package.json
{
  "name": "@homebase/api-client",
  "version": "1.0.0",
  "dependencies": {
    "@homebase/shared-types": "*",
    "zod": "^4.3.5"
  }
}

// apps/web/package.json
{
  "name": "homebase-web",
  "dependencies": {
    "@homebase/shared-types": "*",
    "@homebase/api-client": "*",
    "next": "14.2.35",
    "react": "^18"
  }
}

// apps/mobile/package.json
{
  "name": "homebase-mobile",
  "dependencies": {
    "@homebase/shared-types": "*",
    "@homebase/api-client": "*",
    "expo": "^52.0.0",
    "react": "^18",
    "react-native": "^0.76.0"
  }
}

// root package.json
{
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### Implementation Strategy

**Phase M1:** Develop mobile app standalone (no monorepo) to avoid disrupting production web app.

```bash
# Parallel directory approach
homebase/                  (production web app — unchanged)
homebase-mobile/           (new Expo app — separate repo initially)
```

**Phase M3+:** Migrate to monorepo once both apps are stable.

```bash
# Move to monorepo
git subtree split homebase/src → apps/web/
git subtree add homebase-mobile → apps/mobile/
```

---

## Tech Stack Choices

| Concern | Choice | Reason |
|---------|--------|--------|
| **Framework** | Expo SDK 52+ (managed workflow) | No native toolchain needed; EAS handles iOS/Android builds in cloud. Faster iteration than native CLI |
| **Navigation** | Expo Router (file-based) | Mirrors Next.js App Router mental model; same directory structure, same deep-linking |
| **Styling** | NativeWind v4 + Tailwind | Tailwind classes work on both web and mobile; unified design tokens across apps |
| **State management** | React Context + React Query | Same pattern as web; no Redux complexity. React Query handles server state + offline caching |
| **Push tokens** | expo-notifications | Native binding to APNs/FCM; `getExpoPushTokenAsync()` + validation server-side |
| **Auth storage** | expo-secure-store | Encrypted on-device storage (replaces httpOnly cookie); OS-level security |
| **Network client** | Axios + interceptors | Same pattern as web; easily inject Bearer token from secure store |
| **Build/distribution** | EAS Build + EAS Submit | APK sideload (Android free); TestFlight (iOS $99/yr dev account) |
| **Type safety** | TypeScript + Zod | Shared type interfaces from `@homebase/shared-types` |

### Why NOT...

| Technology | Why Not |
|---|---|
| React Native CLI | Requires Xcode/Android Studio; slower feedback loop; Expo abstracts away configuration |
| Firebase (FCM) | Expo Push handles FCM routing internally; no Firebase SDK needed |
| Zustand/Redux | React Context sufficient for auth + modals; React Query handles server sync |
| AsyncStorage | Insecure for tokens; `expo-secure-store` uses keychain/keystore |
| Expo Go (development) | Good for initial testing; for realistic testing, builds via EAS |

---

## Authentication Flow (React Native)

JWT authentication on mobile differs from the web in **storage mechanism only**. The API already supports Bearer token headers (checked alongside cookies in `server.ts`).

### Flow Diagram

```
User inputs email/password
           ↓
POST /api/auth/login {email, password}
           ↓
Server returns JWT in response body (not Set-Cookie)
           ↓
Client stores in expo-secure-store (encrypted)
           ↓
All API calls: Authorization: Bearer <token>
           ↓
Server verifies JWT (same logic as web)
           ↓
Extract userId + orgId from token payload
           ↓
Scope queries by org_id
```

### Implementation Details

**Server-side (no changes needed):**

The existing `/api/auth/login` already returns JWT in the response body:

```typescript
// src/app/api/auth/login/route.ts (existing code)
const token = await createToken({
  userId: user.id,
  orgId: user.orgId,
  email: user.email,
  role: user.role,
});

const response = NextResponse.json({
  user: { id, email, name, role, orgId },
  // JWT is in cookie, but mobile can extract from response body if needed
});
response.cookies.set('token', token, { httpOnly: true, ... });
```

**Mobile client code:**

```typescript
// apps/mobile/lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { user, token } = await response.json();
  // Note: Extract token from response body OR from Set-Cookie header

  // Store JWT securely
  await SecureStore.setItemAsync('homebase_token', token);

  return user;
}

export async function logoutUser() {
  await SecureStore.deleteItemAsync('homebase_token');
}

export async function getStoredToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('homebase_token');
}
```

### API Client with Bearer Token Injection

```typescript
// packages/api-client/lib/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const createApiClient = (baseURL: string) => {
  const client = axios.create({ baseURL });

  // Inject Bearer token into every request
  client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('homebase_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 Unauthorized
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        await SecureStore.deleteItemAsync('homebase_token');
        // Navigate to login (use React Navigation context)
      }
      throw error;
    }
  );

  return client;
};
```

### Token Expiration & Refresh

**Current design (no refresh tokens):**
- JWT expires after 7 days (set in `src/lib/auth/jwt.ts:19`)
- When expired: app shows login screen, user re-authenticates
- **No auto-refresh** (simplicity over UX)

**Future option (Phase M2):**
- Implement refresh token rotation
- Server issues short-lived access token (1 day) + refresh token (7 days)
- Mobile auto-refreshes before expiry, shows login only on refresh failure

---

## Push Notification Setup

Expo Push Notifications route to APNs (iOS) and FCM (Android) internally. No Firebase SDK needed on the client.

### Architecture

```
Mobile app starts
       ↓
expo-notifications → getExpoPushTokenAsync()
       ↓
ExponentPushToken (e.g., ExponentPushToken[abc123...])
       ↓
POST /api/notifications/expo-token {token: "ExponentPushToken[...]"}
       (with Authorization: Bearer <jwt>)
       ↓
Server stores in users.expo_push_token
       ↓
Vercel Cron (09:00 UTC daily) → /api/cron/daily
       ↓
DailyBriefingService queries urgent bills
       ↓
CompositeNotifier (WebPushNotifier + ExpoPushNotifier)
       ↓
ExpoPushNotifier.sendAlert() → Expo.sendPushNotificationsAsync()
       ↓
Expo backend routes to APNs (iOS) / FCM (Android)
       ↓
Device receives notification
       ↓
User taps → deep-link to /bills/[id]
```

### Step 1: Request Permission & Get Token

```typescript
// apps/mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications(jwtToken: string) {
  // Step 1: Request iOS/Android permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('User denied notification permission');
    return;
  }

  // Step 2: Get device token
  const token = await Notifications.getExpoPushTokenAsync();
  console.log('Expo Push Token:', token.data);

  // Step 3: Send token to server
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/expo-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ token: token.data }),
  });

  if (!response.ok) {
    console.error('Failed to register Expo token:', response.statusText);
  }
}
```

### Step 2: Handle Notification Events

```typescript
// apps/mobile/app.tsx or root layout
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function App() {
  const router = useRouter();

  useEffect(() => {
    // Listen for notification when app is in foreground
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      // Show in-app banner or badge
      console.log('Notification received:', notification);
    });

    // Listen for user tapping notification (foreground or background)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const billId = response.notification.request.content.data?.billId;
      if (billId) {
        router.push(`/bills/${billId}`);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(subscription);
      Notifications.removeNotificationSubscription(responseSubscription);
    };
  }, []);

  return (
    // ... app layout
  );
}
```

### Step 3: Server-Side Push (Already Implemented)

The server already handles notifications:

```typescript
// src/app/api/cron/daily/route.ts (existing)
const notifier = new CompositeNotifier(
  new WebPushNotifier(),
  new ExpoPushNotifier()
);

// ExpoPushNotifier queries users.expo_push_token and sends via Expo API
```

### Notification Payload

When the server sends a notification via `ExpoPushNotifier`, the mobile app receives:

```typescript
{
  title: "Homebase Alert", // or "🚨 Homebase Alert" for critical
  body: "Electric bill due tomorrow",
  sound: "default", // for critical urgency
  priority: "high", // for critical urgency
  data: {
    urgency: "critical",
    billId: "123", // or choreId, etc.
  }
}
```

The mobile app's notification response handler deep-links to the bill/chore detail screen.

### Permissions

**Android 13+:**
- `VIBRATE` permission (default granted)
- `POST_NOTIFICATIONS` runtime permission (requested in `registerForPushNotifications()`)

**iOS:**
- Alert, badge, sound (all requested in single permission dialog)

---

## Screens to Build (Phase M1)

File-based routing with Expo Router mirrors Next.js App Router:

```
apps/mobile/app/
├── (auth)/
│   ├── login.tsx              # Email + password form
│   ├── signup.tsx             # Name + email + password + org name
│   └── _layout.tsx            # Stack navigator (no tab bar)
│
├── (tabs)/                    # Tab-based navigation (home screen)
│   ├── _layout.tsx            # Bottom tab navigator
│   ├── index.tsx              # Home/dashboard (redirect to bills)
│   │
│   ├── bills/
│   │   ├── _layout.tsx        # Stack navigator within tab
│   │   ├── index.tsx          # Bill list (searchable, filtered by residence)
│   │   └── [id].tsx           # Bill detail + pay/mark-paid actions
│   │
│   ├── chores/
│   │   ├── index.tsx          # Chore list
│   │   └── [id].tsx           # Chore detail + progress update
│   │
│   └── settings.tsx           # Push notification toggle, account info, logout
│
└── _layout.tsx                # Root layout (provider tree)
```

### Screen Specifications

#### 1. `/login`

**Purpose:** Authenticate user with email + password

**Components:**
- Email input field (validate format)
- Password input field
- "Login" button (disabled until both fields filled)
- "Sign up instead" link
- Error message display (invalid credentials)

**Flow:**
1. User enters email + password
2. POST to `/api/auth/login`
3. Store JWT in `expo-secure-store`
4. Redirect to `/(tabs)/bills`
5. Call `registerForPushNotifications(jwtToken)` in background

**Error handling:**
- 401: "Invalid email or password"
- 400: "Missing required fields"
- 500: "Server error"

#### 2. `/signup`

**Purpose:** Create account + organization

**Components:**
- Name input field
- Email input field (validate format)
- Password input field (validate 8+ chars)
- Organization name input field
- "Sign up" button
- "Already have an account?" link

**Flow:**
1. User fills form
2. POST to `/api/auth/signup`
3. Store JWT + user data
4. Create first residence (optional in signup, or default to "Home")
5. Redirect to `/(tabs)/bills`
6. Register push token

**Error handling:**
- 400: "Password must be 8+ characters"
- 409: "User already exists"
- 500: "Server error"

#### 3. `/(tabs)/bills/index` (Bill List)

**Purpose:** Display all bills with urgency-based sorting and filtering

**Components:**
- Search bar (filter by bill name)
- Residence filter dropdown (segment control: "All", "Home", "Property", etc.)
- Bill list (FlatList for performance)
  - Each bill card shows:
    - Bill name (bold)
    - Amount (large text)
    - Due date (relative: "Due tomorrow", "Due in 3 days")
    - Status badge (Pending/Paid/Overdue)
    - Urgency color (background gradient):
      - Red (#DC2626 → #991B1B): Overdue + pulse animation
      - Red/Orange (#DC2626 → #EA580C): Due tomorrow
      - Orange (#FB923C): Due in 3 days
      - Yellow (#FCD34D): Due in 7 days
      - Gray (#F3F4F6): Due later

**Interactions:**
- Tap bill card → navigate to `/bills/[id]`
- Pull-to-refresh → refetch bills from server
- Long-press → show "Pay", "Edit", "Delete" options (Phase M1: hide Edit/Delete, show only Pay)

**Server call:**
- GET `/api/bills` with header `Authorization: Bearer <token>`
- Returns: `{bills: BillWithUrgency[]}`
- Client-side: Sort by urgency, then by due date
- Use React Query for caching + background refetch

**Offline behavior (Phase M2):**
- Show cached bills from AsyncStorage
- Overlay "offline" banner with retry button

#### 4. `/(tabs)/bills/[id]` (Bill Detail)

**Purpose:** View full bill details + pay/mark-paid actions

**Components:**
- Header: bill name, amount (large), due date
- Status indicator (badge with color)
- Urgency explanation ("Critical: overdue by 2 days")
- Details card:
  - Residence
  - Category (utility, subscription, etc.)
  - Recurrence (if enabled: "Monthly on day 15")
  - Payment method (if stored)
  - Created date
  - Last paid date (if applicable)
- Action buttons:
  - "Mark Paid" (primary button)
  - "Pay Online" (if remotePaymentMethod exists, e.g., "GCash", "bank link")
  - "Delete" (secondary, confirmation modal)

**Server calls:**
- GET `/api/bills/[id]` → fetch full bill details
- PATCH `/api/bills/[id]` → mark as paid (sets status=paid, paidAt=now)
  - Server generates next recurrence if enabled
- DELETE `/api/bills/[id]` → delete bill

**Behavior:**
- "Mark Paid" button → PATCH, show success toast, pop back to list
- "Pay Online" → open URL scheme (e.g., `intent://pay?amount=X` for Android GCash)
- "Delete" → confirmation dialog, then DELETE + pop back

#### 5. `/(tabs)/chores/index` (Chore List)

**Purpose:** Display household chores with progress tracking

**Components:**
- Residence filter (same as bills)
- Chore list (FlatList)
  - Each chore card:
    - Title (bold)
    - Description (truncated, 2 lines max)
    - Assigned to (name or "Unassigned")
    - Progress bar (0-100% or step-based: "3/5 steps")
    - Next reminder date/time (if recurring + reminder enabled)

**Interactions:**
- Tap chore → navigate to `/chores/[id]`
- Pull-to-refresh

**Server call:**
- GET `/api/chores` with org + residence filters

#### 6. `/(tabs)/chores/[id]` (Chore Detail)

**Purpose:** Update chore progress + view history

**Components:**
- Header: chore title + description
- Progress section:
  - If step-based: "3 of 5 steps completed" with checkboxes for each step
  - If percentage-based: slider from 0-100%
- History section: list of progress updates (who, when, new progress)
- Action buttons:
  - "Update Progress" (PATCH `/api/chores/[id]`)
  - "Mark Complete" (sets progress=100)
  - "Snooze" (POSTs feedback with snoozedUntil timestamp)

**Server calls:**
- PATCH `/api/chores/[id]` with `{progress: number, notes?: string}`
- POST `/api/chores/[id]/feedback` with `{feedbackType: "snooze", snoozedUntil: date}`

#### 7. `/(tabs)/settings` (Settings)

**Purpose:** Account management + app preferences

**Components:**
- Account section:
  - User email (read-only)
  - Organization name (read-only, for now)
  - Role (read-only)
- Notifications section:
  - "Receive push notifications" toggle
  - "Receive daily briefing" toggle
  - Last successful push registration timestamp (debug)
- Advanced section:
  - "Clear cached data" button
  - "App version" (read-only)
  - "CRON_SECRET" input (admin only, for testing `/api/cron/daily`)
- Actions:
  - "Logout" button (red, confirmation modal)

**Behavior:**
- Notification toggles → frontend only (Phase M2: implement push subscription DB table)
- "Clear cached data" → wipe React Query cache + AsyncStorage
- "Logout" → delete JWT from secure store + redirect to login

---

## Distribution Plan

### Android

**Development & Testing:**
```bash
# Build APK for sideloading
eas build --platform android --profile preview

# Download APK from EAS dashboard (or email link)
# Share via URL or QR code to testers
# Testers: Settings → Security → "Unknown Sources" → install APK
```

**No Play Store needed** for family use. APK sideload is free and instant.

**Production (future):**
- Play Store requires $25 dev account + app review (7 days typical)
- Recommend sideload for Phase 1-3; Play Store when stable

### iOS

**Development & Testing (Ad-Hoc):**
- Requires Apple Developer account ($99/year)
- Up to 100 registered device UUIDs per year
- Build expires after 30 days

```bash
# 1. Register tester devices (UDID)
eas device:create

# 2. Build for ad-hoc provisioning
eas build --platform ios --profile preview

# 3. Download + install on registered device
```

**Testing (TestFlight - Recommended):**
- No UDID registration needed
- Up to 10,000 internal + external testers
- Build expires after 90 days
- Free, no app review required

```bash
# 1. Build for TestFlight
eas build --platform ios --profile preview

# 2. Auto-submit to TestFlight
eas build --platform ios --profile preview --auto-submit

# 3. Testers download TestFlight app, join via link, receive builds
```

**Production:**
- App Store requires $99/year dev account + app review (1-2 days typical)
- Recommend for Phase M3+ (once stable)

### Credentials & Configuration

**`eas.json`:**

```json
{
  "cli": { "version": ">= 11.0.0" },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false,
        "distribution": "ad-hoc"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "distribution": "app-store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "123456789"
      },
      "android": {
        "serviceAccount": "@local/android-key.json"
      }
    }
  }
}
```

**App Store Connect & Play Store:**
- **iOS:** Sign in with Apple ID → create app → get Bundle ID
- **Android:** Create service account JSON → upload to EAS (one-time)

### Tester Distribution

**Phase M1 (closed alpha):**
- Share APK + TestFlight links via email/QR code
- Testers: family members, 5-10 people
- Feedback: Google Form or Discord

**Phase M3+ (open beta):**
- Public TestFlight link (10K tester limit)
- Public APK URL (e.g., GitHub releases)
- Changelog in-app or linked from settings

---

## Environment Variables (Mobile)

Mobile apps **never store secrets**. Only public API URLs and feature flags.

**`.env.local` (mobile):**

```bash
# Required
EXPO_PUBLIC_API_URL=https://homebase-production.vercel.app

# Optional (feature flags)
EXPO_PUBLIC_DISABLE_OFFLINE=false
EXPO_PUBLIC_LOG_LEVEL=info
EXPO_PUBLIC_MAX_RETRY_ATTEMPTS=3
```

**Why `EXPO_PUBLIC_*` prefix?**
- Expo requires prefix to expose variables to client
- Variables without prefix are server-only (not bundled)
- Prevents accidental exposure of secrets

**Server-side secrets (stay on backend):**
- `JWT_SECRET`
- `DATABASE_URL`
- `EXPO_SERVER_SDK_TOKEN` (if needed for direct API calls)
- `CRON_SECRET`

---

## Phased Rollout

### Phase M1: Core Companion (4-6 weeks)

**Goal:** Functional bill tracker with push notifications

**Features:**
- Authentication (login/signup)
- Bill list + detail screen
- Urgency colors (server-calculated, displayed on mobile)
- Mark bill as paid
- Push notification registration + receive notifications
- Offline bill viewing (React Query cache)
- Settings screen (push toggle, logout)

**Technical:**
- Expo Router + NativeWind styling
- React Query for server state
- expo-secure-store for JWT
- expo-notifications for push
- TypeScript strict mode

**Testing:**
- Manual: family testers on TestFlight (iOS) + APK sideload (Android)
- No automated tests (Phase M2+)

**Deliverables:**
- iOS: TestFlight build
- Android: Sideload APK
- Documentation: setup guide, tester instructions

### Phase M2: Offline & Caching (2 weeks)

**Goal:** App works without internet; syncs in background

**Features:**
- Persist bills/chores to AsyncStorage (SQLite backend)
- React Query: cache, background refetch, stale-while-revalidate
- "Offline" banner with retry button
- Conflict resolution (rare): last-write-wins
- Sync on app open + every 5 minutes in background

**Technical:**
- React Query persistQueryClient plugin
- AsyncStorage adapter
- WatermelonDB (optional, if AsyncStorage proves slow)

**Testing:**
- Toggle flight mode, verify cached data displays
- Mark bill paid offline, verify syncs on reconnect

### Phase M3: Smart Notifications (3 weeks)

**Goal:** Receipt polling, token lifecycle, escalation UI

**Features:**
- Expo receipt polling cron job (check notification delivery status)
- Prune stale tokens (DeviceNotRegistered error handling)
- Escalation UI (show "notification not delivered, try SMS" with manual link)
- Schedule notifications: defer send until convenient time
- Deep-link preview (show bill title + amount before opening detail)

**Technical:**
- Background job processing (Vercel cron or EAS Build trigger)
- Push receipts table in schema
- Updated ExpoPushNotifier to log receipts

### Phase M4: Platform-Specific Features (3 weeks)

**Goal:** Leverage iOS/Android capabilities

**Features:**
- **iOS Critical Alerts:** Override Do Not Disturb for overdue bills (requires Apple entitlement)
- **Home screen widgets:** Display next bill due + amount
- **Biometric unlock:** fingerprint/face to open app (Phase M5)
- **Share extension:** Add bill from receipt photo

**Technical:**
- Expo Notifications: `sound` + `interruptionLevel` for iOS 15+
- WidgetKit (iOS) + Jetpack Glance (Android)
- Expo Modules API (if needed)

### Phase M5: Gamification & Analytics (2 weeks)

**Goal:** Engagement + insights

**Features:**
- On-time payment streaks (chores already have this)
- Monthly spend summary
- Category breakdown
- Savings goals (optional)

**Technical:**
- Server-side aggregation: new `/api/analytics/summary` endpoint
- Charts: react-native-svg + victory-native

### Phase 12+ Integration: Self-Hosted JARVIS

**When:** After Phase 12 switches server to self-hosted

**Changes:**
- Swap Expo Push for direct APNs + FCM HTTP v1 API
- Single adapter change: replace ExpoPushNotifier with SelfHostedNotifier
- Update API_URL from Vercel to self-hosted IP/domain
- Optional: disable Expo, use pure native notifications

---

## Known Limitations & Decisions

### 1. No Background Processing on iOS

**Why:** Apple's background execution model is restrictive (10 minutes max after app closes). Reliable reminders require server-side push.

**Decision:** All reminders come from server cron job (9 AM UTC daily). App receives push + handles notification tap.

**Consequence:** If user has notifications disabled + app closed, they miss reminders. Mitigated by SMS escalation (Phase 2+).

### 2. Expo Push Receipts Are Not Delivery Receipts

**Context:** Expo ticket ≠ device confirmed. A "success" ticket means Expo queued it to APNs/FCM, not that the device received it.

**Decision (Phase M3):** Implement receipt polling cron job to check actual delivery status:

```typescript
// Pseudo-code
const receipt = await expo.getPushNotificationReceiptsAsync([ticketId]);
if (receipt.status === 'ok') {
  // Device likely received it
  logDeliverySuccess(userId, billId);
} else if (receipt.details?.error === 'DeviceNotRegistered') {
  // Token is stale
  clearToken(userId);
}
```

**Current state (Phase M1):** ExpoPushNotifier logs ticket errors only. Full receipt polling deferred to Phase M3.

### 3. No Firebase Dependency

**Why:** Expo handles FCM/APNs routing internally. No need to:
- Install Firebase SDK on mobile
- Set up Firebase project
- Generate Google services JSON for Android

**Consequence:** Slightly less control over notification behavior, but vastly simpler setup.

### 4. Self-Hosted Migration (Phase 12+)

**Current:** Notifications route through `https://exp.host` (Expo's servers).

**Migration:** When Homebase switches to self-hosted (Phase 12+), replace Expo Push with:

```typescript
// Phase 12+: INotifier adapter swap
import { ApnNotifier } from '@/infrastructure/adapters/notifications/ApnNotifier';
import { FcmNotifier } from '@/infrastructure/adapters/notifications/FcmNotifier';

const notifier = new CompositeNotifier(
  new ApnNotifier(),  // node-apn library
  new FcmNotifier()   // firebase-admin library
);
```

No mobile app code changes. Server-side adapter swap only.

### 5. No Automatic Token Refresh

**Current:** JWT expires after 7 days. No refresh token mechanism.

**Behavior:** User must re-login after 7 days. Session persists via secure storage until expiry.

**Future (Phase M2):** Implement refresh token rotation:
- Access token: 1 day
- Refresh token: 7 days
- Auto-refresh on API error 401

### 6. No End-to-End Encryption

**Scope:** User bills are sensitive (amounts, due dates). Transmitted over HTTPS (server enforces).

**Decision:** No additional client-side encryption (adds complexity, minimal additional security over HTTPS + TLS).

**Future (Phase 12+):** If self-hosting, consider:
- TLS client certificates for mobile
- E2E encryption layer (optional, for privacy-conscious users)

### 7. Single App Instance (No Multi-Account)

**Scope:** One user per device. If spouse uses same phone, they must log in/log out.

**Rationale:** Simplicity; most families have individual phones. Multi-account iOS support is complex (separate sandboxes).

**Future:** Tab-based account switching (Phase M5+) if requested.

---

## Migration Path: Single App → Monorepo

### Current State (Recommended for M1)

Develop mobile app as **separate repository**:

```bash
# Production (unchanged)
github.com/org/homebase (Next.js web app)

# Development (Phase M1)
github.com/org/homebase-mobile (Expo app — parallel)
```

**Advantages:**
- No risk of breaking production web app
- Faster CI/CD (independent deployments)
- Simpler onboarding (clone one repo)

**Disadvantage:**
- Type definitions duplicated between repos
- Manual sync of shared types

### Future State (Phase M3+)

Migrate to **monorepo** once both apps are stable:

```bash
github.com/org/homebase (Turborepo workspace)
├── apps/web/
├── apps/mobile/
└── packages/
    ├── shared-types/
    ├── api-client/
    └── ui-tokens/
```

**Migration Steps:**

1. Create new repo `homebase-monorepo`
2. Copy web app → `apps/web/`
3. Copy mobile app → `apps/mobile/`
4. Extract shared types → `packages/shared-types/`
5. Extract API client → `packages/api-client/`
6. Update imports: `@/` → `@homebase/shared-types` (web), `@homebase/api-client` (mobile)
7. Test both apps
8. Merge into main `homebase` repo

**Timing:** Start migration after M1 is stable (4-6 weeks into mobile development).

### Shared Packages During Monorepo

#### `@homebase/shared-types`

Exports Drizzle schema types and API response types:

```typescript
// packages/shared-types/index.ts
export * from 'drizzle-orm';
export type { User, Bill, Chore, Organization } from '@/lib/db/schema';

export interface BillResponse {
  id: number;
  name: string;
  amount: string;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  urgencyLevel: 'critical' | 'high' | 'normal';
  residenceId: number;
  orgId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    orgId: number;
  };
  token: string; // for mobile
}
```

Both web and mobile import from this single source.

#### `@homebase/api-client`

Typed API wrappers:

```typescript
// packages/api-client/lib/endpoints/bills.ts
import { BillResponse } from '@homebase/shared-types';

export async function listBills(client: AxiosInstance): Promise<BillResponse[]> {
  const { data } = await client.get('/api/bills');
  return data.bills;
}

export async function getBill(client: AxiosInstance, id: number): Promise<BillResponse> {
  const { data } = await client.get(`/api/bills/${id}`);
  return data.bill;
}

export async function markBillPaid(client: AxiosInstance, id: number) {
  return await client.patch(`/api/bills/${id}`, { status: 'paid' });
}
```

Both web and mobile use the same client library:

```typescript
// apps/web/lib/api.ts
import { createApiClient, listBills } from '@homebase/api-client';

// apps/mobile/lib/api.ts
import { createApiClient, listBills } from '@homebase/api-client';
```

---

## Summary

| Phase | Duration | Focus | Outcome |
|-------|----------|-------|---------|
| **M1** | 4-6 weeks | Core companion, push notifications | iOS (TestFlight) + Android (APK sideload) ready for alpha |
| **M2** | 2 weeks | Offline caching, sync | App works without internet |
| **M3** | 3 weeks | Smart notifications, receipt polling | 95%+ delivery rate, stale token cleanup |
| **M4** | 3 weeks | Platform features (Critical Alerts, widgets) | iOS/Android native capabilities |
| **M5** | 2 weeks | Gamification, analytics | Engagement + insights |
| **Monorepo** | 1 week | Repository consolidation | Single workspace for web + mobile |
| **Phase 12+** | N/A | Self-hosted integration | Direct APNs/FCM, no Expo dependency |

---

**Next Steps:**
1. Estimate timeline for M1 (recommend: sprint-based, 2-week cycles)
2. Set up EAS account + provisioning profiles (iOS)
3. Initialize `apps/mobile` with Expo SDK 52 + Expo Router
4. Begin implementation with authentication flow
5. Weekly syncs with testers for feedback

---

_Last Updated: March 1, 2026_
