# CLAUDE.md

Authoritative guide for developers **and AI coding agents** working in this repo.
Read this fully before writing code. If a change contradicts a rule here, update
this file in the same PR — this document is the source of truth for *how* we build.

---

## 1. What this is

A Telegram bot + web dashboard for managing a padel community's weekly matches.

The community lives in one flat Telegram group chat ("игры"). Admins schedule
matches; players join from the group with one tap, or self-serve join from the
web dashboard (same mutation either way); when a match fills, further joins go
to a waitlist that **only admins** promote from. A web dashboard gives admins
full management and gives players their own self-serve view (join/leave,
match history, a shareable public profile).

**The product in one line:** the group chat holds the shared truth (a live
"board" message per open match), and private DMs are an optional, opt-in
personal reminder layer on top.

---

## 2. Tech stack

| Layer            | Choice                    | Notes                                                        |
| ---------------- | ------------------------- | ----------------------------------------------------------- |
| Web framework    | **Vite + TanStack Router** | `apps/admin` — the actual dashboard: admin management + player self-serve view (join/leave, history, public profile), client-only SPA (no SSR), better-auth cross-domain sessions straight to Convex. Replaced the original TanStack Start dashboard, which lived at `apps/web`. |
| Marketing site   | **Next.js (App Router)**  | `apps/web` — repurposed from the retired TanStack Start dashboard into a public marketing site (home / about / community / tournaments). No auth. One narrow unauthenticated Convex read (`matches.listPublicUpcoming`) powers a homepage preview; otherwise not on the write path below. |
| Backend / DB     | **Convex**                | Reactive DB, mutations/queries, `httpAction` webhook, cron + scheduler. No separate server. |
| Styling          | **Tailwind CSS**          | Utility-first. Keep design tokens centralized.              |
| Messaging        | **Telegram Bot API**      | Webhook-driven (not long polling).                          |
| Auth             | **Telegram Mini App + deep-link fallback** | Maps a web user to their `telegramUserId`. No new passwords. Opened as a registered Mini App → instant sign-in via `initData`; opened in a regular browser → a one-time code confirmed through the bot's own webhook. Replaced the original Telegram Login Widget (BotFather domain registration, unreliable popup/session behavior). |
| Language (UI)    | **Russian**               | All user-facing strings are Russian. Code/comments English. |

There is **no separate backend server**. The Telegram webhook is a Convex
`httpAction`; reminders, the manual repost actions, and the automatic
unpin-on-start cleanup are Convex scheduled functions / crons.

---

## 3. Golden rules (do not violate)

1. **One source of truth.** Every state change — whether it originates from a
   Telegram button tap *or* the web dashboard — MUST go through the **same Convex
   mutation**. Never write to the DB from two code paths. This is what keeps the
   group board, the DMs, and the dashboard consistent. Convex reactivity means
   the dashboard updates live with zero polling.

2. **Board = shared state. DMs = personal layer.** Each match's group board
   message works for 100% of members with no onboarding. DMs are additive and
   **opt-in only**.
   Nothing in the core flow (join/leave/see matches) may require a DM.

3. **All timestamps are UTC epoch millis in the DB.** Convert to Tashkent
   (UTC+5) only at the display edge (board text, dashboard, DMs). Never store
   local time.

4. **All user-facing text is Russian.** No hardcoded English in bot messages or
   the dashboard UI. Keep strings in one place (`convex/lib/strings.ts` /
   `src/lib/strings.ts`) so v2 localization is a config change, not a hunt.

5. **Soft delete, never hard delete** (v1). Matches and memberships carry
   `isDeleted`. "Cancel a match" = set `isDeleted: true`. Users see no status;
   the row survives so a mistaken cancel is recoverable.

6. **Guests are first-class player rows** (`type: "guest"`, `telegramUserId:
   null`). Never model a guest as a string on a membership. This keeps the future
   guest→authed merge to "repoint memberships, soft-delete the guest."

7. **Key on `telegramUserId`, never on username.** Usernames change and some
   users have none.

---

## 4. Architecture

