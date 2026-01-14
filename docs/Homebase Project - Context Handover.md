# Homebase Project - Context Handover Document

**Date:** January 11, 2026  
**Project:** Homebase - ADHD-Optimized Household Management System  
**GitHub:** https://github.com/alfieprojectsdev/homebase  
**Current Status:** Phase 1 Complete ✅ | Phase 2 Planning 🚧

---

## Executive Summary

**What Was Accomplished:**
- ✅ Phase 1 shipped (48 files, 9,088 lines of code)
- ✅ Complete bills tracking with ADHD-optimized urgency UI
- ✅ Multi-residence support (QC + Magalang)
- ✅ Authentication with JWT + row-level security
- ✅ Mobile-first responsive design
- ✅ Deployed to GitHub (public, anonymized)
- ✅ Production-ready on Vercel

**Critical Gap Identified:**
- ❌ Bill recurrence NOT implemented (schema exists, logic missing)
- Users must manually re-enter same bills monthly
- Immediate pain point affecting daily use

**Next Steps:**
1. Implement bill recurrence (Phase 1.5 - urgent)
2. Deploy Phase 2 (mission-critical notifications)
3. Continue roadmap through Phase 13 (self-hosted JARVIS)

---

## 1. Current Project State

### Technology Stack
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Custom JWT (jose) + httpOnly cookies
- **UI:** Tailwind CSS + Shadcn/ui
- **Deployment:** Vercel
- **Development Tools:** OpenCode + Sisyphus + GLM-4.7, Claude Code

### Repository Structure
```
homebase/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login/signup pages
│   │   ├── (dashboard)/      # Protected routes (bills)
│   │   └── api/              # API routes (auth, bills CRUD)
│   ├── lib/
│   │   ├── auth/             # JWT + password utils
│   │   ├── db/               # Drizzle schema + seed
│   │   └── utils/            # Helpers
│   └── components/
│       └── ui/               # Shadcn components
├── docs/
│   └── ADR.md                # Complete architecture (Phases 1-13)
├── drizzle/                  # Migrations
└── public/                   # Static assets
```

### Database Schema (Phase 1)
```typescript
organizations          // Family units
  ├── residences      // QC, Magalang, etc.
  ├── users           // Family members
  └── financial_obligations  // Bills, rent, taxes, etc.
```

**Key Fields in `financial_obligations`:**
- Standard: name, provider, amount, dueDate, status
- ADHD-specific: critical, hardDeadline, consequenceSeverity
- PELCO-specific: noRemotePayment, requiresTravel, deadlineConsequence
- **Recurrence (exists but unused):** recurrenceRule, nextDueDate

---

## 2. Critical Business Context: PELCO Constraint

### The Hard Deadline Problem

**Standard Bills (MERALCO, PLDT):**
- Can pay anytime (before or after due date)
- Late = penalty fee, but remote payment still works
- Consequence severity: Low-Medium

**PELCO Magalang (Critical Constraint):**
- ✅ **Before due date:** Can pay via GCash remotely
- ❌ **After due date:** GCash DISABLED by PELCO system
- ❌ **Must travel:** 80km to Magalang office (Mon-Fri 8am-5pm only)
- ⚠️ **Historical incident:** Missed deadline → emergency trip during typhoon → food spoilage

**This is a HARD DEADLINE with trapdoor consequences.**

### Implementation Requirements

PELCO bills must be flagged as:
```typescript
{
  hardDeadline: true,
  remotePaymentDeadline: dueDate, // Same as due date
  deadlineConsequence: 'Remote payment disabled after due date. Requires 80km trip to Magalang office.',
  consequenceSeverity: 10, // Maximum
  requiresTravel: false, // Becomes true AFTER deadline missed
}
```

**Urgency escalation:**
- 14 days: Medium (start planning)
- 7 days: High (pay this week)
- 3 days: Critical (pay NOW)
- 1 day: Emergency (last chance for remote payment)
- 0 days: RED ALERT (pay TODAY or forced trip tomorrow)
- After: Crisis mode (remote payment disabled)

---

## 3. Recurring Bills - Missing Implementation

### Problem
Users report having to manually re-enter the same bills every month (MERALCO, PELCO, PLDT, etc.).

### Schema Status
Fields exist but unused:
```typescript
recurrenceRule: text('recurrence_rule'),      // ← Not populated
nextDueDate: timestamp('next_due_date'),       // ← Not used
```

### Two Solution Paths

