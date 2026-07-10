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
- [x] Create **prod** Telegram bot (@j_schedule_bot) + prod Convex deployment
      (`adept-dove-810`); webhook confirmed pointed at it
      (`getWebhookInfo` → `adept-dove-810.../telegram`, `pending_update_count: 0`).
- [x] Set Convex env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SECRET_TOKEN`,
      `TELEGRAM_CHAT_ID`, `SEED_ADMIN_TELEGRAM_ID` set on **both** the dev
      deployment and prod (`adept-dove-810`).
- [ ] Commit `schema.ts`, `CLAUDE.md`, `TODO.md`.

## Milestone 1 — Schema ✅ (delivered)

- [x] Define all seven tables + indexes (`schema.ts`).
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
- [x] Board renderer: all open matches, **sorted by `startsAt`**, full inline
      rosters/waitlists, header + count + Join button. Guard the 4096-char
      limit. (`convex/lib/board.ts`, pure function, easy to unit test later.)
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

## Milestone 6 — Burial fix (repost board) — descoped, not building

Automatic repost-on-burial (a `messagesSincePost` counter incrementing on
group chatter, auto delete-and-repost past a threshold) is **permanently
descoped**, not just blocked. It would've needed disabling the bot's group
privacy mode (@BotFather → Bot Settings → Group Privacy → off) to see
regular chatter, which is its own tradeoff. The manual «Отправить в группу»
button (`boardState.repostToGroup`, admin dashboard) covers this well enough
in practice — an admin reposts when they notice the board's buried. The
`messagesSincePost`/`lastPostedAt` schema fields have been removed since they
were write-only dead weight.

Revisit only if scale makes the manual button a real burden — add a fresh
entry to the v2 backlog below if that day comes, rather than reopening this
milestone.

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

- [x] Scaffold `apps/admin`: Vite + TanStack Router, Telegram Mini App +
      deep-link auth via better-auth cross-domain sessions straight to Convex.
- [x] Full feature surface covered: unified match list/detail (admin +
      player), match CRUD, roster/waitlist management (incl. self-serve
      leave + admin-cancellation tracking), guest add + add-existing-member,
      player management + profile, "Отправить в группу", personal history,
      filters.
- [x] Deployed to Vercel (`j-schedule-admin-new` project) — dev/preview
      points at the dev Convex deployment, production points at prod
      (`adept-dove-810`). Root `vercel.json` handles the Bun-workspace
      monorepo build (install at repo root, turbo-filtered build).
- [x] Error handling pass: every mutation call site now catches and toasts
      on failure; the guest-add dialog guards against double-submit.
- [ ] Strings module (CLAUDE.md Golden Rule 4) — board/DM copy still inline
      in `convex/lib/board.ts` / `matches.ts`; `apps/admin` has no strings
      module at all yet. Deliberately not done in the same pass as the other
      hardening items — it touches every user-facing string in both the bot
      and the dashboard and deserves its own careful, testable pass.
- [ ] Decide the fate of the untracked, unmounted dashboard chart components
      (`match-calendar-heatmap.tsx`, `match-trend-charts.tsx`, plus the
      `matches.listAllForCalendar` query built for them) — wire them into the
      dashboard, or delete them. They're currently `git clean`-fragile
      (untracked).
- [ ] Once you're ready, retire `apps/web`: verify the admin app end-to-end,
      delete `apps/web` + `packages/ui/src/components/dropdown-menu.tsx`
      (its only consumer), repoint/retire the old "web" Vercel project.

## Milestone 9 — Hardening before prod

- [x] Point **prod** bot webhook at prod Convex (see Milestone 0).
- [ ] Confirm bot admin rights in игры (the real group, not the test group).
- [ ] Verify Russian strings everywhere; no English leaks.
- [ ] Rate-limit sender load-tested against a full roster sweep.
- [x] Dead-man's-switch false-positive bug fixed (see below) — logging exists
      via `console.log`/`console.error`, visible in the Convex dashboard.
- [ ] Seed prod admin (log into the admin app with the `SEED_ADMIN_TELEGRAM_ID`
      account — auto-grants admin on first login, no `/start` needed); walk
      the full flow once end-to-end against the real group before general use.

**Bug fixes from the 2026-07 audit** (see `AUDIT.md` §2 for full detail):

- [x] Dead-man's-switch false positives on short-notice matches — a skipped
      reminder lead (already past when it would be scheduled) now gets a
      `jobId`-less `matchReminders` row with `firedAt` set immediately,
      instead of no row at all, so the switch stops mistaking "skipped on
      purpose" for "lost".
- [x] Webhook dedup permanently dropped updates whose handler threw — on
      failure, the `processedUpdates` row is now rolled back before
      rethrowing, so Telegram's retry gets reprocessed instead of deduped away.
- [x] Reminder-job cancellation capped at 10 rows (`.take(10)` → `.collect()`)
      — a match rescheduled 5+ times could've left a stale reminder uncancelled.
- [x] Admin `removeMember` not notifying the waitlist on a freed seat — already
      fixed by the self-serve-leave/admin-cancellation-tracking work
      (`dropMembership` is now the one shared path both call).
- [x] `webLoginRequests` had no prune cron — added, same 1h cadence as
      `processedUpdates`.
- [x] `editMatch` allowed lowering `maxMembers` below the live roster count
      (board then showed negative spots left, nobody demoted) — now rejects
      the edit ("Сначала уберите игроков из состава") until the admin clears
      seats first. No auto-demotion policy — confirmed, not building that.
- [x] `joinMatch` didn't check `isPublished` — a stale/forged callback could
      join a draft match. Now treated like a deleted match (same "игра
      пропала" response).
- [ ] No last-admin guard on `setIsAdmin`/`softDeletePlayer` — reviewed and
      **declined**: an admin could still demote/delete the only admin and
      lock the community out of the dashboard. Revisit if this ever actually
      happens.

---

## v1.5 — promoted from backlog (small, high-value, not yet built)

- 💡 **Payment tracking** — the biggest admin pain at current cadence. One
  `paidAt?`/`paymentStatus` field on `memberships`, a toggle in the roster
  table, a "кто не оплатил" line in the DM/summary. No amounts (already have
  `pricePerPerson`), no payment provider, no receipts — just replaces the
  "scroll the chat for who said перевёл" ritual.
- 💡 **Board summary auto-text** — `lib/board.ts`'s `renderBoard` already has
  all the data the hand-typed «Напоминание, завтра…» message repeats. Ship a
  per-match "Сформировать текст" button in the dashboard that produces
  copy-pasteable text; admin still posts it manually (keeps the human touch,
  no new bot-permission surface).

## v2 backlog (do NOT build without an explicit decision)

- 💡 **Waitlist auto-offer with confirmation** (chosen direction for the
  "seats sit unfilled" problem — see `AUDIT.md` §5.1) — a freed roster seat
  DMs the first waitlisted player «Место освободилось — забрать?» with a
  claim button and a time window (shorter inside T-3h); unclaimed offers fall
  through to the next person, then fall back to today's behavior (board +
  admin). Builds on `extraSeatsOpened`/DM-button plumbing that already
  exists; needs one new concept, a pending offer with an expiry job (same
  scheduler pattern as reminders). Prerequisite (admin-removal notifying the
  waitlist) is already shipped.
- 💡 **One-click weekly templates** — save match config, spawn this week's game
  with one click (auto-fill everything, confirm date). Later: auto-spawn cron.
- 💡 **Guest-bringing** — host + N guests, guest self-cancel independent of host,
  host-drop cascade rules, per-host cap.
- 💡 **Guest→authed merge** — repoint memberships, soft-delete guest row.
- 💡 **Verified levels + enforcement** — real player levels; warn/block on join
  mismatch (e.g. "это уровень 2, всё равно записаться?").
- 💡 **Court/venue table** — dropdown, default price per venue (replaces free text).
- 💡 **Attendance / no-show reliability** — mark who actually showed; reliability
  history. (Lunda covers stats today; memberships already leave room.) Sequence
  after the waitlist auto-offer model, since reliability should inform offer order.
- 💡 **Per-level admins** — scope organizers to specific levels.
- 💡 **Telegram Mini App player view** — richer in-Telegram player experience.
  Not recommended until there's evidence the web view is a real friction point.
- 💡 **Multi-chat / forum topics** — per-level threads if the community grows.
  Not recommended until growth actually demands it.
- 💡 **Quiet hours / per-user reminder lead time** — for opted-in players.
- 💡 **Automatic board burial repost** — see Milestone 6; only if the manual
  «Отправить в группу» button becomes a real burden at scale.

---

## Open questions (none blocking v1)

- Board display fork resolved: **full inline rosters** (revised from the
  original collapsed-rosters plan — see CLAUDE.md §4). The 4096-char guard in
  `lib/board.ts` is the safety net (strip mention-links, then truncate); no
  message-splitting.