```
Telegram group ("игры")                     Web (apps/admin)
        │                                          │
   button taps / commands                    admin actions / reads
        │                                          │
        └──────────────┐              ┌────────────┘
                       ▼              ▼
                  Convex mutations (THE single write path)
                       │              │
             ┌─────────┴───┐    ┌─────┴───────────┐
             ▼             ▼    ▼                 ▼
         matches       memberships           players / match messages
             │                                     │
             ├── scheduler: reminders (T-3h/T-30m) │
             └── cron: unpin started matches, prune dedup table
                       │
                       ▼
             Telegram Bot API (edit match message, send DMs)
```

- **Webhook**: `convex/http.ts` exposes an `httpAction` at `/telegram`. It
  verifies Telegram's `secret_token` header, dedupes on `update_id`, then routes:
  `/start` (DM opt-in), `callback_query` (Join / waitlist taps), admin commands.
- **Match messages**: each open match gets its own live Telegram message
  (`matchBoardMessages`, one row per match). Taps edit that match's message
  in place. An admin can force a fresh repost (delete + resend to the
  bottom) of one match from its detail page («Отправить в группу»,
  `matches.repostMatchToGroup`), or bulk-repost every open match from the
  matches list («Отправить все игры», `matches.repostAllToGroup`). The bulk
  path is **paced and lock-guarded** — see below.
- **Reminders**: on match create/reschedule we schedule T-3h / T-30m jobs and
  store their `jobId` in `matchReminders`. On reschedule we **cancel** the old
  jobs before scheduling new ones.

### The board model — one message per match

- Each open match is its **own** Telegram message (not one combined board).
  This used to be a single message listing every open match; that broke down
  as the community grew and multiple matches were live in the same week —
  a wall of text with no way to notify about just one match. Splitting into
  separate messages (rather than one growing indefinitely) is what actually
  fixes the "hard to manage several matches" problem.