#### Option A: Quick Fix (5 minutes)
Add "🔄 Duplicate for Next Month" button:
```typescript
// On bill card, add button that:
1. Copies current bill
2. Sets dueDate to +1 month
3. Resets status to 'pending'
4. Calls POST /api/bills
```

**Pros:** Immediate relief, simple  
**Cons:** Still manual (requires click each month)

#### Option B: Full Recurrence System (2 hours)
**Schema additions:**
```typescript
recurrenceEnabled: boolean('recurrence_enabled').default(false),
recurrenceFrequency: text('recurrence_frequency', { 
  enum: ['monthly', 'quarterly', 'biannual', 'annual'] 
}),
recurrenceInterval: integer('recurrence_interval').default(1),
recurrenceDayOfMonth: integer('recurrence_day_of_month'),
```

**UI Components:**
- RecurrenceSelector (checkbox + frequency dropdown + day picker)
- Auto-create next occurrence when marking as paid
- Recurrence icon (🔄) on bills list
- Edit recurrence settings

**Logic:**
```typescript
// When user marks recurring bill as paid:
1. Mark current as paid
2. Calculate nextDueDate based on frequency
3. Auto-create new bill with nextDueDate
4. Show toast: "✓ Paid and [Month] bill created"
```

**Edge cases:**
- Month-end bills (31st → Feb = 28th/29th)
- Leap years
- Duplicate prevention
- Timezone handling

### Recommended Approach
**Implement both:**
1. Quick fix TODAY (immediate relief)
2. Full system THIS WEEK (proper solution)

---

## 4. Phase 2 Scope: Mission-Critical Notifications

### Goal
Make it IMPOSSIBLE to miss PELCO deadline.

### Components

**Week 1: Web Push Notifications**
- VAPID key generation
- Push subscription in PWA
- Notification permission flow
- Test notifications on mobile

**Week 2: Notification Scheduler**
- Vercel Cron job (runs 3x daily: 6am, 12pm, 6pm Manila time)
- Check bills due in next 14 days
- Send escalating notifications based on urgency
- Hard-deadline bills (PELCO) escalate faster

**Week 3: SMS Fallback (Twilio)**
- SMS for critical/emergency only (cost control)
- Triggered when:
  - PELCO due ≤3 days
  - Weather risk + travel required
  - Web push unacknowledged 24hrs

