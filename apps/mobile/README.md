# PARKED — superseded by native Kotlin + PWA

This Expo/React Native scaffold (M1 mobile, `f5fa96f`) is **not active
development**. The owner explicitly rejected it as the path forward for
Phase 7 chores tracking (2026-07-16) in favor of:

1. **Native Kotlin Android app** — for the parents' phones, modeled on
   `/home/finch/repos/gearsync/`. Reliable local-first push notifications
   (AlarmManager-scheduled reminders) are the core requirement, and this
   scaffold's web-push/service-worker model can't clear the Samsung One UI
   app-sleeper problem the way a native app with a battery-optimization
   exemption can.
2. **PWA** — for the kids' hand-me-down iOS devices.

Full context and settled decisions: `docs/HANDOVER-chores-restart-2026-07-16.md`.

**Do not build on this directory.** Dependencies were pinned back to
Expo SDK 52 / RN 0.76 (from a drifted, non-buildable SDK 55/RN 0.83 state)
purely so this tree stays buildable as a reference if ever needed — not as
an invitation to resume work here.
