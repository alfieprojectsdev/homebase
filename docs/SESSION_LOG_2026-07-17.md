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

---

## Addendum 2026-07-18: production provisioning (Neon CLI + Vercel CLI)

- **v0.4.0 released** — APK now points at `https://homebase-blond.vercel.app`
  (cleartext dropped). App works off-LAN. Accounts made against the LAN dev
  server live in the dev DB; family should sign up fresh on v0.4.0.
- **Prod login had been 500ing**: Vercel's Neon **production** branch
  (project `plain-hill-24100914`, org Alfie) was missing
  `users.expo_push_token` + `device_tokens` — all prior drizzle pushes had
  hit the **development** branch (`.env.local`). Fixed via
  `drizzle-kit push` against the production connection string (neonctl).
  **Rule going forward: every schema change needs TWO pushes — dev branch
  (.env.local) AND prod branch (neonctl connection-string production).**
- **CRON_SECRET** was never set in Vercel — daily 9AM briefing cron had
  401'd since deployment. Generated, added to prod env, redeployed.
- Verified on prod: signup → login → Bearer chore create → updatedSince
  delta sync, all 200. Cron route correctly 401s without the secret.

---

## Addendum 2026-07-18 (2): PWA pass — offline views + web-push chore reminders

Commit `820f28d`, deployed to prod, endpoint verified live.

- **Offline (view-only)**: `public/sw.js` rewritten — navigations +
  `GET /api/chores*` network-first with cache fallback; hashed static assets
  cache-first; Phase-2 push display handlers unchanged. Global silent SW
  registration (`src/components/SwRegister.tsx`) on every page. Root layout
  finally links `manifest.json` + apple-touch-icon/appleWebApp meta — iOS
  home-screen install had been broken (manifest existed, was never linked).
- **Chore reminders over web push** (kids' iOS ≥16.4): eligibility in
  `src/lib/notifications/chore-reminders.ts` mirrors Android `ReminderLogic`
  (frequency legs, active-hours in REMINDER_TZ=Asia/Manila, null → never).
  Recipients = assignedTo, else creator. Sends via existing VAPID service,
  logs to notification_logs, advances lastReminderSentAt even with zero
  subscribers (prevents perpetual re-trigger). Route:
  `/api/cron/chore-reminders`, CRON_SECRET-gated. Trigger:
  `.github/workflows/chore-reminders.yml` every 15 min (Vercel Hobby crons
  daily-only).
- **Verified on prod**: 401 without secret; 200 with secret
  (`checked:6 sent:0` — no push subscribers yet, correct).
- **Owner actions pending**: (1) `gh secret set CRON_SECRET` on
  alfieprojectsdev/homebase (value = Vercel prod env; command was posted in
  session), (2) `gh workflow run chore-reminders.yml` to prove the GHA path,
  (3) kids' device onboarding: iOS ≥16.4 → Safari → Add to Home Screen →
  login → Settings → Enable Push Notifications.
- Android app unaffected — never depends on this path.
