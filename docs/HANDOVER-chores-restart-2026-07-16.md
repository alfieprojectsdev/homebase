# Handover: Chores-Tracking Restart (2026-07-16)

Context transfer from a Claude Code session in `~/scripts` where the restart was scoped,
the Android toolchain was rebuilt, and the client-platform decisions were made with the
project owner. **Read this before planning any chores work — the decisions below are
settled with the owner and should not be re-litigated.**

## Goal

Full implementation of chores tracking (ROADMAP Phase 7, currently 🚧) on two clients:

1. **Native Android app (Kotlin)** — for the parents' phones: Samsung Galaxy A07 5G and
   Galaxy A56 5G (both One UI — the battery-optimization/app-sleeper exemption below
   applies to both), plus future hand-me-down Androids.
2. **PWA** — for the kids' hand-me-down iOS devices.

## Settled decisions

### Native Kotlin, NOT the Expo scaffold
- `apps/mobile` (Expo 52 / RN 0.76 / NativeWind, committed as "M1 mobile scaffold",
  `f5fa96f`) is **explicitly rejected** by the owner. Its fate — delete or park — is an
  open housekeeping question for this session; do not build on it.
- Model the new app on **`/home/finch/repos/gearsync/`**: Kotlin, Gradle, compileSdk 34,
  minSdk 26 (Groovy DSL `build.gradle`). Read gearsync's `CLAUDE.md` for its conventions.

### Why native: notification reliability ("always surface, never lost")
This is the owner's stated motivation and it drives the architecture:
- **Local-first reminders.** Chore reminders are predictable schedules, not server
  events. Sync the chore schedule to the device, then schedule reminders **on-device**
  (`AlarmManager.setExactAndAllowWhileIdle` / WorkManager). Zero network dependency at
  fire time — a dropped push must only ever cost a sync delay, never a lost reminder.
- **FCM high-priority only for real-time deltas** (chore assigned / completed /
  schedule changed) that re-sync the local schedule.
- **Notification channels** per category (reminders vs. completions vs. streaks).
- **Samsung One UI app sleeper** is the top notification-drop cause on the A07 —
  deep-link the user to the battery-optimization exemption during onboarding.

### iOS targets (confirmed device list) → PWA capability matrix

| Device | iOS ceiling | Web push? |
|---|---|---|
| iPhone 7 | 15.8 (hard ceiling) | **Never** — needs ≥16.4 |
| iPhone 11 (A13) | 17/18 | Yes, once updated + installed to home screen |
| iPad 9th gen (A13) | 17/18 | Yes, same conditions |

Consequence: notification delivery must be **per-device-capability**. iPhone 7 gets
in-app badge on open (or the Phase-2 SMS stub); the A13 devices get web push.
PWA boilerplate (manifest, SW, installability) shipped in Phase 1; offline-first sync
is roadmap Phase 4 and chores views should be built offline-capable.

## What already exists (build on, don't duplicate)

- **Web chores domain is substantial**: API routes (`src/app/api/chores/` — CRUD,
  feedback, history, leaderboard), dashboard pages, age-tiered components
  (`ChoreCardJunior/Teen/Steps`), `src/lib/chores/streaks.ts`,
  `src/lib/notifications/chores.ts`.
- **Bearer-token auth for mobile clients** already added (`9c772f2`) — the native app
  authenticates against the existing Next.js API with it.
- Web push via VAPID + daily-briefing cron shipped in Phase 2.

## Toolchain (ready — verified 2026-07-16)

- SDK at `~/Android/Sdk`: platform-34, build-tools 34.0.0 (+35/36), platform-tools,
  cmdline-tools, NDK 27.1. `ANDROID_HOME` + PATH exported in `~/.bashrc`.
- JDK: system **java-17** (openjdk-21 was removed; AGP is fine with 17).
- Proof: `gearsync ./gradlew :app:compileDebugKotlin` → exit 0 (gradle 8.14.1).
- No emulator installed. Do NOT `expo run:android` anything; do not reinstall the
  20G+ full Studio stack.

### Distribution (owner preference, 2026-07-16): local APK → GitHub Releases
- Build the APK locally (`./gradlew assembleRelease`) and publish it on the remote
  repo's **GitHub Releases page** (`gh release create vX.Y.Z app-release.apk`);
  family devices install by downloading from the release page (sideload — enable
  "install unknown apps" for the browser once per device).
- **Signing:** create ONE release keystore up front, git-ignored, backed up outside
  the repo. Android refuses to *update* an app whose signature changed — losing the
  keystore means uninstall/reinstall (and losing local app data) on every device.
  Debug-signed builds are fine for first smoke tests but don't ship them as releases.
- adb remains available for logcat/debugging, but it is not the install path.

## Suggested priority order

1. **Housekeeping**: uncommitted `.claude/agents` archive deletions in this repo;
   `test_*.txt` / `test_output*.txt` debris at repo root; decide Expo scaffold fate.
2. **Plan the native app** (module layout mirroring gearsync, auth flow vs. Bearer API,
   local-first notification engine as above) — plan before code; hexagonal conventions
   apply (`HEXAGONAL_ARCHITECTURE_ANALYSIS.md`, `CLAUDE.md`).
3. **Native app MVP**: login → chore list (assigned-to-me) → complete/steps → local
   reminder scheduling → FCM delta channel.
4. **PWA chores pass**: offline-capable views, push where supported, iPhone-7 fallback.
5. Parity features: streaks, leaderboard, feedback.

---
*This file was generated from the scripts-session context; commit it (or fold it into
ROADMAP/CLAUDE.md) as part of housekeeping.*