- Each match's message shows header, live count, and **full inline
  rosters/waitlists** (kept from the earlier combined-board design — the
  roster is the information people actually open a match's message for).
  The 4096-char guard in `lib/matchMessage.ts`'s `renderMatchMessage` is the
  safety net per message: it first retries without Telegram mention-links
  (shorter), then hard-truncates if still over.
- **Pinning is manual and rare, not automatic.** Publishing a match does
  **not** pin it — pinning only ever happens when an admin explicitly checks
  the "Закрепить" checkbox on a repost («Отправить в группу» / «Отправить
  все игры», default **off**). Two reasons, both learned the hard way while
  building this: (1) a pin event, unlike a plain message edit, always fires
  a notification (with sound — `disable_notification: false`, since a
  pinned match is meant to actively grab attention), so auto-pinning every
  publish would spam the group; (2) Telegram throttles pin/unpin actions far
  more aggressively than regular messages — `unpinAllChatMessages` was
  observed hitting 429s with a 3s+ `retry_after` under light testing, and
  since pinning was wired to fire on every publish, admins publishing a
  couple of matches in a row could trigger it. Making pinning a deliberate,
  occasional admin action (rather than automatic on every publish) sidesteps
  both problems at the source.
- **Exactly one match pinned at a time.** Telegram supports multiple
  simultaneous pins, but this app deliberately doesn't use that — pinning a
  match's message **displaces** whatever was pinned before it, mirroring the
  old single-board model where there was only ever one live message to
  begin with. `telegram/matchBoard.ts`'s `syncMatchMessage` does this by
  calling `getChat` to ask Telegram what's *actually* currently pinned
  (never trust the app's own `matchBoardMessages.pinned` bookkeeping for
  this — it can drift, and once did) and issuing a single targeted
  `unpinChatMessage` for just that message, **not** the heavy
  `unpinAllChatMessages` (see above — that's the rate-limit-prone call).
  An hourly cron (`telegram.matchBoard.unpinStartedMatches`) unpins a
  match's message once its `startsAt` has passed, as a fallback for when
  nothing else took over the pin before then — it never deletes the
  message, only unpins it. Pinning only ever fires on an explicit
  force-repost — never on a silent in-place edit from a join/leave tap — so
  it stays a deliberate action, not something that can fire unattended.
  Cancelling a match deletes its message outright (Telegram drops a deleted
  message from the pinned list automatically).
- Each match's message can optionally post into a specific forum topic
  (`TELEGRAM_TOPIC_ID` env var, e.g. the group's "Игры" thread) instead of
  the chat's default thread. Posting into a *closed* topic fails
  (`TOPIC_CLOSED`) unless the bot specifically has the granular **"Manage
  Topics"** admin right — see §6.
- **Bulk repost is paced and lock-guarded, per Telegram's own rate limits.**
  Per Telegram's Bot API FAQ, a **group specifically is capped at ~20 new
  messages/minute** — much stricter than the 30/sec global or 1/sec per-chat
  numbers usually quoted, and easy to hit blind if a community runs several
  matches at once. `matches.repostAllToGroup` → `telegram/matchBoard.ts`'s
  `repostAllMatches` therefore: (1) sends one match at a time with a
  `GROUP_MESSAGE_PACING_MS` (3.2s) delay between them, comfortably under
  20/min; (2) pins **at most once per bulk run** (just the soonest upcoming
  match, if `pin` was requested) rather than once per match — pinning is a
  separate, even stricter-limited Telegram operation, and pinning N times in
  a batch is what actually triggered 429s during testing; (3) is guarded by
  `boardRepostLock` (schema.ts) so a second click while a (now
  tens-of-seconds-long) bulk repost is still running is refused instead of
  firing an overlapping run — that overlap is exactly what produced
  duplicate messages before this lock existed (see TODO.md's changelog for
  the incident).

---

## 5. Data model

See `packages/backend/convex/schema.ts` for the authoritative definition.
Nine tables:

- **players** — authed users AND guests, unified. `type`, `telegramUserId`
  (null for guests), name fields, admin-assigned `level` (free text, not
  enforced in v1), `isAdmin`, `wantsDms`, `isDeleted`. Every authed player has
  a shareable **public profile** at `/p/:playerId` (no auth required) —
  `players.getPublicProfile` intentionally returns only name, level, and the
  activity calendar (derived from attendance, see below). No username, no
  contact info, nothing else — locked-in privacy decision, not a placeholder.
- **matches** — `startsAt`, `durationMin` (display only — reminders are
  computed purely from `startsAt`), `description`, `level` (free-text range
  e.g. "1-2"), `court` (free text + dashboard autocomplete), `format`
  (Американо/Мексикано/King…), `maxMembers`, `pricePerPerson`, `lundaUrl`,
  `isPublished` (draft until an admin publishes it — drafts are admin-only
  everywhere: board, bot commands, web), `createdBy`, `isDeleted`. **No
  status field beyond `isPublished`** — derive open/full/past from `startsAt`
  + count.
- **memberships** — `matchId` + `playerId`, `role` (roster|waitlist), `joinedAt`
  ("trigger time"), `addedBy` (self | {admin}), `isDeleted`, `removedBy`
  (self | {admin} — who dropped it, distinct from who added it).
  - `noShow` (optional bool) — **real attendance tracking**, shipped: everyone
    defaults to "attended" (undefined/false); an admin explicitly flags a
    no-show after the fact on a past match's roster. Never an opt-in
    check-in flow. Drives the no-show list on the admin player-profile page
    and the "attended" activity calendar.
  - `paid` (optional bool) — manual payment tracking, admin-toggled, roster
    only. Redacted **server-side** (not just hidden in the UI) from any
    query response for anyone but an admin or the membership's own player —
    the raw wire payload is otherwise inspectable regardless of what the
    frontend renders.
  - `matchStartsAt` (optional number) — denormalized copy of the parent
    match's `startsAt`, kept in sync at join/resurrect/guest-add and on
    reschedule. Exists purely so a player's match history can be
    cursor-paginated sorted by game date — Convex can't paginate a
    memberships→matches join ordered by a field that only lives on the
    joined table.
- **matchBoardMessages** — one per match with a live Telegram message:
  `matchId`, `chatId`, `messageId`, `pinned` (tracked so the hourly "unpin
  started matches" cron knows what to clean up once a match's `startsAt` has
  passed).
- **boardRepostLock** — single row (`inProgress`, `startedAt`) guarding
  `matches.repostAllToGroup`'s paced bulk repost against a second
  overlapping run (see §4's board model — that overlap once produced
  duplicate messages).
- **matchReminders** — scheduler `jobId`s per match, so reschedule can cancel.
  A lead skipped at scheduling time (already past when it would've been
  scheduled) gets a `jobId`-less row with `firedAt` set immediately, so the
  dead-man's-switch can tell "skipped on purpose" from "lost".
- **processedUpdates** — `update_id` dedup; pruned by cron.
- **webLoginRequests** — deep-link login one-time codes; pruned by cron.
- **communitySettings** — single row (same "small enough for a full scan" read
  pattern as `players`): `paymentInfo` free text, `updatedAt`, `updatedBy`.
  Backs the `/pay` bot command and the dashboard's payment-info settings
  field. Any authed player can read it (not admin-only) — they're the ones
  who need to know where to send money.

---

## 6. Telegram gotchas checklist (production-critical)

Any code touching the Bot API must respect these. Most bugs here fail *silently*.

- [ ] **`answerCallbackQuery` within ~15s** of a tap, or the user sees a spinner
      forever. Ack first, then do work.
- [ ] **Swallow "message is not modified"** — editing a match's message with
      identical text throws; catch and ignore.
- [ ] **Coalesce edits.** On rapid taps, recompute-then-edit once; don't queue an
      edit per tap (hits flood limits).
- [ ] **Dedup on `update_id`.** Telegram retries webhooks on any non-200 →
      duplicate updates. Check `processedUpdates` before acting.
- [ ] **Verify `secret_token` header** on the webhook so only Telegram can hit it.
- [ ] **Bot needs admin rights** in the group to pin/delete. It can only delete
      messages < 48h old. Degrade gracefully if it lacks rights or the target is
      stale — never throw into the user's face.
- [ ] **Concurrency on the last seat.** Two taps for the final slot → rely on
      Convex serializable mutations: first commit wins, second goes to waitlist.
      Do the capacity check *inside* the mutation.
- [ ] **DM 403 handling.** A user who never `/start`ed, or who blocked the bot,
      returns 403. Skip silently; if they were `wantsDms: true`, flip it false.
- [ ] **Rate limits.** ~30 msg/s global, stricter per-chat. A reminder sweep over
      a full roster MUST go through the throttled/queued sender, not a bare loop.
- [ ] **4096-char message limit.** Each match's message must stay under it.
      Guard the renderer.
- [ ] **Forum topics are granular admin rights, not a blanket "is admin"
      flag.** A bot can be a full chat admin and still get `TOPIC_CLOSED`
      posting into a closed topic — posting/pinning there specifically needs
      the **"Manage Topics"** right toggled on when the bot was promoted, a
      separate checkbox from general admin status. Discovered the hard way
      wiring `TELEGRAM_TOPIC_ID`; don't assume "bot is admin" covers it.

---

## 7. Conventions

### Convex
- Mutations are the only write path (see Golden Rule 1). Queries are read-only.
- Prefer an index (see `schema.ts`) over a full-scan whenever a query filters
  on a specific field. A bounded `.take(N)`/`.collect()` full scan is
  acceptable for genuinely small, community-scale tables (e.g. `players`,
  capped around 500) where the query needs most/all rows anyway and an index
  wouldn't actually narrow the scan — don't add an index nothing will use.
  Bounded reads are also fine for anything backing a **stat/count display**
  (an approximation is an acceptable failure mode for a number label). Use
  real **cursor pagination** (`paginationOptsValidator` + `.paginate()`,
  `usePaginatedQuery` + a "Показать ещё" button on the frontend) for anything
  that's an actual **rendered, scrollable list with no natural upper bound**
  — a bounded take() there doesn't error, it silently starts dropping the
  oldest rows once a table outgrows the cap, which is worse than an error.
  If the list needs to be sorted by a field that only lives on a *joined*
  table (e.g. player history sorted by match date, not membership row order),
  denormalize a copy of that field onto the table being paginated and index
  on it — see `memberships.matchStartsAt`.
- Side effects that talk to Telegram go in **actions**, not mutations. Pattern:
  mutation updates DB → schedules an action → action calls the Bot API. (Mutations
  must stay deterministic and side-effect-free.)
- Store scheduler `jobId`s you may need to cancel (`matchReminders`).

### Web (apps/admin)
- Admin routes are gated on `isAdmin`; player routes are self-serve (join,
  leave, own history) but write nothing an admin didn't already expose —
  same shared mutations either way (Golden Rule 1).
- Read live Convex data; don't cache-and-poll — Convex is reactive.
- Court field: free-text input with autocomplete sourced from historical `court`
  values. No venue table in v1.
- Navigation is a collapsible sidebar (`AppSidebar`/`SidebarProvider` in
  `packages/ui`), not a floating nav bar.

### Strings
- One Russian strings module for the bot (`convex/lib/strings.ts`) — enforced.
  `apps/admin` still has **no** equivalent strings module; its Russian copy is
  inline throughout. Known gap, not yet scheduled — see TODO.md Milestone 8.

### Time
- Helpers `toTashkent(ms)` / `fromTashkent(...)` at the edges only.

---

## 8. Environments & secrets

- **Two bots**: a **staging** bot + test group, and the **prod** bot + live
  group. Never debug against the live community.
- Env (Convex dashboard, never committed):
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_SECRET_TOKEN` (webhook header check)
  - `TELEGRAM_CHAT_ID` (the игры group)
  - `TELEGRAM_TOPIC_ID` (optional — forum topic the board posts/pins into;
    unset means the chat's default thread, unchanged behavior)
  - `TELEGRAM_GROUP_USERNAME` (optional — public @username of the group,
    e.g. `one_padel` for prod; used to build the `t.me/...` link the `/matches`
    command sends. Deliberately per-environment, not hardcoded — set it on
    prod, leave it unset on staging so testers get a link-less nudge instead
    of a link to the real community)
  - `SEED_ADMIN_TELEGRAM_ID` (bootstrap the first admin)
- **Bootstrapping admins:** the first admin is seeded by Telegram id; after that,
  admins grant admin from the dashboard.

---

## 9. Observability

- A dead webhook fails silently → nobody gets reminders and you find out on game
  day. Log every inbound update and every Bot API failure.
- **Dead-man's-switch** cron: if no reminder has fired in an expected window,
  alert. Don't rely on "it worked last week."

---

## 10. Scope boundaries

**v1 (shipped):** per-match live board message (optionally topic-pinned, with
auto-unpin once a match starts), admin-created
matches with draft/publish gating, auto-create players on first Join,
admin-added guests, admin-only waitlist promotion, "extra seats" notify (board
+ DM waitlist), free-text level label, player self-serve web view (join/leave
+ own history), shareable public player profile (name/level/activity only),
attendance tracking (default-attended, admin flags no-shows), manual payment
tracking with server-side redaction, global admins, Lunda link per match,
Russian, opt-in DM reminders, soft deletes, bot commands (`/matches`, `/my`,
`/pay`).

**v2 (reserved, do NOT build without a decision):** one-click weekly templates,
guest-bringing (host + N guests) with cascade rules, court/venue table,
verified levels + join-time enforcement, guest→authed merge, per-level admins,
board summary auto-text, Telegram Mini App player view, true multi-chat /
dynamic multi-topic routing (distinct from the single fixed `TELEGRAM_TOPIC_ID`
already shipped — that's one hardcoded topic, not per-level/dynamic threads).

See `TODO.md` for the ordered build plan.

---

## 11. Definition of done (per feature)

- Write path goes through a shared mutation (both surfaces).
- Russian strings, UTC storage / Tashkent display.
- Relevant Telegram gotchas from §6 handled.
- Tested against the **staging** bot + test group first.
- No hard deletes; indexes used for all filtered queries.
