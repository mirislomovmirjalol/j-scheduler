# One Padel — product & growth ideas

Fresh strategic audit of the whole product as of **2026-07-20** (branch `main`,
head `c44de7a`). This replaces the earlier code/bug audit (that pass is done —
its findings were applied and shipped; this file is a clean slate for *ideas*,
not defects).

**Method:** read the full surface — Convex backend (`packages/backend`), admin
dashboard (`apps/admin`, running live on `:3002`), marketing site (`apps/web`),
the Telegram board/DM/command layer, and the data model — then looked at it as a
**player, admin, business owner, and investor** in turn. UI/UX notes are grounded
in the actual components and CSS, not screenshots.

**Calibration:** ~100–200 members, 3–7 matches/week, single community in
Tashkent, Russian-only, manual payments (card transfer), one or two admins. No
fixed launch date — ideas are ranked by **leverage**, not urgency.

**Deployment model (confirmed):** this stays **single-tenant**. Growth to other
communities happens by **forking and redeploying a separate instance** (its own
Convex deployment, its own bot, its own admin site) — never multiple communities
on one server. That's a deliberate, cleaner choice than multi-tenant SaaS: it
means the single-tenant assumptions (`TELEGRAM_CHAT_ID`, global `isAdmin`, one bot
token) are **correct design, not debt**. The thing that matters instead is
**redeployability** — how much of a fresh instance is a config change vs. a
code hunt (see §F).

---

## TL;DR — the five highest-leverage moves

| # | Idea | Who it helps | Impact | Effort |
|---|------|--------------|--------|--------|
| 1 | **Waitlist auto-offer with confirmation** — stop leaking filled seats | Owner, Player, Admin | 🔥🔥🔥 | M |
| 2 | **Money layer: court-cost per match + per-player balance + pay-link** | Owner, Investor | 🔥🔥🔥 | M |
| 3 | **Match templates / "duplicate last week"** — kill repetitive admin work | Admin | 🔥🔥 | S |
| 4 | **Frictionless reminders + "Add to calendar"** — the retention basics | Player | 🔥🔥 | S |
| 5 | **A real "business health" view** (fill rate, revenue, retention, no-shows) | Owner, Investor | 🔥🔥 | M |

Everything below expands these plus a long tail of smaller wins, tagged by
perspective. Impact/effort are rough: S ≈ a day, M ≈ a few days, L ≈ a week+.

---

## A. Fill-rate & the re-fill loop — the single biggest lever

The core loop that *fills* a match works well (one-tap join, live board,
waitlist). The loop that **re-fills** a match still leaks, and every empty seat
is money someone eats (court cost is fixed; `pricePerPerson × empty seat` is lost
revenue). Seats free three ways — self-drop, admin removal, cancellation — and
today refilling depends on an admin *noticing* and manually calling
`promoteFromWaitlist`. `dropMembership` already fires `extraSeatsOpened` to the
waitlist, but that's just a "a seat opened, wait for an admin" nudge.

### A1. Waitlist auto-offer with confirmation 🔥🔥🔥 · M · *[Owner, Player, Admin]*
The chosen v2 direction from the prior audit, still unbuilt and still #1. When a
roster seat frees: DM the first waitlisted player «Место освободилось — забрать?»
with a claim button and a time window (30–60 min; shorter inside T-3h). Unclaimed
→ falls through to the next person → exhausted waitlist → today's behavior (board
notice + admin). Admin curation becomes the *override*, not the bottleneck.
- **Build on what exists:** `extraSeatsOpened`, DM inline buttons, the scheduler
  pattern from reminders. Needs one new concept — a *pending offer* row with an
  expiry job (mirror `matchReminders`).
- **Player-side bonus:** show waitlist **position** ("ты 2-й в очереди") on the
  board / `/my` / dashboard. Right now a waitlisted player has zero visibility
  into whether they'll ever get in — a silent motivation killer.

### A2. Late-drop awareness 🔥 · S · *[Owner, Admin]*
A drop at T-30m almost never re-fills. Flag late drops (drop time vs `startsAt`)
so admins can see who does it repeatedly, and optionally feed it into offer
ordering (A1) and no-show reputation (D4). Data's already there (`joinedAt`,
`removedBy`, `matchStartsAt`) — this is a read-side derivation, not new writes.