**Week 4: Acknowledgment System**
- Critical bills require tap to acknowledge
- Full-screen modal (can't dismiss without action)
- Options: "I'm Paying Now" | "Schedule Trip" | "Need Spouse Help"
- Escalates to spouse if ignored 24-48hrs
- Tracks acknowledgment history

**Week 5: Weather Integration**
- OpenWeatherMap API for Magalang forecast
- Correlate weather + PELCO due date + travel requirement
- Proactive alerts: "PELCO due in 6 days BUT typhoon forecast. Pay early NOW."

### Success Criteria
- [ ] Receive push notification 7 days before PELCO
- [ ] Escalating notifications (3 days, 1 day, due date)
- [ ] SMS if weather + PELCO within 3 days
- [ ] Can't dismiss PELCO notification without acknowledging
- [ ] Spouse alerted if ignored 24hrs
- [ ] Zero PELCO lapses over 3 months

---

## 5. Comparison: Homebase vs Alexa/Google Nest

### What Alexa/Nest Do Better
- Voice recognition (professional quality)
- Always-on wake word detection
- Smart home integration (lights, thermostats)
- Music/entertainment
- Plug-and-play setup

### Where Homebase Destroys Alexa/Nest

**1. Memory & Context**
- Alexa: One-time reminder, easily dismissed
- Homebase: Full history + escalating persistence until action taken

**2. Multi-Residence Intelligence**
- Alexa: No concept of multiple locations
- Homebase: Residence-aware, factors travel distance into urgency

**3. ADHD-Specific Design**
- Alexa: Dismissible notifications (swipe away = gone)
- Homebase: Require acknowledgment for critical items, visual urgency screams

**4. Learning from Failures**
- Alexa: Treats all reminders equally
- Homebase: Learns "PELCO caused typhoon trip" → permanently elevates urgency

**5. Hard Deadline Awareness**
- Alexa: Doesn't understand "remote payment window closes at deadline"
- Homebase: Calculates urgency based on payment method constraints

**6. Privacy & Ownership**
- Alexa: Cloud-dependent, data on Amazon servers
- Homebase (Phase 12+): Self-hosted, works offline, zero subscriptions

### Use Case Differentiation
- **Alexa:** General-purpose convenience assistant
- **Homebase:** Crisis prevention system for ADHD household management

**They're complementary, not competitive.**

---

## 6. Technical Decisions & Patterns

### Authentication
```typescript
// JWT in httpOnly cookie
// Payload: { userId, orgId, email, role }
// 7-day expiration
// Row-level security: all queries filter by user's orgId
```

### Visual Urgency System
```typescript
function getUrgencyClass(daysUntil: number, isCritical: boolean) {
  if (daysUntil < 0) return 'bg-red-600 text-white'; // Overdue
  if (daysUntil === 0) return 'bg-red-500 text-white'; // Due today
  if (daysUntil <= 1 && isCritical) return 'bg-orange-500 text-white';
  if (daysUntil <= 3) return 'bg-orange-100 border-orange-500';
  if (daysUntil <= 7) return 'bg-yellow-100 border-yellow-500';
  return 'bg-white border-gray-200';
}
```

Hard-deadline bills (PELCO) use different thresholds (escalate earlier).

### Philippine Locale
- Currency: `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
- Dates: `toLocaleDateString('en-PH')`
- Timezone: 'Asia/Manila'

### Mobile-First Design
- Touch targets: 44px minimum (iOS guideline)
- High contrast colors (ADHD brains ignore subtle)
- Large text, bold urgency indicators
- No subtle animations (use aggressive pulse for critical)

---

## 7. Immediate Next Actions

### For New Conversation Thread

**Context to provide:**
1. Link GitHub repo: https://github.com/alfieprojectsdev/homebase
2. Reference `/docs/ADR.md` for complete architecture
3. Current pain point: Bill recurrence not implemented
4. Agentic tools: OpenCode + Sisyphus + GLM-4.7, Claude Code

**First task:**
Implement bill recurrence system (see Section 3 above for requirements).

**Prompt to use:**
```markdown
# Implement Bill Recurrence System

Context: homebase/docs/ADR.md documents the full architecture. Database schema has recurrence fields but no UI/logic.

Problem: Users manually re-enter same bills monthly (MERALCO, PELCO, PLDT).

Solution: Auto-create next occurrence when marking recurring bill as paid.

Requirements:
[Use refined prompt from Section 3 above]

Files to modify:
- src/lib/db/schema.ts
- src/components/bills/recurrence-selector.tsx (create)
- src/app/(dashboard)/bills/new/page.tsx
- src/app/(dashboard)/bills/page.tsx
- src/lib/utils/recurrence.ts (create)

Success: Mark MERALCO as paid → February MERALCO auto-creates.
```

### After Recurrence is Fixed

**Deploy to production:**
```bash
vercel --prod
```

**Test in real life:**
- Add actual bills (MERALCO QC, PELCO Magalang, PLDT)
- Mark as recurring
- Pay one → verify next month auto-created
- Use for 1 week, note friction points

**Then proceed to Phase 2:**
- Mission-critical notifications
- Weather integration
- SMS fallback
- Acknowledgment system

---

## 8. Long-Term Vision (Months 6-12)

### Phase 12-13: Self-Hosted JARVIS

**Hardware:** Mini PC (~₱20,000) or Raspberry Pi 5 (₱6,000)

**Software Stack:**
- Ollama (LLM inference: Llama 3.1 8B or 70B)
- Whisper.cpp (speech-to-text)
- Piper TTS (text-to-speech)
- Self-hosted Postgres (migrate from Neon)

**Capabilities:**
- Conversational queries: "When did I last pay PELCO?"
- Proactive suggestions: "PELCO due next week, but typhoon season. Pay early?"
- Pattern learning: "You procrastinate PELCO → elevated urgency"
- Offline operation: Works during internet outages
- Zero subscriptions: One-time hardware cost

**Timeline:**
- Month 6: Migrate to self-hosted
- Month 7: Add Ollama + basic RAG
- Month 8: Voice interface
- Month 9: Proactive agent
- Month 10-12: Refinement + wake word

---

## 9. Key Files Reference

### Critical Files to Know
```
/docs/ADR.md                           # Complete architecture (all phases)
/src/lib/db/schema.ts                  # Database schema
/src/lib/auth/jwt.ts                   # Authentication logic
/src/app/(dashboard)/bills/page.tsx    # Bills list (main UI)
/src/app/api/bills/route.ts            # Bills CRUD API
/middleware.ts                         # Route protection
```

### Environment Variables
```bash
DATABASE_URL="postgresql://..."       # Neon connection string
JWT_SECRET="..."                      # Generate: openssl rand -base64 32

# Phase 2+:
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
OPENWEATHER_API_KEY="..."
```

---

## 10. Testing Checklist (Verify Before Phase 2)

**Phase 1 Functionality:**
- [ ] Sign up creates account
- [ ] Login sets JWT cookie
- [ ] Bills list shows with urgency colors
- [ ] Can add bill (all fields save)
- [ ] Can mark as paid
- [ ] Paid bills show green badge
- [ ] Overdue bills appear at top with red styling
- [ ] Mobile responsive (test on real device)
- [ ] Row-level security (bills filtered by org)

**PELCO-Specific:**
- [ ] PELCO marked as `hardDeadline: true`
- [ ] Shows elevated urgency (orange/red earlier than standard bills)
- [ ] UI explains remote payment window constraint
- [ ] Deadline consequence visible

**Recurrence (After Implementation):**
- [ ] Can mark bill as recurring
- [ ] Frequency selector works (monthly/quarterly/annual)
- [ ] Marking recurring bill as paid auto-creates next
- [ ] Next occurrence has correct due date
- [ ] Recurrence icon shows on list
- [ ] Can disable recurrence

---

## 11. Known Issues & Workarounds

### Issue: No PWA Install Prompt Yet
**Status:** Phase 4  
**Workaround:** Add manually via browser menu  
**Fix:** Implement service worker + manifest in Phase 4

### Issue: No Offline Support
**Status:** Phase 4  
**Workaround:** Require internet connection  
**Fix:** IndexedDB + background sync in Phase 4

### Issue: No Push Notifications
**Status:** Phase 2  
**Workaround:** Check app daily manually  
**Fix:** Implementing next (see Section 4)

### Issue: Bill Recurrence Manual
**Status:** Fixing NOW  
**Workaround:** Use "Duplicate" button (if implemented)  
**Fix:** In progress (see Section 3)

---

## 12. Success Metrics

### Phase 1 (Current)
- ✅ App deployed and accessible
- ✅ Can track bills across 2+ residences
- ✅ Visual urgency system working
- ✅ Used for 1+ real bill payments

### Phase 2 (Next 2 Weeks)
- [ ] Receive notification 7 days before PELCO
- [ ] Notification escalates at 3 days, 1 day, due date
- [ ] SMS sent for critical bills
- [ ] Can't dismiss PELCO without acknowledging
- [ ] Zero bills forgotten over 1 month

### Phase 12-13 (6-12 Months)
- [ ] JARVIS responds to "When's PELCO due?"
- [ ] Proactive: "Pay PELCO early, typhoon forecast"
- [ ] Works offline (local LLM)
- [ ] Zero monthly costs (self-hosted)

---

## 13. Handover Summary

**What the Next Agent Needs to Know:**

1. **Project Goal:** Prevent ADHD-related household emergencies (like PELCO typhoon trip)
2. **Current Status:** Phase 1 complete, bill recurrence missing
3. **Immediate Task:** Implement recurring bills (auto-create on payment)
4. **Critical Context:** PELCO has hard deadline (remote payment disabled after due date)
5. **Tech Stack:** Next.js 14 + Neon + Drizzle + Vercel
6. **Development Tools:** OpenCode + Claude Code with GLM-4.7
7. **Repository:** GitHub public, anonymized, production-ready
8. **Next Phase:** Mission-critical notifications (Phase 2)

**Prompt for Next Thread:**
```
I'm working on Homebase (https://github.com/alfieprojectsdev/homebase), an ADHD-optimized household management system. 

Phase 1 is complete (bills tracking), but bill recurrence isn't implemented. Users must manually re-enter the same bills every month.

See /docs/ADR.md for full architecture. Database schema has recurrence fields but no UI/logic to use them.

Task: Implement auto-recurring bills that create next month's occurrence when marked as paid.

Can you help implement this? Files to modify: [list from Section 3]
```

---

**END OF HANDOVER DOCUMENT**

---

## Quick Reference Card

**Repository:** https://github.com/alfieprojectsdev/homebase  
**Documentation:** `/docs/ADR.md` (complete 13-phase roadmap)  
**Current Phase:** 1 (Complete) → 1.5 (Recurrence) → 2 (Notifications)  
**Tech:** Next.js 14 + Neon Postgres + Drizzle + Vercel  
**Tools:** OpenCode + Sisyphus + GLM-4.7, Claude Code  
**Critical Domain Logic:** PELCO hard deadline (see Section 2)  
**Immediate Need:** Implement bill recurrence (see Section 3)  

**Status:** Production-ready foundation, expanding features weekly.

---

*This document contains everything needed to continue development in a new conversation thread. Reference it as the source of truth for project context.*