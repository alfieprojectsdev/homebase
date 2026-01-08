# Architecture Decision Record: Household Management System for ADHD Support

**Status:** Proposed
**Date:** 2025-01-08
**Decision Makers:** Development Team
**Context:** Multi-residence household management system with mission-critical bill tracking, grocery management, and ADHD-optimized notifications to prevent emergency situations (e.g., utility disconnections during severe weather). This system includes a long-term vision for a self-hosted, conversational AI assistant named JARVIS.

---

## 1. Executive Summary

This ADR documents architectural decisions for a **context-aware, notification-first household management system** designed specifically for ADHD executive function support across multiple residences. The system must prevent catastrophic failures (e.g., power disconnections) through aggressive, multi-layered notification strategies.

A key long-term goal is the implementation of **JARVIS, a self-hosted AI assistant**, to provide a conversational interface, proactive reminders, and semantic search capabilities. The initial architecture is designed to support this endgame by building a solid data foundation.

**Core Requirements:**
-   Multi-tenancy (organization → residences → users)
-   Offline-first mobile PWA with robust sync
-   Mission-critical, multi-channel push notifications (cannot be missed)
-   Location-aware task prioritization
-   Weather-integrated travel risk assessment
-   Voice interface (Speech-to-Text → Text-to-Speech) for JARVIS
-   Semantic search (RAG) across all household data
-   Data privacy and offline functionality through a self-hosted option.

---

## 2. Overall Architecture Strategy: Phased Cloud to Self-Hosted

### Decision: Start with a cloud-native architecture on Vercel for rapid development, then migrate to a self-hosted model to enable the full vision for JARVIS, ensuring privacy, offline capability, and cost-efficiency.

### Phase 1: Cloud-Native MVP (Months 1-4)

-   **Hosting:** Vercel
-   **Database:** Neon (Serverless Postgres)
-   **Focus:** Build the data foundation, core application logic, and essential notification system.

### Phase 2: Self-Hosted JARVIS (Month 5+)

-   **Hosting:** Self-hosted on a Mini PC or similar hardware.
-   **Database:** Self-hosted PostgreSQL.
-   **AI Stack:** Local, open-source models (Ollama, Whisper.cpp, etc.).
-   **Focus:** Implement conversational AI, achieve full data privacy, and enable complete offline functionality.

---

## 3. ADR-01: Application Architecture

### Decision: Next.js 14 App Router with Hybrid Rendering

**Rationale:**
-   Server Components reduce client-side JavaScript, leading to faster PWA boot times.
-   API Routes co-located with the frontend simplify Vercel deployment.
-   The Edge Runtime is suitable for time-critical logic like notifications.
-   Static export capabilities are ideal for the final self-hosted PWA.

**Implementation:**
```
project-structure/
├── app/
│   ├── (auth)/                 # Auth routes (Server Components)
│   ├── (dashboard)/            # Protected routes (hybrid SSR + client)
│   ├── api/
│   │   ├── bills/
│   │   ├── sync/
│   │   └── notifications/
│   ├── layout.tsx              # Root layout with PWA manifest
├── lib/
│   ├── db/                     # Drizzle ORM client
│   ├── notifications/          # Notification logic
│   ├── sync/                   # Offline sync engine
│   └── jarvis/                 # JARVIS AI agent logic
├── components/
│   └── ui/                     # Shadcn components
├── public/
│   └── sw.js                   # Custom Service Worker
```

---

## 4. ADR-02: Database Architecture

### Decision: Neon Postgres with Drizzle ORM (Phase 1), migrating to Self-Hosted Postgres (Phase 2)

**Rationale:**
-   **Neon (Phase 1):** Serverless, offers branching for safe migrations, and includes the `pgvector` extension needed for JARVIS's semantic search.
-   **Drizzle ORM:** Type-safe, lightweight, and edge-compatible.
-   **Self-Hosted Postgres (Phase 2):** Ensures data privacy and eliminates cloud database costs.