### A3. Auto-close / auto-unpublish stale drafts 💡 · S · *[Admin]*
Drafts (`isPublished: false`) live forever. A "you have 2 unpublished drafts
starting soon" nudge, or auto-archive of drafts whose `startsAt` has passed,
keeps the matches list honest.

---

## B. Money — turn the tool into a business dashboard

Payment *tracking* shipped (`memberships.paid` toggle, "Оплатили: 3/6" line, the
`/pay` command with `communitySettings.paymentInfo`). But it stops at a manual
checkbox. There is no notion of **cost, margin, or who owes what across time** —
which is exactly the data a business owner and an investor care about most.

### B1. Court cost per match → automatic margin 🔥🔥 · S · *[Owner, Investor]*
Add `matches.courtCost` (optional). Then every match, every week, every month has
a computed P&L: `revenue = paid seats × pricePerPerson`, `margin = revenue −
courtCost`. One field unlocks the entire "is this community making or losing
money" question that nothing currently answers.

### B2. Per-player balance / "who owes" 🔥🔥 · M · *[Owner, Admin, Player]*
`paid` is per-membership but never aggregated. A player-level view — "unpaid
games: 3, total owed: X" — surfaces chronic non-payers (today invisible unless an
admin remembers). Two surfaces: admin sees everyone's balance; a player sees
**their own** "мои неоплаченные игры" (a genuine reason for a player to open the
dashboard). All derivable from existing `paid` + `pricePerPerson`.

### B3. Pay-link deep integration 🔥🔥 · M · *[Owner, Player, Investor]*
Manual card transfers are the local norm, but a prefilled **Payme/Click/Uzum**
deep link (amount = `pricePerPerson`) on the match detail + reminder DM removes
the "what's the card number again" ritual and measurably improves collection.
Even without a payment *gateway*, a deep link is cheap. This is also the first
step toward the investable version (transaction-fee business model, B-invest).

### B4. Payment nudges 🔥 · S · *[Owner, Admin]*
A scheduled DM to unpaid roster players after a match ("не забудь оплатить игру
X — реквизиты: …"). Reuses the reminder scheduler + `paymentInfo`. Turns
collection from "admin chases in chat" into an automated sweep.

### B5. Pricing flexibility 💡 · M · *[Owner, Investor]*
Member-vs-guest pricing, early-bird, or a punch-card ("10 игр за X") increases
both revenue and commitment (prepaid players show up). Reserved — needs a pricing
decision before building, but worth putting on the roadmap.

---

## C. Player experience — the retention basics

Most players only ever touch Telegram (the board + DMs), not the dashboard, so
small frictions there compound. The dashboard is polished; the *player-facing*
gaps are mostly in Telegram and in convenience features.

### C1. Frictionless reminder opt-in 🔥🔥 · S · *[Player]*
Reminders require the player to have DM'd `/start` (`wantsDms`). A player who
never did gets **no reminders** and never learns why. Add a one-tap "🔔 Напоминать
мне" button on each match message / board that opts them in on the spot, and a
gentle "хочешь напоминания? нажми Start" line the first time someone joins
without `wantsDms`. This is the cheapest retention win available.

### C2. "Add to calendar" (.ics / Google) 🔥🔥 · S · *[Player]*
No calendar export anywhere. An "В календарь" link (per match) that yields an
`.ics` or a Google Calendar URL is a high-value convenience that makes the game a
real commitment. Purely a display-edge feature — you already have `startsAt`,
`durationMin`, `court`.

### C3. Court location / map link 🔥 · S · *[Player]*
`court` is free text — a new player often doesn't know *where* that is. Add an
optional map/address per court (or a `location` field per match). Removes a real
"куда идти?" friction and reduces no-shows-by-confusion.

### C4. Self-serve guest bringing 💡 · M · *[Player, Owner]*
Today only admins add guests (`addGuestToMatch`). Players routinely want to bring
a friend. A "+1 гость" self-serve flow (capacity-aware, guest counts against the
roster) is a frequent real-world need and drives attendance. Reserved in CLAUDE.md
v2 (cascade rules need a decision) — but it's a strong player-pull feature.

### C5. Uzbek / multi-language 💡 · L · *[Player, Investor]*
Russian-only. Part of the community likely prefers Uzbek. This is **blocked** on
centralizing the admin app's strings (see D6) — the bot copy is already in
`lib/strings.ts`, but `apps/admin` has Russian inline everywhere. Do the string
extraction first; language becomes a config swap after.

---

## D. Admin efficiency — respect the organizer's time

The admin is the bus factor for the whole community. Anything that saves them
minutes per match, or removes a "did I remember to…" worry, is high-value.

### D1. Match templates / duplicate 🔥🔥 · S · *[Admin]*
At 3–7 matches/week the same slots repeat (same court, format, level, price,
time-of-day). "Дублировать игру" / "Повторить прошлую неделю" pre-fills the
create form. Cheapest big time-saver. A full **weekly recurring template** (v2)
is the next step, but one-click duplicate delivers 80% of the value now.

### D2. Board summary auto-text 🔥 · S · *[Admin]*
The prior audit flagged this and it's still unbuilt: a per-match "Сформировать
текст" button that outputs copy-pasteable Russian summary text (the
`renderMatchMessage` data already composes it). Admin still posts manually — keeps
the human touch, adds zero bot-permission surface. Near-free.

