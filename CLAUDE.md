# CLAUDE.md

Authoritative guide for developers **and AI coding agents** working in this repo.
Read this fully before writing code. If a change contradicts a rule here, update
this file in the same PR — this document is the source of truth for *how* we build.

---

## 1. What this is

A Telegram bot + web dashboard for managing a padel community's weekly matches.

The community lives in one flat Telegram group chat ("игры"). Admins schedule
matches; players join from the group with one tap; when a match fills, further
joins go to a waitlist that **only admins** promote from. A web dashboard gives
admins full management and gives players a read-only view.

**The product in one line:** the group chat holds the shared truth (one live
"board" message), and private DMs are an optional, opt-in personal reminder layer
on top.

---

## 2. Tech stack

| Layer            | Choice                    | Notes                                                        |
| ---------------- | ------------------------- | ----------------------------------------------------------- |
| Web framework    | **TanStack Start**        | Admin dashboard + read-only player view.                    |
| Backend / DB     | **Convex**                | Reactive DB, mutations/queries, `httpAction` webhook, cron + scheduler. No separate server. |
| Styling          | **Tailwind CSS**          | Utility-first. Keep design tokens centralized.              |
| Messaging        | **Telegram Bot API**      | Webhook-driven (not long polling).                          |
| Auth             | **Telegram Login Widget** | Maps a web user to their `telegramUserId`. No new passwords. |
| Language (UI)    | **Russian**               | All user-facing strings are Russian. Code/comments English. |

There is **no separate backend server**. The Telegram webhook is a Convex
`httpAction`; reminders and the "repost buried board" logic are Convex scheduled
functions / crons.

---

## 3. Golden rules (do not violate)

1. **One source of truth.** Every state change — whether it originates from a
   Telegram button tap *or* the web dashboard — MUST go through the **same Convex
   mutation**. Never write to the DB from two code paths. This is what keeps the
   group board, the DMs, and the dashboard consistent. Convex reactivity means
   the dashboard updates live with zero polling.

2. **Board = shared state. DMs = personal layer.** The group board message works
   for 100% of members with no onboarding. DMs are additive and **opt-in only**.
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
Telegram group ("игры")                     Web (TanStack Start)
        │                                          │
   button taps / commands                    admin actions / reads
        │                                          │
        └──────────────┐              ┌────────────┘
                       ▼              ▼
                  Convex mutations (THE single write path)
                       │              │
             ┌─────────┴───┐    ┌─────┴───────────┐
             ▼             ▼    ▼                 ▼
         matches       memberships           players / board
             │                                     │
             ├── scheduler: reminders (T-3h/T-30m) │
             └── cron: repost buried board, prune dedup table
                       │
                       ▼
             Telegram Bot API (edit board, send DMs)
```

- **Webhook**: `convex/http.ts` exposes an `httpAction` at `/telegram`. It
  verifies Telegram's `secret_token` header, dedupes on `update_id`, then routes:
  `/start` (DM opt-in), `callback_query` (Join / waitlist taps), admin commands.
- **Board**: a single live message per chat (`boardState`). Taps edit it in
  place. A burial counter triggers delete-and-repost-to-bottom.
- **Reminders**: on match create/reschedule we schedule T-3h / T-30m jobs and
  store their `jobId` in `matchReminders`. On reschedule we **cancel** the old
  jobs before scheduling new ones.

### The board model (locked decision)

- **One** live message lists all open matches, **sorted by `startsAt`** (soonest
  first).
- Each row shows header + live count + a Join/waitlist button. **Full rosters are
  collapsed** — one tap (or the web view) shows them. Reason: real rosters run
  11+ names across several matches and Telegram caps a message at **4096 chars**;
  inline rosters overflow into multiple messages and reintroduce burial.
- When chatter buries the board (counter past threshold), delete the old message
  and repost at the bottom. Never spam multiple cards.

---

## 5. Data model

See `packages/backend/convex/schema.ts` for the authoritative definition. Six
tables:

- **players** — authed users AND guests, unified. `type`, `telegramUserId`
  (null for guests), name fields, admin-assigned `level` (free text, not
  enforced in v1), `isAdmin`, `wantsDms`, `isDeleted`.
- **matches** — `startsAt`, `durationMin`, `description`, `level` (free-text
  range e.g. "1-2"), `court` (free text + dashboard autocomplete), `format`
  (Американо/Мексикано/King…), `maxMembers`, `pricePerPerson`, `lundaUrl`,
  `createdBy`, `isDeleted`. **No status field** — derive open/full/past from
  `startsAt` + count.
- **memberships** — `matchId` + `playerId`, `role` (roster|waitlist), `joinedAt`
  ("trigger time"), `addedBy` (self | {admin}), `isDeleted`.
- **boardState** — one per chat: `messageId`, `messagesSincePost`, `lastPostedAt`.
- **matchReminders** — scheduler `jobId`s per match, so reschedule can cancel.
- **processedUpdates** — `update_id` dedup; pruned by cron.

---

## 6. Telegram gotchas checklist (production-critical)

Any code touching the Bot API must respect these. Most bugs here fail *silently*.

- [ ] **`answerCallbackQuery` within ~15s** of a tap, or the user sees a spinner
      forever. Ack first, then do work.
- [ ] **Swallow "message is not modified"** — editing the board with identical
      text throws; catch and ignore.
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
- [ ] **4096-char message limit.** The board must stay under it (collapsed
      rosters). Guard the renderer.

---

## 7. Conventions

### Convex
- Mutations are the only write path (see Golden Rule 1). Queries are read-only.
- Every query that filters MUST use an index (see `schema.ts`); never full-scan.
- Side effects that talk to Telegram go in **actions**, not mutations. Pattern:
  mutation updates DB → schedules an action → action calls the Bot API. (Mutations
  must stay deterministic and side-effect-free.)
- Store scheduler `jobId`s you may need to cancel (`matchReminders`).

### Web (TanStack Start)
- Admin routes are gated on `isAdmin`; player routes are read-only.
- Read live Convex data; don't cache-and-poll — Convex is reactive.
- Court field: free-text input with autocomplete sourced from historical `court`
  values. No venue table in v1.

### Strings
- One Russian strings module. Interpolate values; don't concatenate sentences
  (grammar/word-order will bite in v2 localization).

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

**v1 (build now):** single live board, admin-created matches, auto-create players
on first Join, admin-added guests, admin-only waitlist promotion, "extra seats"
notify (board + DM waitlist), free-text level label, read-only player web view,
global admins, Lunda link per match, Russian, opt-in DM reminders, soft deletes.

**v2 (reserved, do NOT build without a decision):** one-click weekly templates,
guest-bringing (host + N guests) with cascade rules, payment tracking, court/venue
table, verified levels + join-time enforcement, attendance/no-show reliability,
guest→authed merge, per-level admins, board summary auto-text, Telegram Mini App
player view, multi-chat / forum topics.

See `TODO.md` for the ordered build plan.

---

## 11. Definition of done (per feature)

- Write path goes through a shared mutation (both surfaces).
- Russian strings, UTC storage / Tashkent display.
- Relevant Telegram gotchas from §6 handled.
- Tested against the **staging** bot + test group first.
- No hard deletes; indexes used for all filtered queries.
