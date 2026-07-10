# Project audit — backend, admin panel, docs

Full audit of the monorepo as of 2026-07-07 (branch `main`, `a673011`): the Convex
backend (`packages/backend`), the new admin panel (`apps/admin`), the retiring
`apps/web`, shared packages, and CLAUDE.md / TODO.md.

**Status (2026-07-10):** all recommendations below (except the strings-module
centralization, deliberately deferred — see §4.2) have been applied,
typechecked, validated against the dev Convex deployment, and deployed to
prod (backend) and Vercel production (admin app). The three items that
changed what a mutation accepts (§2.4, §2.6, §2.8) were held for explicit
confirmation before implementing, per instruction not to change business
logic without asking — two were approved and shipped, one declined. Status
is marked inline throughout.

Calibration used throughout: ~100–200 members, 3–7 matches/week, single
community today with a possible multi-community future, no fixed launch date
(findings ranked by impact, not urgency).

---

## 1. Executive summary

The core is in good shape. The backend honors its own golden rules almost
everywhere that matters: every domain write goes through a shared mutation, all
admin-gated functions really do check `isAdmin` server-side via
`requireAdminPlayer`, timestamps are UTC-only with Tashkent conversion at the
edges, deletes are soft, Telegram side effects live in actions, and the hard
Telegram gotchas (secret token, update dedup, 429 backoff, 403→`wantsDms`,
4096-char guard, last-seat concurrency) are all handled. The admin app covers
the full v1 feature surface with live data — no mocks, no dead buttons.

The risk is concentrated in three places:

1. **Silent-failure paths in the bot plumbing** — the dead-man's-switch cries
   wolf on every short-notice match (§2.1), and a webhook handler error
   permanently swallows the user's tap (§2.2). These are exactly the "fails
   silently, discovered on game day" failures CLAUDE.md §9 warns about.
2. **Seat-lifecycle inconsistencies** — an admin removal doesn't tell the
   waitlist a seat freed (§2.3), and capacity edits can silently corrupt the
   board math (§2.4).
3. **Docs that no longer describe the product** — CLAUDE.md's "locked" board
   model (collapsed rosters) is not what ships (inline rosters, deliberate
   change), the tech-stack table describes the retired architecture, and the
   burial feature exists only as dead schema fields (§4, §6).

Top five actions, in order: fix the dead-man's-switch false positives (2.1),
fix webhook dedup ordering (2.2), notify the waitlist on admin removal (2.3),
guard `maxMembers` decreases (2.4), and bring CLAUDE.md/TODO.md back in line
with reality (§6).

---

## 2. Bugs & edge cases (ranked by impact)

2.3, 2.4, 2.6, and 2.8 all change what a mutation accepts or does, not just
internal correctness. 2.3 turned out to already be fixed by later work
(`dropMembership` unification). 2.4 and 2.6 were confirmed and shipped; 2.8
was reviewed and explicitly declined — kept as-is. Everything else in this
section is applied and live.

### 2.1 Dead-man's-switch false positives — your only alarm channel trains you to ignore it ✅ applied

`scheduleReminders` deliberately skips any reminder lead already in the past
(`packages/backend/convex/matches.ts:60` — a match created 2h out gets no
T-3h row). But `listOverdueUnfired` treats a *missing* row as a silent failure
(`packages/backend/convex/matchReminders.ts:59`: `if (!row || ...)`). Result:
every match created inside its 3h/30m window triggers the hourly
`DEAD MAN'S SWITCH` error, forever, until the match starts. At 3–7 matches a
week, short-notice games are routine — the alert channel becomes noise, and
the day a reminder genuinely fails silently, nobody will notice. This defeats
the entire purpose of CLAUDE.md §9.

**Fix sketch:** insert a row with `firedAt: Date.now()` (or a dedicated
`skipped` marker) for leads that are skipped at scheduling time, so "never
scheduled on purpose" is distinguishable from "scheduled and lost". Cheaper
alternative: in `listOverdueUnfired`, ignore leads whose `dueAt` predates the
match's `createdAt`.