### D3. Restore a cancelled match 🔥 · S · *[Admin]*
Cancellation is a soft delete (`isDeleted: true`), designed to be recoverable —
but there's **no restore UI**, and the cancel dialog even tells the admin it "can
only be undone through the database." Add an admin "Восстановить" action (and a
"Отменённые" filter). Honors the soft-delete design that already exists.

### D4. No-show reputation 🔥 · M · *[Admin, Owner]*
`noShow` is tracked manually per membership and shown on the profile, but it's
inert — it influences nothing. Surface a per-player no-show rate, and (once A1
ships) let it order waitlist offers. Reliability becomes visible and mildly
self-correcting.

### D5. Last-admin & self-destruct guards 🔥 · S · *[Admin]*
`setIsAdmin` / `softDeletePlayer` let an admin demote or delete the last admin (or
themselves) — a one-tap lockout with dashboard-only recovery. This was *declined*
in the last audit; re-flagging because it's a cheap guard against a
high-regret mistake. Count remaining live admins; refuse the write that would hit
zero.

### D6. Centralize admin strings 🔥 · M · *[Admin, Investor]*
`apps/admin` has no strings module — Russian copy is inline across ~15 files
(CLAUDE.md §7 calls this out). It's the prerequisite for C5 (i18n) *and* for
consistent copy/tone. Non-trivial but unblocks the multilingual/multi-community
story. Create `apps/admin/src/lib/strings.ts`; add a proper Russian plural helper
while you're in there (the heatmap already has a `1 ? "игра" : "игры"` bug that
mishandles 5+).

### D7. Broadcast / announce from the dashboard 💡 · M · *[Admin]*
No way to push a one-off announcement ("корт изменился, смотрите закреплённое") to
the group or to a match's roster from the dashboard. Reuses the DM/notify layer.
Useful, but weigh against bot-permission and spam risk — make it deliberate.

---

## E. Business intelligence — make the data earn its keep

The heatmap + trend charts (dashboard, admin-only) are a start, but they're
activity charts, not **business** metrics. The data to answer every owner/investor
question already exists in `matches` + `memberships` + `paid`/`noShow` — it's just
never aggregated into a health view.

### E1. "Community health" dashboard 🔥🔥 · M · *[Owner, Investor]*
One screen: weekly **fill rate**, **revenue & margin** (needs B1), **active
players** (week-over-week), **retention** (returning vs new), **no-show rate**,
**court utilization**. This is the single artifact that turns "a nice tool" into
"a business I can reason about" — and it's the first thing an investor asks to
see. Mostly read-side derivations over existing tables.