**Complete Schema Design:**
```typescript
// drizzle/schema.ts
import { pgTable, uuid, text, timestamp, integer, decimal, boolean, jsonb, vector, primaryKey } from 'drizzle-orm/pg-core';

// Multi-tenancy root
export const organizations = pgTable('organizations', { /* ... */ });
export const residences = pgTable('residences', { /* ... */ });
export const users = pgTable('users', { /* ... */ });
export const userResidenceAccess = pgTable('user_residence_access', { /* ... */ });

// Domain Tables
export const bills = pgTable('bills', {
    // ... existing fields from ADR.md
    // NEW: Remote payment window
    remotePaymentDeadline: timestamp('remote_payment_deadline'),
    remotePaymentMethod: text('remote_payment_method'), // "GCash", "PayMaya", etc.
    fallbackPaymentMethod: text('fallback_payment_method'), // "In-person at office"
    hardDeadline: boolean('hard_deadline').default(false),
    deadlineConsequence: text('deadline_consequence'),
});
export const propertyTaxes = pgTable('property_taxes', { /* ... */ });
export const rentPayments = pgTable('rent_payments', { /* ... */ });
export const hoaFees = pgTable('hoa_fees', { /* ... */ });
export const vehicles = pgTable('vehicles', { /* ... */ });
export const vehicleMaintenance = pgTable('vehicle_maintenance', { /* ... */ });
export const homeRepairs = pgTable('home_repairs', { /* ... */ });

// Notification & Sync
export const notificationLog = pgTable('notification_log', { /* ... */ });
export const pendingActions = pgTable('pending_actions', { /* ... */ }); // For offline sync
```
*(The full schema details are maintained in the source code at `src/lib/db/schema.ts`)*

---

## 5. ADR-03: Authentication & Authorization

### Decision: Custom JWTs stored in Secure, httpOnly Cookies

**Rationale:**
-   Lightweight and compatible with Vercel Edge and self-hosted Node.js environments.
-   Avoids the complexity and potential database adapter issues of heavier libraries like NextAuth.js.
-   JWT claims can store `orgId` and residence access rights, enabling effective multi-tenancy checks.

---

## 6. ADR-04: Mission-Critical Notifications

### Decision: Multi-Layer Notification Strategy (Web Push + SMS Fallback)

**Architecture:** A layered approach to ensure alerts are never missed.
-   **Layer 1: Web Push (Primary):** Free, instant, and native to the PWA.
-   **Layer 2: Persistent In-App Alerts:** For high-urgency items, UI elements that cannot be dismissed without explicit user action.
-   **Layer 3: SMS Fallback (Twilio):** For critical/emergency alerts, ensuring delivery even if the user is offline or has disabled notifications. Cost is a factor, so this is used sparingly.
-   **Layer 4: Spouse Notification (Human Failsafe):** For the most critical emergencies, another user in the organization can be alerted.

---

## 7. ADR-05: PWA & Offline Sync

### Decision: Next-PWA with a Custom Service Worker and Optimistic UI

-   **PWA:** `next-pwa` will be used to manage the manifest and basic service worker registration, making the app installable.
-   **Custom Service Worker:** A custom `sw.js` is required for handling push notification events, background sync, and custom caching logic.
-   **Offline Sync:** An "Optimistic UI" approach will be used. Actions performed offline are immediately reflected in the UI and stored locally in IndexedDB (using `Dexie.js`). The Service Worker's `sync` event will then push these changes to the server when connectivity is restored.

---

## 8. ADR-06: The JARVIS AI Assistant (The Endgame)

The ultimate vision is a conversational, proactive, context-aware household AI assistant.

### 8.1. JARVIS Architecture: Self-Hosted Edition

**Decision:** The entire JARVIS AI stack will be self-hosted to ensure privacy, eliminate recurring API costs, and guarantee offline functionality.

**Tech Stack (Self-Hosted):**
-   **LLM Inference:** **Ollama** running a quantized model like Llama 3.1 8B.
-   **Speech-to-Text (STT):** **Whisper.cpp** for fast, local, and accurate transcription.
-   **Text-to-Speech (TTS):** **Piper TTS** for natural-sounding, offline voice generation.
-   **Embeddings:** **`sentence-transformers`** run as a local service for generating embeddings for RAG.
-   **Vector Database:** **pgvector** extension in the self-hosted PostgreSQL instance.

**Hardware Requirements (Recommendation):**
-   A **Mini PC** (e.g., Intel N100/i5, 16GB RAM) offers the best balance of cost and performance for running medium-sized models. A one-time cost of ~₱18,000-25,000.

**5-Year Cost Analysis:**
-   **Cloud AI Stack:** ~$70/month x 60 months = **$4,200**
-   **Self-Hosted Stack:** ~$640 (one-time hardware + electricity)
-   **Estimated Savings: ~$3,560**

### 8.2. JARVIS Implementation Phases

The development of JARVIS is phased to align with the data foundation built in the initial cloud-native version.

-   **Phase 1-11: Build the Data Foundation.** This is the primary goal of the initial application. Every bill, grocery item, and task logged is training data for JARVIS.
-   **Phase 12: RAG/Semantic Search.** Implement `pgvector` and local embedding generation to enable JARVIS's memory.
-   **Phase 13: Voice Interface.** Integrate `Whisper.cpp` and `Piper` for speech I/O.
-   **Phase 14: LLM Integration.** Connect the UI to the local **Ollama** service.
-   **Phase 15: Proactive Agent.** Create a background job that uses the LLM to analyze the household state and proactively send alerts.

