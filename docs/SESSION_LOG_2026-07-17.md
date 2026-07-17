# Session Log — 2026-07-17: Chores restart executed (native Android v0.1.0 → v0.3.0)

Continuation of the 2026-07-16 scoping session (`HANDOVER-chores-restart-2026-07-16.md`).
This session executed the handover's priority list end-to-end and shipped three
signed Android releases.

## Shipped

**Releases** (all on https://github.com/alfieprojectsdev/homebase/releases, same
signature, update-in-place):

| Version | Contents |
|---|---|
| v0.1.0 | Login, chore list (Room offline cache), mark-done, **local-first reminder engine**, background delta sync, reliability prompts |
| v0.2.0 | Chore creation UI (title/description/reminder frequency) |
| v0.3.0 | Username-based account creation from the login screen |

**App:** `apps/android/` — native Kotlin, Compose, modeled on gearsync conventions
(AGP 8.3.0, Kotlin 1.9.23, Gradle 8.14.1, compileSdk 34/minSdk 26, Groovy DSL).
19 JVM unit tests green.

## Decisions made this session (owner-confirmed)

1. **No Firebase anywhere** — the handover's FCM delta channel is dropped.
   Delta sync = WorkManager periodic pull (15-min floor) + full sync on app
   open, against the existing Neon-backed Next.js API. Worst-case staleness
   for server-side changes ≈ one sync period; reminders unaffected (they fire
   from the on-device schedule). `device_tokens` table exists in Neon but
   nothing writes to it yet — keep or drop when auth framework lands.
2. **Bootstrap auth accepted** — internal family tool: usernames map to
   `<username>@homebase.local` (server email-format constraint satisfied, zero
   server changes), no verification. Proper auth framework deferred.
3. **Release process**: local `./gradlew assembleRelease` → GitHub Releases
   (sideload). No Play Store, no EAS.
4. **Neon CLI** (`npx neonctl`, v2.33.2 available) preferred for DB devops —
   owner must run `npx neonctl auth` once before agent sessions can use it.

## Key implementation facts

- **Reminder engine** (`apps/android/.../reminders/`): `ReminderLogic` is pure
  JVM (12 tests) — hourly/2h/3h/custom-times frequencies, active-hours window
  clamping, null frequency → no reminders (web parity). One
  `setExactAndAllowWhileIdle` alarm per chore; notification fires from Room
  with zero network; receiver chains the next occurrence; `BootReceiver`
  reschedules after reboot. In-app banners deep-link battery-optimization
  exemption (One UI app sleeper) + exact-alarm permission (API 33+).
- **Signing**: keystore at `~/keystores/homebase-release.jks`, config in
  gitignored `apps/android/keystore.properties`. Cert SHA-256 `21eabeac…`.
  **NEEDS OFF-MACHINE BACKUP** — losing it = uninstall/reinstall everywhere.
- **Server changes**: `GET /api/chores?updatedSince=<ISO>` delta param;
  `device_tokens` table (migration 0005, applied to Neon); dead
  `src/lib/notifications/chores.ts` deleted (its semantics now live on-device
  in `ReminderLogic`).
- **Base URL** baked into the APK: `http://192.168.48.120:3000`
  (`BuildConfig.API_BASE_URL` + `usesCleartextTraffic`) — LAN dev only.
- Drizzle: `generate:pg`/`push:pg` are deprecated → `generate`/`push`; config
  doesn't read `.env.local` — `set -a; source .env.local; set +a` first.

## Housekeeping done

- `.claude` harness swap committed; test_*.txt debris deleted.
- CLAUDE.md's false "Phase 7 shipped" corrected (audit: CRUD/feedback/history/
  streaks/leaderboard work; reminders were dead code). ROADMAP tech
  constraints reconciled with the restart decisions.
- Expo scaffold parked: deps pinned back to buildable SDK 52, PARKED README
  added. Directory kept in place (not renamed).
- e2e chores suite: 18/21 failures are **test bugs**, not app bugs — bare
  `request` fixture (cookie-less → 401s) and strict-mode locator collisions.
  Not fixed this session; don't chase phantom regressions.

## Next session queue (priority order)

1. **On-device smoke test** (owner, A07/A56): install v0.3.0, create account,
   add chore with hourly reminder, verify notification fires with app killed +
   screen off. This is the whole point of going native — validate it first.
2. Real deployment URL (Vercel) baked into a release; swap
   `usesCleartextTraffic` for a network-security-config.
3. PWA pass for kids' iOS devices (handover step 4): offline-capable chores
   views, web push where ≥16.4, iPhone-7 badge fallback.
4. Parity features: streaks, leaderboard, feedback UI in the Android app.
5. Custom HH:MM reminder times UI (engine already supports them).
6. Fix the e2e chores suite (two mechanical bugs above).

## Untracked-file limbo (deliberately untouched, owner to triage)

`.eslintrc.json`, `CLAUDE.new.md`, `HEXAGONAL_ARCHITECTURE_ANALYSIS.md`,
`docs/20260330-harness flow.md`, `docs/notif-test-guide.md`,
`scripts/migrate-production.ts`, `scripts/reset-demo-password.ts`