### E2. Player leaderboards / engagement 🔥 · S · *[Owner, Player]*
"Most games this month", "most reliable" (low no-show), streaks. Doubles as a
retention mechanic (players like seeing themselves ranked) and gives the marketing
site real, live social proof. The public profile + `matchStartsAt` history makes
this cheap.

### E3. Instrument the funnel 🔥 · S · *[Investor]*
Nothing currently counts: joins, drops, board-tap→join conversion, reminder→show
rate, dashboard logins. Even lightweight event counting now gives you the metrics
a fundraise or a "should I keep doing this" decision needs later. Cheap to add,
impossible to backfill.

---

## F. Redeployability — make a new community a config change, not a code hunt

Since growth = **fork and redeploy a fresh single-tenant instance**, the whole
"productization" question collapses into one practical thing: *how many files does
someone edit to stand up community B?* Right now the answer is a mix — secrets and
IDs are clean env config, but brand, group link, timezone, and language are
hardcoded, so a redeploy is a search-and-replace hunt with at least one silent
functional bug. Fixing this is the single most valuable "growth" investment,
because it turns every future community from a code project into a config file.

### F1. Extract community config into one place 🔥🔥 · M · *[Owner, Investor]*
Today's split, verified in code:

**Already clean (env-driven — keep as-is):** `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_SECRET_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ID`,
`SEED_ADMIN_TELEGRAM_ID`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`,
`VITE_TELEGRAM_BOT_USERNAME`.

**Hardcoded — a per-community edit (the friction to remove):**

| What | Where | Why it bites on redeploy |
|------|-------|--------------------------|
| **Group link `https://t.me/one_padel`** | `convex/lib/strings.ts:45` (`joinMatchesInGroup`) | **Functional bug** — community B's bot tells users to join *this* community's group. Highest priority. |
| **Timezone Tashkent / UTC+5** | `convex/lib/time.ts` (`TASHKENT_TZ`, `TASHKENT_OFFSET_MS`) + duplicated `apps/admin/src/lib/tashkent-time.ts` | Any non-Tashkent community shows **wrong times everywhere** — board, DMs, reminders, dashboard. Baked into function names too. |
| **Brand "One Padel"** | 2× in `apps/admin` (`app-sidebar.tsx:27`, `p.$playerId.tsx:28`); ~23× in `apps/web` | Cosmetic in the app; the marketing site is a near-total rewrite regardless (see F3). |
| **Language (Russian)** | bot copy in `lib/strings.ts`; admin copy **inline** across ~15 files | A different-language community can't be served without the string extraction (D6). |

**The move:** one `community.config.ts` (or a small set of env vars) holding
`{ communityName, groupUrl, timezone, locale }`, consumed by the backend strings,
`time.ts`, and both frontends. Combined with D6 (admin string extraction), a new
community becomes: set env vars, edit one config file, replace the marketing
content. That's the whole "productization" story for this model — and it's an
M, not the L that multi-tenancy would have been.

### F2. Timezone-parameterize the time layer 🔥 · S · *[Owner]*
Subset of F1 worth calling out on its own because it's the highest-correctness
item: `toTashkent` / `fromTashkent` / `tashkentDayIndex` assume a fixed +5 offset.
Generalize to an injected IANA zone (`Intl.DateTimeFormat` already takes `timeZone`
— the code uses `"Asia/Tashkent"` as a literal, so this is mostly a rename +
parameter). Do this even if you never leave Tashkent; it removes a whole class of
"wrong time" landmines from any future fork.

### F3. Marketing-site → funnel (and fork-friendly) 🔥 · S · *[Owner, Investor]*
`apps/web` (home/about/community/tournaments) already previews live upcoming
matches via `listPublicUpcoming` — a good hook. Two asks: (a) make the CTA lead
*into* the loop — prominent "join the community" → Telegram group + bot deep link,
plus E2 leaderboards / live fill stats as social proof (it informs today; it
should **convert**); (b) since it's ~23 hardcoded brand strings + bespoke copy +
club photos, treat it as the **one part that's genuinely rebuilt per community** —
so keep its content in as few files as possible to make that rebuild fast.

