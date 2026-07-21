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
- [x] Commit `schema.ts`, `CLAUDE.md`, `TODO.md`.

## Milestone 1 — Schema ✅ (delivered)

- [x] Define all core tables + indexes (`schema.ts`) — started at seven,
      `communitySettings` added later in Milestone 10 (eight now).
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
- [x] Board renderer: one message per match, full inline rosters/waitlists,
      header + count + Join button. Guard the 4096-char limit.
      (`convex/lib/matchMessage.ts`, pure function, easy to unit test later.
      Originally one combined message for all open matches — split into
      per-match messages later, see the "board split into per-match
      messages" changelog entry below.)
- [x] Post each match's message to the group; store `messageId` per match in
      `matchBoardMessages`. (`convex/telegram/matchBoard.ts` syncMatchMessage
      action + `convex/matchBoardMessages.ts`)
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
- [x] Recompute + edit that match's message in place; swallow "not
      modified". Edit **coalescing** on rapid taps is NOT implemented — each
      Join schedules its own `syncMatchMessage` call. For this community's
      scale (dozens, not thousands, of concurrent tappers) this stays well
      inside Telegram's per-chat edit rate limit; revisit if a real load test
      ever says
      otherwise (Milestone 9's "rate-limit sender load-tested" item covers
      the DM side, not this).

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
regular chatter, which is its own tradeoff. The manual «Отправить в группу» /
«Отправить все игры» buttons (`matches.repostMatchToGroup` /
`matches.repostAllToGroup`, admin dashboard) cover this well enough in
practice — an admin reposts when they notice a match buried. The
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
      and the dashboard and deserves its own careful, testable pass. Still
      the single most overdue item on this list.
- [x] Decide the fate of the dashboard chart components
      (`match-calendar-heatmap.tsx`, `match-trend-charts.tsx`) — kept and
      wired in (calendar heatmap now also powers the per-player activity
      calendar on both the admin and public profile pages); both are
      git-tracked now, no longer `git clean`-fragile.
- [x] ~~Retire `apps/web`~~ — superseded by a different decision: instead of
      deleting it, `apps/web` was **repurposed** into a public Next.js
      marketing site (home/about/community/tournaments, no auth), separate
      from the actual dashboard (`apps/admin`). Nothing left to retire —
      `packages/ui/src/components/dropdown-menu.tsx` is still live, now used
      by `apps/admin`'s own `user-menu.tsx`.

## Milestone 9 — Hardening before prod

- [x] Point **prod** bot webhook at prod Convex (see Milestone 0).
- [x] Confirm bot admin rights in игры (the real group, not the test group) —
      including the granular "Manage Topics" right, needed once the board
      started posting into the group's "Игры" forum topic.
- [ ] Verify Russian strings everywhere; no English leaks.
- [ ] Rate-limit sender load-tested against a full roster sweep.
- [x] Dead-man's-switch false-positive bug fixed (see below) — logging exists
      via `console.log`/`console.error`, visible in the Convex dashboard.
- [x] Seed prod admin (log into the admin app with the `SEED_ADMIN_TELEGRAM_ID`
      account — auto-grants admin on first login, no `/start` needed); walk
      the full flow once end-to-end against the real group before general use.
      **Prod is now live**: real matches created, players joining from both
      the group and the web dashboard (33 memberships as of 2026-07). Prod
      was deliberately wiped to admins-only once (`maintenance.wipeAllData
      KeepAdmins`, 2026-07) right before this rollout, to clear test data
      without touching the admin roster.

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

## Milestone 10 — Player-facing depth + prod rollout (2026-07) ✅

Built directly against the now-live prod community, each piece tested against
dev first. Two items formerly sitting in the v2 backlog (payment tracking,
attendance/no-show reliability) got promoted and shipped here — see CLAUDE.md
§10 for the updated scope split.

- [x] **Attendance tracking** — `memberships.noShow`. Default-attended for
      everyone; an admin flags a no-show after the fact on a past match's
      roster (never an opt-in check-in flow — this was an explicit product
      decision, not a simplification). Surfaced as a no-show list on the
      admin player-profile page.
- [x] **Public player profiles** — `/p/:playerId`, no auth required, name +
      level + GitHub-style activity calendar only (explicit privacy decision
      — no username, no contact info). Shareable outside Telegram.
- [x] **Player self-serve join from the web** — `memberships.joinMatchSelf`,
      the same capacity-check/waitlist logic as the bot's `joinMatch` and the
      admin's add-existing-player, via one shared `joinOrResurrectMembership`
      helper (Golden Rule 1 — three call sites, one write path).
- [x] **Bot commands `/matches` and `/my`** — all open matches, and the
      caller's own match history, both open to anyone, in group or DM.
- [x] **`/pay` bot command** + `communitySettings` table (new, single-row) —
      posts the admin-set payment info; works in the group or a DM, unlike
      `/start` which only makes sense as a DM.
- [x] **Manual payment tracking** — `memberships.paid`, admin-toggled from the
      roster table. Redacted **server-side** for non-admin/non-owner readers,
      not just hidden in the UI.
- [x] **Matches page rework** — three mutually-exclusive views (Все игры /
      Активные / Прошедшие) with sort fully decoupled from scope; real cursor
      pagination on the two views with no natural upper bound (Все игры,
      Прошедшие).
- [x] **Cursor pagination extended to player history** — own history, admin-
      viewed history, no-shows. Needed denormalizing `matches.startsAt` onto
      `memberships.matchStartsAt` (kept in sync at write time) since Convex
      can't paginate a join ordered by a field that only lives on the far
      side of it. The old bounded reads (`listMyHistory` et al.) stayed, but
      narrowed to backing only stat-card counts, never a rendered list.
- [x] **Board → forum topic + pin-on-repost** — `TELEGRAM_TOPIC_ID` posts the
      board into a specific topic (e.g. the group's "Игры" thread) instead of
      the default thread; pinning fires only on a force-repost, never on a
      silent join/leave edit. Surfaced a real Telegram gotcha along the way:
      the bot needs the granular **"Manage Topics"** admin right, not just
      general admin status, or posting into a closed topic fails
      (`TOPIC_CLOSED`) — see CLAUDE.md §6.
- [x] **Sidebar navigation rewrite** — `AppSidebar`/`SidebarProvider`
      (`packages/ui`) replaced the earlier floating icon nav; added
      `/profile` and `/settings` pages.
- [x] **Prod data reset** — one-off `maintenance.wipeAllDataKeepAdmins`
      (internalMutation, scoped/temporary deploy key, run once via CLI with
      explicit confirmation) cleared test matches/memberships from prod right
      before the real rollout, keeping only admin players. Prod has been live
      with real usage since.
- [ ] Register bot commands with Telegram's own `/` menu —
      `telegram/commands:registerCommands` (`setMyCommands`) exists but
      hasn't been run against prod yet. Commands work fine typed manually
      either way; this is purely a discoverability nicety.
- [x] **Board split into per-match messages** — reverses the earlier "one
      combined board" decision (CLAUDE.md §4 now documents the new model).
      Each open match gets its own Telegram message
      (`telegram/matchBoard.ts` `syncMatchMessage`, tracked per-match in the
      new `matchBoardMessages` table, replacing chat-keyed `boardState`).
      Only ONE match is ever pinned at a time — pinning a match displaces
      whatever was pinned before it, via `getChat` (asks Telegram what's
      *actually* pinned, since our own bookkeeping drifted once already) +
      a single targeted `unpinChatMessage`, deliberately not the heavier
      `unpinAllChatMessages` (observed hitting Telegram's rate limit —
      429 with a 3s+ `retry_after` — under light testing, which is also why
      pinning is NOT automatic on publish: it's a manual, occasional admin
      action via the "Закрепить" checkbox, default **off**, so it can't spam
      notifications or trip that rate limit on its own). Pins fire **with
      sound**. An hourly cron (`unpinStartedMatches`) unpins a match once it
      starts, as a fallback for when nothing else took over the pin first.
      The admin repost button split into a per-match repost (match detail
      page) and a bulk "Отправить все игры" (matches list page, sequential
      — not fire-and-forget — so concurrent reposts can't race each other's
      delete-then-repost and produce duplicate messages; also the migration
      backfill for matches that existed under the old combined-board model).
- [x] **Bulk repost paced + lock-guarded for Telegram's per-group rate
      limit.** Researched Telegram's official Bot API FAQ: a **group is
      capped at ~20 new messages/minute**, well below the commonly-quoted
      30/sec global or 1/sec per-chat numbers — a real risk once a community
      runs enough matches to bulk-repost ~10 at once.
      `telegram/matchBoard.ts`'s `repostAllMatches` now (1) paces sends
      `GROUP_MESSAGE_PACING_MS` (3.2s) apart instead of firing a burst; (2)
      pins **once per bulk run** (soonest match only, if requested) instead
      of once per match — pinning is a separate, even stricter-limited
      Telegram operation, and N pins in one batch is what actually tripped
      429s during testing; (3) is guarded by a new `boardRepostLock` table
      (schema.ts) so a second click during an in-flight (now
      tens-of-seconds-long) bulk repost is refused with a toast rather than
      firing an overlapping run — which is exactly what produced duplicate
      match messages in the group before this lock existed. Pin-on-repost
      checkboxes (both per-match and bulk) already default to **off** as of
      the previous entry.

---

## v1.5 — promoted from backlog (small, high-value, not yet built)

- 💡 **Board summary auto-text** — `lib/matchMessage.ts`'s `renderMatchMessage`
  already has all the data the hand-typed «Напоминание, завтра…» message
  repeats. Ship a per-match "Сформировать текст" button in the dashboard that
  produces copy-pasteable text; admin still posts it manually (keeps the
  human touch, no new bot-permission surface).

## v2 backlog (do NOT build without an explicit decision)

- 💡 **Waitlist auto-offer with confirmation** (chosen direction for the
  "seats sit unfilled" problem — see `AUDIT.md` §5.1) — a freed roster seat
  DMs the first waitlisted player «Место освободилось — забрать?» with a
  claim button and a time window (shorter inside T-3h); unclaimed offers fall
  through to the next person, then fall back to today's behavior (board +
  admin). Builds on `extraSeatsOpened`/DM-button plumbing that already
  exists; needs one new concept, a pending offer with an expiry job (same
  scheduler pattern as reminders). Both prerequisites are now shipped:
  admin-removal notifying the waitlist, and attendance tracking (`noShow`) if
  offer order should ever weight reliability.
- 💡 **One-click weekly templates** — save match config, spawn this week's game
  with one click (auto-fill everything, confirm date). Later: auto-spawn cron.
- 💡 **Guest-bringing** — host + N guests, guest self-cancel independent of host,
  host-drop cascade rules, per-host cap.
- 💡 **Guest→authed merge** — repoint memberships, soft-delete guest row.
- 💡 **Verified levels + enforcement** — real player levels; warn/block on join
  mismatch (e.g. "это уровень 2, всё равно записаться?").
- 💡 **Court/venue table** — dropdown, default price per venue (replaces free text).
- 💡 **Per-level admins** — scope organizers to specific levels.
- 💡 **Telegram Mini App player view** — richer in-Telegram player experience.
  Not recommended until there's evidence the web view is a real friction point.
- 💡 **Multi-chat / dynamic multi-topic routing** — per-level threads, or
  routing across separate chats entirely, if the community grows. Distinct
  from the single fixed `TELEGRAM_TOPIC_ID` shipped in Milestone 10 (one
  hardcoded topic the board always posts to) — this item is about *choosing*
  a destination dynamically, not having one at all. Not recommended until
  growth actually demands it.
- 💡 **Quiet hours / per-user reminder lead time** — for opted-in players.
- 💡 **Automatic board burial repost** — see Milestone 6; only if the manual
  «Отправить в группу» button becomes a real burden at scale.

---

## Open questions (none blocking v1)

- Board display fork resolved: **full inline rosters** (revised from the
  original collapsed-rosters plan — see CLAUDE.md §4). The 4096-char guard in
  `lib/board.ts` is the safety net (strip mention-links, then truncate); no
  message-splitting.
