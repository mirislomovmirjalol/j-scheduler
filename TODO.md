# TODO.md

Ordered build plan for the padel bot. **Build strictly top to bottom** — each
milestone is a working, testable increment. Don't start a milestone until the
previous one runs against the staging bot.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · 🔒 blocked · 💡 v2

---

## Milestone 0 — Project setup

- [x] Init TanStack Start + Convex + Tailwind project. (turborepo scaffold,
      `apps/web` + `packages/backend` already in place)
- [x] Create a Telegram bot (@j_schedule_bot) + a private test group. Only
      one bot exists for now (no prod split yet — explicit call by the
      user, revisit before going live with the real игры group).
- [~] Create **prod** Telegram bot + confirm it's in the игры group as **admin**
      🔒 blocked — deliberately deferred until closer to launch.
- [x] Set Convex env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SECRET_TOKEN`,
      `TELEGRAM_CHAT_ID`, `SEED_ADMIN_TELEGRAM_ID` all set on the dev
      deployment. Bot confirmed admin in the test group (`can_delete_messages`
      + `can_pin_messages` both true).
- [ ] Commit `schema.ts`, `CLAUDE.md`, `TODO.md`.

## Milestone 1 — Schema ✅ (delivered)

- [x] Define all six tables + indexes (`schema.ts`).
- [x] Push schema to Convex, confirm it deploys clean. (verified via
      `convex dev --once`)
- [x] Seed the first admin from `SEED_ADMIN_TELEGRAM_ID`. (bootstrapped on
      first `/start` — see `players.upsertFromTelegramStart`)

## Milestone 2 — Webhook skeleton (the spine) ✅

- [x] `convex/http.ts`: `httpAction` at `/telegram`.
- [x] Verify `secret_token` header; reject if mismatch. (tested: wrong
      secret → 401)
- [x] Dedup on `update_id` via `processedUpdates` (+ cron to prune). (tested:
      resend of same `update_id` short-circuits to 200 without reprocessing)
- [x] Router: dispatch `message` (`/start`, admin commands) vs `callback_query`.
- [x] `setWebhook` helper (points staging bot at the Convex URL).
- [~] Throttled/queued Bot API sender — `callTelegramApi` backs off on 429
      w/ `retry_after`, but there's no proactive queue yet. Revisit when
      Milestone 7's roster sweep needs to fan out to many DMs at once.
- [x] Central Russian strings module (`convex/lib/strings.ts`).
- [x] `toTashkent` / `fromTashkent` time helpers (`convex/lib/time.ts`).

**Test:** bot receives updates, dedupes retries, rejects forged calls. ✅
verified end-to-end against the dev deployment with synthetic webhook POSTs.

## Milestone 3 — DM opt-in ✅ (core)

- [x] `/start` in DM → create/find player, set `wantsDms: true`. (tested via
      synthetic webhook POST + direct mutation call)
- [x] `sendDM` helper wrapping the 403 → `wantsDms: false` fallback.
      (`convex/telegram/dm.ts`, not yet live-tested against a real block —
      needs a real Telegram user to block the bot to exercise the 403 path)
- [ ] (Optional) `[🔔 Напоминания]` deep-link button so opt-in is discoverable.

**Test:** `/start` flips the flag; blocking the bot flips it back on next send.

## Milestone 4 — Match creation (admin) + board render ✅

- [x] Convex mutations: `createMatch`, `editMatch` (`convex/matches.ts`,
      shared write path — no other code path writes to `matches`).
- [x] Board renderer: all open matches, **sorted by `startsAt`**, collapsed
      rosters, header + count + Join button. Guard the 4096-char limit.
      (`convex/lib/board.ts`, pure function, easy to unit test later.)
- [x] Post board to group; store `messageId` in `boardState`.
      (`convex/telegram/board.ts` syncBoard action + `convex/boardState.ts`)
- [x] Reschedule cancels stale reminder jobs (via `matchReminders`) before
      rescheduling. (Reschedule = editMatch changing `startsAt`.) Currently a
      no-op in practice since Milestone 7 hasn't populated `matchReminders`
      yet, but the cancel-then-delete logic is in place and will engage once
      it does.
- [x] Re-ping confirmed roster on reschedule. (`convex/telegram/notify.ts`
      matchRescheduled — also currently a no-op until Milestone 5 populates
      rosters, but wired and tested not to throw on an empty roster.)

**Test:** create a match from Convex → board appears, sorted, under char
limit. ✅ Verified against the live test group: `createMatch` posted a fresh
board message; `editMatch` (startsAt change) edited that same message in
place rather than reposting.

Known gap: `createMatch`/`editMatch` take `createdBy` / trust the caller
directly — there's no real admin-authorization check yet since Telegram
Login Widget auth doesn't exist until Milestone 8. Fine for now (only
reachable via direct Convex calls, no public client wires to these yet); close
this gap when the dashboard starts calling them.

## Milestone 5 — Join / waitlist callbacks ✅

- [x] `callback_query` Join → mutation, then `answerCallbackQuery` with the
      real outcome text. Deviates from literal "ack first" ordering, but
      Convex mutations return in tens of ms — nowhere near the 15s budget —
      and this gives a meaningful toast ("Ты в игре!" vs "лист ожидания")
      instead of a silent ack. Wrapped in try/catch so we always ack even on
      an internal error. (`convex/telegram/router.ts`)
- [x] `joinMatch` mutation: capacity check **inside** the mutation; roster if
      space, else waitlist. Auto-create player on first join — via a shared
      `findOrCreatePlayerFromTelegram` helper that does **not** set
      `wantsDms`, so joining never silently opts someone into DMs (Golden
      Rule 2). (`convex/memberships.ts`)
- [x] Guard double-join (`by_match_and_player`) — re-tapping Join returns
      `alreadyJoined: true` with current role, no duplicate row.
- [x] Recompute + edit board in place; swallow "not modified". Edit
      **coalescing** on rapid taps is NOT implemented — each Join schedules
      its own `syncBoard` call. For this community's scale (dozens, not
      thousands, of concurrent tappers) this stays well inside Telegram's
      per-chat edit rate limit; revisit if Milestone 10 load testing says
      otherwise.

**Test:** two simultaneous taps for the last seat → one roster, one
waitlist. ✅ Verified directly against the dev deployment: fired two
concurrent `joinMatch` calls at a `maxMembers: 1` match — one got `roster`,
the other `waitlist`, no double-booking. Re-tapping the same join was
confirmed idempotent (no duplicate membership row).

## Milestone 6 — Burial fix (repost board) 🔒 blocked

- [ ] Increment `messagesSincePost` on group chatter.
- [ ] Past threshold (~15): delete old board (handle <48h / lost-rights
      gracefully), repost at bottom, update `boardState`.
- [ ] Taps on a superseded board answer "игра опустилась ниже 👇", do nothing.

**Test:** flood the test group → board reposts once, cleanly.

🔒 Blocked on disabling the bot's group privacy mode (@BotFather → Bot
Settings → Group Privacy → off) — without it we only see commands, not
regular chatter, so `messagesSincePost` can't be counted. Deliberately
skipped for now (deviates from "don't start a milestone until the previous
one runs" — explicit call to keep momentum on M7 instead); revisit once
privacy mode is off.

## Milestone 7 — Reminders ✅

- [x] On create/reschedule, schedule T-3h and T-30m jobs; store `jobId`s.
      (`convex/matches.ts` scheduleReminders, called from both createMatch
      and editMatch-on-reschedule). A lead time already in the past (e.g.
      match created <30min out) is skipped rather than firing immediately.
- [x] Sweep DMs the **opted-in confirmed roster** only (throttled sender).
      (`convex/telegram/reminders.ts` — sequential `sendDMText` calls; no
      explicit rate-limit queue yet, same known gap as Milestone 2's sender,
      fine at this scale.)
- [x] Reminder includes a quick Drop button (frees seat → admin promotes).
      Self-serve drop only reachable from the DM reminder, never from the
      public board — roster removal there stays admin-only per v1 scope.
- [x] Dead-man's-switch cron for silent failures. Added `firedAt` to
      `matchReminders` (schema change) so "fired" is distinguishable from
      "never scheduled" — the switch flags matches whose reminder came due
      but has no `firedAt`. v1 "alerting" = loud `console.error`, visible in
      the Convex dashboard; no external paging channel yet.

**Test:** short-horizon match fires both reminders to opted-in players only.
✅ Verified fully live: created a match 4h out, joined the real seed-admin
account to the roster, manually fired the T-30m job — a real DM landed with
the Drop button, tapping it soft-deleted the membership
(`isDeleted: true` confirmed in the DB), and the dead-man's-switch ran clean
(nothing overdue, as expected since T-3h wasn't due yet).

## Milestone 8 — Web dashboard rewrite (pure Vite + TanStack Router) [~]

Scraps the original TanStack Start dashboard (admin + read-only player view)
for a from-scratch rebuild in a new app (`apps/admin`), client-only (no SSR).
Designed and built step-by-step together, one screen/flow at a time — not
implemented from a big upfront spec. The Convex backend (`packages/backend`)
is unaffected; this only replaces the frontend.

Motivation: repeated, hard-to-resolve upstream friction deploying TanStack
Start (Nitro) to Vercel, plus wanting a more deliberate, modern,
design-focused UI than the first pass.

- [ ] Scaffold `apps/admin`: Vite + TanStack Router, Telegram Login Widget
      auth (reuses the existing server-side verification in
      `convex/auth/telegramPlugin.ts` — no backend changes needed).
- [ ] Re-cover the full feature surface as each piece is redesigned: unified
      match list/detail (admin + player), match CRUD, roster/waitlist
      management, guest add, player management + profile, "Отправить в
      группу", personal history.
- [ ] Once the new app is live end-to-end, retire `apps/web` and update
      CLAUDE.md's tech stack table (currently lists "TanStack Start").

## Milestone 9 — Hardening before prod

- [ ] Point **prod** bot webhook at prod Convex.
- [ ] Confirm bot admin rights in игры.
- [ ] Verify Russian strings everywhere; no English leaks.
- [ ] Rate-limit sender load-tested against a full roster sweep.
- [ ] Logging + dead-man's-switch confirmed firing.
- [ ] Seed prod admin; walk the full flow once end-to-end in staging.

---

## v2 backlog (do NOT build without an explicit decision)

- 💡 **One-click weekly templates** — save match config, spawn this week's game
  with one click (auto-fill everything, confirm date). Later: auto-spawn cron.
- 💡 **Guest-bringing** — host + N guests, guest self-cancel independent of host,
  host-drop cascade rules, per-host cap.
- 💡 **Guest→authed merge** — repoint memberships, soft-delete guest row.
- 💡 **Verified levels + enforcement** — real player levels; warn/block on join
  mismatch (e.g. "это уровень 2, всё равно записаться?").
- 💡 **Payment tracking** — per-member paid status; price already per-person.
- 💡 **Court/venue table** — dropdown, default price per venue (replaces free text).
- 💡 **Attendance / no-show reliability** — mark who actually showed; reliability
  history. (Lunda covers stats today; memberships already leave room.)
- 💡 **Per-level admins** — scope organizers to specific levels.
- 💡 **Board summary auto-text** — generate the "Напоминание, завтра…" roster text
  we currently type by hand.
- 💡 **Telegram Mini App** — richer in-Telegram player experience.
- 💡 **Multi-chat / forum topics** — per-level threads if the community grows.
- 💡 **Quiet hours / per-user reminder lead time** — for opted-in players.

---

## Open questions (none blocking v1)

- Board display fork resolved: **collapsed rosters** (full detail in web view).
  Revisit only if you want inline rosters + message-splitting.