### F4. Reduce bus factor 🔥 · — · *[Owner]*
The whole operation depends on one admin's diligence (manual payments, promotions,
no-show flags). Every automation above (A1, B4, D1) also *de-risks the person* —
each one makes the community survivable if the founder-admin steps back for a week.
Especially relevant in a fork-per-community world where *you* may be the admin (or
the setup partner) for several instances at once.

---

## G. UI/UX polish — mostly small, the base is strong

The admin app is genuinely well-built (concentric radii, staggered transitions,
reduced-motion handling, responsive drawers/sheets — reviewed separately). The
per-match board architecture also retired the old 4096-char truncation risk.
Remaining items are small:

- **First-run / empty states** 🔥 · S — a brand-new admin (fresh community) lands
  on empty lists with no "create your first match" guidance beyond the matches
  page. A short onboarding checklist would help. *[Admin]*
- **No error boundary** 🔥 · S — a thrown Convex query error white-screens the
  route (flagged before, still open). One boundary at the authenticated layout.
  *[Player, Admin]*
- **Copy-paste debt** · S — history card + skeleton duplicated between `history.tsx`
  and `players_.$playerId.tsx`; the "court · format · level · price" meta line
  repeats in 4 files. Extract `<HistoryList>` / `<MatchMeta>`. *[maintainability]*
- **Default Vite favicon / no app icon** · S — `index.html` still ships
  `/vite.svg`. A real One Padel icon is a 10-minute brand win. *[Owner]*
- **Cancel-dialog copy** · S — now inaccurate once D3 (restore) ships; update the
  "only through the database" wording. *[Admin]*

---

## H. Reliability & trust — protect the layer people rely on

The heavy bugs from the last pass are fixed. These are product-level trust items:

- **Payment/attendance data quality** *[Owner]* — both are manual; the numbers are
  only as good as admin diligence. B4 (nudges) and D4 (surfacing) partly
  self-correct this.
- **Reminder trust** *[Player]* — the reminder layer is the one thing people
  passively depend on; a single wrong-time or missed reminder erodes it. The
  dead-man's-switch is in place — consider a visible "reminders healthy" indicator
  on the admin dashboard so the admin *sees* it working, not just gets alerted when
  it breaks.
- **Board sync fan-out** *[scale]* — every join/drop schedules its own
  `syncMatchMessage`; fine now, a debounce is the eventual fix if a popular match
  gets tapped rapidly.

---

## Suggested sequencing

Not a mandate — a sequence that front-loads leverage and lets later work reuse
earlier plumbing:

1. **v1.5 (revenue & time, all S/M):** A1 waitlist auto-offer · B1 court cost ·
   D1 duplicate-match · D2 board summary · C1 reminder opt-in · C2 add-to-calendar.
   *These pay for themselves in filled seats and admin minutes.*
2. **v1.6 (make the data earn):** B2 balances · B4 payment nudges · E1 health
   dashboard · D4 no-show reputation · E3 funnel instrumentation.
3. **v2 (fork-readiness & reach):** F2 timezone-parameterize · F1 community config
   → D6 admin strings → C5 i18n · B3 pay links · C4 self-serve guests. *Do F1/F2
   before the second community exists — they're cheap now and painful to retrofit
   across live deployments later.*

## Open decisions (yours to make before the linked work starts)

- **Waitlist offer window** — how long does a claim stay open, and does it shorten
  inside T-3h? (blocks A1)
- **Deployment model** — ✅ *resolved: single-tenant, fork-and-redeploy per
  community.* This makes F1/F2 (config extraction, timezone) the "growth" work
  instead of multi-tenancy, and confirms the current single-tenant assumptions are
  correct. Next sub-decision: config file vs. more env vars for
  `communityName / groupUrl / timezone / locale`?
- **Business model** — with fork-and-redeploy, this is a **deploy-per-community
  service** (you set up + optionally run each instance), not a scalable SaaS.
  Decide whether that's a one-off setup fee, an ongoing "I run it for you"
  retainer, or purely your own communities. Shapes how much F1 polish is worth.
- **Pricing model (per match)** — flat, or member/guest/early-bird? (blocks B5)