### 2.2 Webhook dedup ordering permanently drops failed updates ✅ applied

`recordIfNew` marks the `update_id` processed **before** the handlers run
(`packages/backend/convex/telegram/webhook.ts:32-48`), and the handler calls
are awaited inside the same httpAction. If `handleMessage` /
`handleCallbackQuery` throws (transient Convex error, Telegram API hiccup
inside the action), the request returns non-200, Telegram retries — and the
retry is deduped away with a 200. The user's Join tap is gone with no record
except a log line. Telegram's retry mechanism, which exists precisely to
survive this, is neutralized.

**Fix sketch:** record the update as processed only after handlers complete
(check-then-record-after-success), or wrap handler dispatch so a failure
deletes the dedup row before rethrowing. The double-processing risk this
reintroduces is already mitigated by the idempotent design of `joinMatch`
(re-tap returns `alreadyJoined`).

### 2.3 Admin `removeMember` frees a seat silently; self-drop doesn't ✅ already fixed (unrelated later commit)

*Update:* `memberships.ts` now routes both self-drop and admin removal
through a shared `dropMembership` helper that notifies the waitlist
regardless of who triggered the departure — this was fixed by the
self-serve-leave/admin-cancellation-tracking work, independent of this audit.
Original finding kept below for context.

Self-drop notifies the waitlist when a roster player leaves
(`packages/backend/convex/memberships.ts:106-110` →
`extraSeatsOpened`), but admin removal of a roster player
(`memberships.ts:119-130`) only DMs the removed player. The freed seat sits
invisible to the waitlist until someone re-reads the board. At ~150 members
with active waitlists this is a real fill-rate leak, and it's inconsistent:
the same event (roster seat freed) produces different downstream behavior
depending on who triggered it.

**Fix sketch:** in `removeMember`, when the removed membership's role was
`roster`, schedule `extraSeatsOpened` exactly as `dropMatch` does.

### 2.4 `editMatch` allows `maxMembers` below current roster count ✅ applied (confirmed)

No guard in `matches.ts:163-169` — lowering `maxMembers` from 6 to 4 with 6
on the roster demotes nobody and produces `spotsLeft = -2`
(`packages/backend/convex/lib/board.ts:84`), a board reading `👥 6/4 ·
заполнено`, and a match that behaves inconsistently everywhere counts are
compared. Nothing recovers this state except editing the number back.