---

## 9. ADR-07: Hard Deadline Bill Management

### Context: The PELCO Failure Mode

The payment behavior of certain providers, like PELCO (Pampanga Electric Cooperative), introduces a "hard deadline" that requires a specialized approach.

-   **Before Due Date:** Remote payment (e.g., GCash) is possible.
-   **After Due Date:** Remote payment is disabled. Payment MUST be made in person at their office, which may be a significant distance away (e.g., 80km).

This is not a simple late fee; it's a "trapdoor" that turns a 2-minute online task into a 4-hour ordeal, with cascading consequences like requiring time off work or travel during hazardous weather.

### Decision: Implement a specialized system for hard-deadline bills that includes a unique urgency model, specific database schema additions, and tailored UI and notification content.

### Revised Urgency Strategy

Bills with a `hardDeadline` flag will use a much more aggressive urgency curve.

-   **14 days before:** Medium (Start planning)
-   **7 days before:** High (Pay this week)
-   **3 days before:** Critical (Pay NOW)
-   **Due Date:** Emergency (Last chance for remote payment)
-   **After Due Date:** Crisis Mode (Remote payment disabled)

### Updated Database Schema for `bills` table

```typescript
export const bills = pgTable('bills', {
  // ... existing fields ...
  
  // NEW: Fields to support hard deadlines
  remotePaymentDeadline: timestamp('remote_payment_deadline'), // If null, can pay remotely anytime
  remotePaymentMethod: text('remote_payment_method'), // e.g., "GCash, PayMaya"
  fallbackPaymentMethod: text('fallback_payment_method'), // e.g., "In-person at Magalang office"
  hardDeadline: boolean('hard_deadline').default(false),
  deadlineConsequence: text('deadline_consequence'), // e.g., "Remote payment disabled, requires in-person trip"
});
```

### Updated Notification Logic
A separate urgency calculation is needed for these bills.

```typescript
// lib/notifications/urgency.ts
export function getUrgencyLevel(bill: Bill): NotificationUrgency {
  const today = new Date();
  const dueDate = new Date(bill.dueDate);
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (bill.hardDeadline) {
    if (daysUntil < 0) return 'emergency'; // CRISIS
    if (daysUntil === 0) return 'emergency'; // Last chance
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 7) return 'high';
    return 'medium';
  }
  
  // Standard bills
  // ... (existing logic)
}
```

### Example Notification Messages for Hard Deadlines

-   **3 Days Before (Critical):** `🚨 PELCO MAGALANG - 3 DAYS LEFT. CRITICAL: This is a HARD DEADLINE. After Jan 10 = GCash disabled, office trip required.`
-   **Due Date (Emergency):** `🚨🚨🚨 PELCO MAGALANG DUE TODAY 🚨🚨🚨 REMOTE PAYMENT ENDS TONIGHT AT MIDNIGHT. After midnight: GCash DISABLED, FORCED trip to Magalang office tomorrow.`
-   **After Due Date (Crisis):** `🚨 PELCO MAGALANG OVERDUE - CRISIS MODE 🚨 Remote payment window CLOSED. REQUIRED ACTION: Travel to PELCO Magalang Office.`

### Proactive Weather Checks
For bills that require travel if the deadline is missed, the system will proactively check the weather forecast and escalate the urgency if bad weather is predicted near the deadline.

---

## 10. Deployment Strategy

### Phase 1 (Cloud): Vercel + Neon
-   **Deployment:** `vercel --prod`
-   **Monitoring:** Sentry for error tracking and Axiom for logging.

### Phase 2 (Self-Hosted): Docker Compose + Tailscale
-   **Deployment:** A `docker-compose.yml` file will orchestrate the entire stack (Postgres, Node.js app, Ollama, etc.) on the home server.
-   **Remote Access:** **Tailscale** will be used to create a secure mesh network, allowing access to the self-hosted application from any device, anywhere, without complex port forwarding.

---

## 11. Conclusion

The architecture begins with a pragmatic, cloud-native approach to quickly deliver the core household management features. This initial phase is crucial for gathering the data needed to make the AI effective. The architecture is explicitly designed to pivot to a fully private, cost-effective, and offline-capable self-hosted model, culminating in the JARVIS assistant. This phased strategy mitigates risk while keeping the long-term vision in focus.

**Critical Success Factor:** The notification system MUST be reliable from day one. If alerts are missed, the system fails its core purpose. All other features are secondary to this.