**Fix sketch (v1-cheap):** reject a decrease below the live roster count in
the mutation with a Russian error the dashboard can toast ("Сначала уберите
игроков из состава"). Auto-demotion to waitlist is a policy decision — don't
build it without deciding *who* gets demoted (last-joined?).

### 2.5 Reminder-job cancellation capped at `.take(10)` ✅ applied

Reschedule and cancel both fetch at most 10 `matchReminders` rows
(`matches.ts:179`, `matches.ts:233`; also `markFired` at
`matchReminders.ts:23`). Fired rows persist up to 7 days (`pruneFired`), and
each reschedule adds up to 2 rows. A match rescheduled 5+ times within a week
can push a not-yet-fired row past the first 10 — its stale job escapes
cancellation and pings the roster about the *old* time. Low probability,
maximally confusing when it hits (wrong-time reminders destroy trust in the
reminder layer).

**Fix sketch:** use `.collect()` — the per-match row count is tiny; the cap
protects nothing here.

### 2.6 `joinMatch` ignores `isPublished` ✅ applied (confirmed)

`memberships.ts:21-24` checks only `isDeleted`. An unpublished match with a
stale button (board not yet re-synced, or a forged `callback_data`) accepts
joins into a draft. Today the window is small because `unpublishMatch`
triggers a board sync, but the mutation is the single write path and should
enforce its own invariant rather than trusting the board to have caught up.

**Fix sketch:** treat `!match.isPublished` like `match_gone` (same "игра
опустилась ниже" style answer, or a dedicated "игра снята с доски" string).

### 2.7 `webLoginRequests`: unbounded growth + unauthenticated spam vector ✅ prune cron applied (rate limiting still deferred, as recommended)

`webLogin.create` (`packages/backend/convex/webLogin.ts:20`) is a public,
argument-less, unauthenticated mutation — every call inserts a row. There is
no prune cron (unlike `processedUpdates`), so expired/consumed rows accumulate
forever, and anyone who finds the Convex URL can insert rows at will. Not a
security hole (codes are 128-bit random; `getStatus` leaks nothing without a
valid code), but it's the one table with no garbage collection and the one
public write with no friction.

**Fix sketch:** add a prune to `crons.ts` (delete rows older than ~1h); rate
limiting can wait until there's evidence of abuse.

### 2.8 No last-admin guard on `setIsAdmin` ❌ declined — kept as-is by explicit choice

`players.ts:195-201` lets any admin demote anyone, including themselves,
including the last admin. One mistap in the players table and nobody can
manage matches, promote, or re-grant admin — recovery requires the Convex
dashboard. Same class of risk: `softDeletePlayer` on yourself.

**Fix sketch:** in `setIsAdmin`, when demoting, count remaining live admins
and reject if it would hit zero (and consider rejecting self-demotion
outright). Same check in `softDeletePlayer` for admin rows.

### 2.9 Minor / accepted-risk items

- **Board sync fan-out:** every join/edit/drop schedules its own `syncBoard`;
  concurrent runs converge (each recomputes from live state) but race on
  `editMessageText` and waste API calls. Fine at this scale; a debounce
  (skip if another sync is queued) is the eventual fix. (Known, documented in
  TODO.md M5.)
- **`sendReminder` fires for matches rescheduled into the past** — only
  `isDeleted` is checked (`telegram/reminders.ts:18`). Edge of an edge; a
  `match.startsAt > Date.now()` check would close it.
- **Add-guest dialog breaks silently on error** — see §4.3; the backend
  mutation is fine, the dialog just doesn't catch.
- **Rate-limit posture:** `callTelegramApi` handles 429 with `retry_after`
  (3 attempts) and reminder sweeps are sequential — adequate for ~150
  opted-in DMs. The "proactive queued sender" from TODO M2 remains fairly
  deferred; revisit only if sweeps start tripping 429s in logs.

---

## 3. Unused / dead code inventory

### 3.1 Backend (`packages/backend/convex`)

| Item | Location | Status |
| --- | --- | --- |
| `matches.unpublishMatch` | `matches.ts:125` | ✅ **deleted** (zero callers, no UI for it). |
| `matches.listAllForCalendar` | `matches.ts:512` | Left untouched, as decided — paired with the orphaned charts in §3.2. |
| `auth.getCurrentUser` | `auth.ts:73` | ✅ **deleted** (dead, frontends use the component-generated `getAuthUser`). |
| `players.reminderLeadMin` field | `schema.ts` | ✅ **removed** from schema (confirmed zero references anywhere before removal). |
| `matches.durationMin` | schema + `matches.ts` | ✅ **comment fixed** — field kept (display value), no longer claims it drives reminders. |
| `boardState.messagesSincePost`, `lastPostedAt` | `schema.ts`, `boardState.ts` | ✅ **stopped writing**, marked `v.optional()` + deprecated in schema. Not hard-removed: Convex validates stored documents against the schema, and the live `boardState` row still has these set — a full removal needs a data migration first, which felt like more risk than the cleanup was worth. Functionally dead either way. |
| Indexes `players.by_type`, `players.by_isAdmin`, `matches.by_startsAt` | `schema.ts` | ✅ **deleted** (confirmed zero `.withIndex()` callers). `players.listAll` genuinely needs all rows regardless, so there was no query to "fix" — CLAUDE.md §7's index rule was reworded to allow bounded scans on small tables instead of pretending otherwise. |

Intentionally *not* dead: `telegram/setWebhook.setWebhook` (manual-run
operational helper).

### 3.2 Admin app (`apps/admin`)

- **`src/components/match-calendar-heatmap.tsx` and
  `src/components/match-trend-charts.tsx`** — fully built, mounted nowhere,
  and **untracked in git** (`??`). Left untouched per decision, but two
  warnings: (a) they are one `git clean` away from vanishing — commit them to
  a branch if they represent real work; (b) they drag `recharts` +
  `@J-schedule/ui/chart` into the dependency graph while shipping nothing.
  The heatmap also has a Russian pluralization bug (`matchCount === 1 ?
  "игра" : "игры"` — 5+ needs "игр").
- `recharts` as a **direct** dep of `apps/admin/package.json` — **kept**, on
  re-check: `match-trend-charts.tsx` (the preserved-per-decision orphan)
  imports directly from `"recharts"`, not just through `@J-schedule/ui`'s
  wrapper. Removing the dep would break that file. Left as-is.
- `src/assets/react.svg` (unreferenced — turned out to be 4.1KB, not 0 bytes
  as originally noted, doesn't change the outcome) — ✅ **deleted**. The
  default Vite favicon (`index.html:5` → `/vite.svg`) is unchanged — no
  actual icon asset to replace it with yet.

### 3.3 Monorepo

- **Retiring `apps/web` orphans zero backend code.** Both apps call the
  identical Convex api surface (verified function-by-function). The retirement
  fallout is UI-only: the `apps/web` tree, `packages/ui`'s
  `dropdown-menu.tsx` (its sole consumer), and the SSR auth pieces
  (`lib/auth-server.ts`, `routes/api/auth/$.ts`).
- `packages/ui/package.json` suspect deps — audited: `@shadcn/react` had
  **zero** references anywhere in the repo, ✅ **removed**. `shadcn` (the CLI)
  is a real dev-time tool but was sitting in `dependencies`, ✅ **moved to
  `devDependencies`**. `@base-ui/react` and `@fontsource-variable/outfit`
  turned out to be genuinely used (base-ui backs alert-dialog/dialog/badge/
  drawer/dropdown-menu; the font is `@import`ed in `globals.css`) — kept.
- `/bts.jsonc` — ✅ **deleted** (self-described as safe to delete).
- **Catalog drift:** the Bun workspace catalog exists but both apps hard-pin
  around it — `@tanstack/react-router` `^1.168.22` (web) vs `^1.170.17`
  (admin), `next-themes` literal in web vs `catalog:` in admin, three
  different `@types/node` major lines across the repo. Pick one sourcing
  strategy and let the catalog do its job.
- **Vercel is linked to the old app** (root `.vercel` → project "web");
  `apps/admin` has no Vercel project. The new dashboard is not deployed
  anywhere. See the retirement checklist in §6.3.

---

## 4. Consistency vs CLAUDE.md rules

### 4.1 What's compliant (verified, not assumed)

- **Golden Rule 1 (single write path):** no domain-table writes outside the
  shared mutations, in either app or the bot path.
- **Admin gating:** every admin mutation and query resolves the caller via
  `requireAdminPlayer` (`players.ts:149`) from the verified session — never a
  client-supplied id. The SPA's client-side gating (`use-admin-guard.ts`) is
  UX, not security, and that's correctly documented in the file itself.
- **Soft deletes:** domain tables are soft-delete only; hard deletes exist
  only on sanctioned ephemeral tables (`processedUpdates`, `matchReminders`).
- **Time:** all storage is UTC epoch millis; Tashkent conversion only at the
  edges (`convex/lib/time.ts`, `apps/admin/src/lib/format.ts` /
  `tashkent-time.ts`). No browser-local leakage in the admin app.
- **Telegram gotchas (§6 of CLAUDE.md):** all handled except automatic burial
  repost — secret token, dedup (but see bug 2.2), "message is not modified"
  swallow, 429 backoff, 403→`wantsDms: false`, 4096 guard with a two-stage
  fallback, last-seat concurrency via serializable mutations.

### 4.2 Violations

- **Strings rule (Golden Rule 4) is broken repo-wide** — still true, and
  **deliberately not touched** in this pass. It's a much larger job than the
  rest of this list (every board/DM string in the backend, every toast/
  dialog/label across 11+ admin files) and it touches live bot-message
  rendering — the highest-blast-radius surface in the app. Doing it "quickly"
  alongside everything else risked a live-message regression with no easy
  way to diff-test it. Left as a recommended follow-up with its own pass:
  (1) move board/DM copy into `convex/lib/strings.ts` as interpolating
  functions; (2) create `apps/admin/src/lib/strings.ts`; (3) add a proper
  Russian plural helper while you're there.
- **Board model drift** ✅ **doc fixed** — CLAUDE.md §4 now describes the
  actually-shipped full inline rosters and the manual-repost mechanism
  instead of the old collapsed-rosters/burial-counter plan.
- **Tech-stack table stale** ✅ **doc fixed** — now describes Vite +
  TanStack Router / better-auth cross-domain, notes `apps/web` is pending
  retirement.
- **Unindexed queries** — resolved by deleting the unused indexes and
  rewording the CLAUDE.md §7 rule to explicitly allow bounded scans on small
  tables (see §3.1) rather than pretending full enforcement.

### 4.3 Admin-app quality gaps (not rule violations, but inconsistencies)

- **Error handling is split-brain** ✅ **applied** — every previously-uncaught
  mutation call site (`players.tsx`'s level edit/admin toggle/soft delete;
  `matches.$matchId.tsx`'s publish/cancel/leave/remove/add-guest/add-existing)
  now catches and toasts on failure.
- **No pending/disabled state on non-form mutation buttons** — ✅ **applied**
  to `AddGuestDialog` specifically (the one with a real double-fire bug: two
  guest rows on a double-click). Left as-is elsewhere (publish, cancel,
  remove, promote) — those mutations are naturally idempotent-ish or
  guarded server-side, so the risk there is cosmetic (a toast fires twice),
  not a data bug, and didn't seem worth the extra state plumbing on every
  button for this pass.
- **No error boundary anywhere** — a thrown Convex query error white-screens
  the route.
- **Copy-paste debt:** history card + skeleton duplicated between
  `history.tsx:59-79` and `players_.$playerId.tsx:73-93`; the
  "court · format · level · price" meta line repeated in four files; player
  skeletons duplicated within `players.tsx`. Small shared components
  (`<HistoryList>`, `<MatchMeta>`) would DRY it.
- **`tashkent-time.ts` duplicated between apps** (admin's is a superset).
  When `apps/web` retires this self-resolves; if both apps live longer,
  promote it to a shared package.
- **Cancel-dialog copy** claims cancellation "can only be undone manually
  through the database" — true today (no restore UI), but soft-delete was
  designed for recoverability. Either add an admin "restore" action someday
  or keep the copy; just noting the tension.

---

## 5. Business analysis (CEO/CTO view)

### 5.1 The core loop, honestly assessed

What ships today is the right product: one-tap join from the group, a live
board as shared truth, opt-in reminders with self-serve drop, and an admin
dashboard that covers the full management surface. For a 100–200-person
community running 3–7 matches a week, the loop that fills a match works.

The loop that **re-fills** a match leaks. Seats free up three ways — self-drop
(waitlist notified ✅), admin removal (silently, bug 2.3 ❌), and cancellation
(match gone, N/A) — and refilling depends on an admin noticing and manually
promoting. Every hour a freed seat sits invisible is fill-rate and revenue
(court costs are fixed; `pricePerPerson` × empty seat is money someone eats).
This is the highest-leverage product problem in the codebase.

**Recommended waitlist model (v2 direction): auto-offer with confirmation.**
Seat frees → first waitlisted player gets a DM «Место освободилось —
забрать?» with a claim button and a time window (suggest 30–60 min, shorter
inside T-3h) → unclaimed offers fall through to the next person → exhausted
waitlist falls back to the current behavior (board notification + admin).
This keeps admin curation as the override rather than the bottleneck, fills
seats at chat speed, and builds on plumbing that already exists
(`extraSeatsOpened`, DM buttons, membership roles). It needs one new concept
(a pending offer with an expiry job) — the same scheduler pattern as
reminders. Prerequisite: fix 2.3 first so *every* freed roster seat emits the
same event; the offer machine then subscribes to that one event.

### 5.2 Must-have features (confirmed priorities)

**Payment tracking** — the biggest admin pain at this cadence. Everything
needed already exists except one field: add `paidAt?: number` (or
`paymentStatus`) on `memberships`, a toggle in the roster table on the match
detail page, and a "кто не оплатил" line in the DM/summary. Deliberately
small v1: no amounts (it's `pricePerPerson`), no payment provider, no
receipts — just replace the "scroll the chat to see who said перевёл" ritual.
Est. scope: one schema field, one mutation, one column, one string.

**Board summary auto-text** — near-free win. The renderer
(`lib/board.ts:renderBoard`) already composes exactly the data the
hand-typed «Напоминание, завтра…» message contains. Ship it as a per-match
"Сформировать текст" button in the dashboard that produces copy-pasteable
text (admin still posts it manually — keeps the human touch and avoids new
bot-permission surface). Est. scope: one pure function + one button.

**Next tier (explicitly not now):** weekly templates (real time-saver, but
match creation is already a 30-second form — do it when creation frequency
annoys), attendance/no-show (valuable once waitlist auto-offers exist, since
reliability should influence offer order), verified levels. **Recommend
against for now:** Telegram Mini App player view and multi-chat/topics — both
are architecture-scale efforts that serve growth you don't have yet.

### 5.3 Edge cases through a business lens

- **Short-notice matches** are routine, and today each one poisons the alert
  channel (bug 2.1). Fixing it is an ops necessity, not a nicety.
- **The 4096-char ceiling is real at your scale, not theoretical.** 7 open
  matches × (header + ~5 meta lines + 11-name inline roster + waitlist) will
  brush the limit; the fallback strips mention links, then hard-truncates
  mid-board with an `…` — meaning the *last matches silently disappear from
  the board* while their buttons remain. Worth a deliberate decision before
  it happens organically: either cap concurrent open matches, collapse
  rosters past N names («…и ещё 4»), or accept truncation. The current
  behavior (truncate + `console.error`) is the worst of the three because
  nobody in the group knows it happened.
- **Reminder fan-out:** ~150 opted-in members × sequential DMs ≈ fine
  (Telegram allows ~30 msg/s; a full sweep is seconds). The deferred queue
  from TODO M2 can stay deferred.
- **Admin fat-fingers:** last-admin lockout (2.8) and self-soft-delete are
  one-tap disasters with dashboard-only recovery. Cheap guards, high regret
  avoided.
- **Guests vs capacity:** `addGuestToMatch` respects capacity and guests are
  proper player rows (Golden Rule 6 upheld) — the future merge story is
  intact.

### 5.4 Multi-community flags (decision list, no action now)

If "maybe other communities later" becomes real, these are the current
single-tenant assumptions to unwind — none need fixing today, but avoid
deepening them:

1. `TELEGRAM_CHAT_ID` as a single env var baked into board/notify/reminder
   paths (the biggest one; `boardState` is already keyed by `chatId`, which
   helps).
2. Global `isAdmin` — no notion of which community a player administers.
3. One bot token = one bot identity for all communities.
4. Seed-admin bootstrap via a single env var.
5. Centralized strings module (§4.2) is the localization prerequisite —
   another reason the enforcement pass is worth it.
6. `webLogin` / auth flow is already tenant-agnostic — good.

---

## 6. Recommended CLAUDE.md / TODO.md edits (not applied)

### 6.1 CLAUDE.md ✅ applied (items 1-4; item 5 still pending on 2.8)

1. **Tech stack table:** replace the "TanStack Start" row with: admin
   dashboard = Vite + TanStack Router SPA (`apps/admin`), client-only,
   better-auth cross-domain sessions direct to Convex; note `apps/web`
   (TanStack Start) is deployed but pending retirement.
2. **§4 board model:** two changes. (a) Replace "Full rosters are collapsed"
   with the actual shipped decision — full inline rosters with the two-stage
   4096 fallback (strip links → truncate) — and record whatever call you make
   on the truncation behavior (§5.3). (b) Replace the burial-counter
   paragraph ("a burial counter triggers delete-and-repost") with the descoped
   mechanism: **manual repost via the dashboard's «Отправить в группу»
   button** (`boardState.repostToGroup`). Remove the "when chatter buries the
   board…" bullet from the locked decisions.
3. **§5 data model:** drop `messagesSincePost`/`lastPostedAt` from the
   `boardState` description once the schema fields are removed; fix the
   `durationMin` comment (it does not drive reminders); drop
   `reminderLeadMin` if the field is removed.
4. **§7 Convex conventions:** either enforce "every filtered query uses an
   index" (fix `listAll` / `distinctFieldValues`) or amend the rule to permit
   bounded `.take(N)` scans on small tables — the doc and the code should
   agree either way.
5. **Golden rules:** consider adding the last-admin invariant ("the system
   must always have ≥1 live admin; mutations enforce it") once 2.8 is fixed.

### 6.2 TODO.md ✅ applied

1. **Milestone 6 → descoped, not blocked.** Rewrite as: automatic burial
   repost permanently descoped in favor of the manual «Отправить в группу»
   repost (shipped); delete the schema fields; group-privacy-mode toggle no
   longer needed. Keep a one-line pointer in the v2 backlog in case scale
   changes the calculus.
2. **Milestone 8 → reflect reality.** The admin app's feature surface is
   done (list/detail/CRUD/roster/waitlist/guests/players/history/repost).
   Remaining checklist: deploy `apps/admin` to Vercel + link project; strings
   module (§4.2); error/pending-state polish (§4.3); decide the fate of the
   untracked chart components; then retire `apps/web` (checklist in §6.3).
3. **Milestone 9 (hardening) → add the bug list.** Items 2.1–2.8 belong here
   verbatim; 2.1 and 2.2 specifically before any prod cutover.
4. **Promote from v2 backlog:** payment tracking and board summary auto-text
   as a "v1.5" section (scopes in §5.2); annotate the guest-bringing /
   attendance items as sequenced *after* the waitlist auto-offer decision.
5. **Record the waitlist direction:** add the auto-offer-with-confirmation
   model (§5.1) to the v2 backlog as the chosen direction, so the next
   session doesn't re-litigate it.

### 6.3 `apps/web` retirement checklist (when you're ready — not now)

1. ✅ **Done** — `apps/admin` is deployed to Vercel (`j-schedule-admin-new`
   project; production and preview environments configured separately,
   preview against dev Convex, production against prod Convex).
2. ✅ **Done** — env vars set on both environments; `EXTRA_TRUSTED_ORIGINS`
   includes the admin domain on both the dev and prod Convex deployments.
3. Partially verified through real usage during this work (match detail,
   roster views, login) — hasn't been walked as a deliberate end-to-end
   checklist. Worth doing once before actually retiring `apps/web`.
4. Delete `apps/web`, `packages/ui/src/components/dropdown-menu.tsx`, root
   `.vercel` link to project "web" — **not done**, per your "keep both for
   now" decision.
5. Update CLAUDE.md tech stack — ✅ done as part of §6.1 above (already
   reflects the admin app regardless of whether `apps/web` retires).
6. Deferred dep cleanup (catalog re-alignment) — not done, low priority,
   noted in §3.3.

---

## Appendix: verification notes

Bug claims 2.1–2.8, the inline-roster drift, the negative-`spotsLeft` path,
and the missing guards were re-verified against source at head `a673011`
before writing this report (files: `matches.ts`, `memberships.ts`,
`matchReminders.ts`, `players.ts`, `webLogin.ts`, `telegram/webhook.ts`,
`lib/board.ts`). Line numbers reference that commit and will drift.
