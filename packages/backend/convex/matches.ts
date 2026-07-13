import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdminPlayer, requireAuthedPlayer } from "./players";

const REMINDER_LEADS = [
  { kind: "t_minus_3h" as const, leadMs: 3 * 60 * 60 * 1000 },
  { kind: "t_minus_30m" as const, leadMs: 30 * 60 * 1000 },
];

const DETAIL_FIELD_LABELS = {
  court: "Корт",
  format: "Формат",
  level: "Уровень",
  pricePerPerson: "Цена",
  description: "Описание",
  durationMin: "Длительность",
  lundaUrl: "Ссылка",
  maxMembers: "Мест",
} as const;

// Builds a human-readable "field: old → new" line per changed field, for a
// DM that actually says what changed — not a vague "something changed, go
// look elsewhere" (the community lives in Telegram, not the web dashboard).
function describeDetailChanges(
  patch: Partial<Doc<"matches">>,
  existing: Doc<"matches">,
  skipMaxMembersIncrease: boolean,
): string[] {
  const changes: string[] = [];
  for (const key of Object.keys(DETAIL_FIELD_LABELS) as (keyof typeof DETAIL_FIELD_LABELS)[]) {
    const newValue = patch[key];
    if (newValue === undefined) continue;
    if (key === "maxMembers" && skipMaxMembersIncrease) continue;
    const oldValue = existing[key];
    if (oldValue === newValue) continue;
    changes.push(`${DETAIL_FIELD_LABELS[key]}: ${oldValue ?? "—"} → ${newValue}`);
  }
  return changes;
}

// Schedules the T-3h / T-30m reminder jobs for a match and records their
// jobIds so a later reschedule can cancel them. A lead time that's already
// in the past (e.g. the match starts in under 30 minutes) is skipped rather
// than fired immediately — recorded with firedAt set (no jobId) so the
// dead-man's-switch sees a deliberate skip, not a lost reminder.
async function scheduleReminders(
  ctx: MutationCtx,
  matchId: Id<"matches">,
  startsAt: number,
) {
  for (const { kind, leadMs } of REMINDER_LEADS) {
    const fireAt = startsAt - leadMs;
    if (fireAt <= Date.now()) {
      await ctx.db.insert("matchReminders", { matchId, kind, firedAt: Date.now() });
      continue;
    }

    const jobId = await ctx.scheduler.runAt(
      fireAt,
      internal.telegram.reminders.sendReminder,
      { matchId, kind },
    );
    await ctx.db.insert("matchReminders", { matchId, jobId, kind });
  }
}

// The single write path for creating a match — both the admin dashboard and
// (if ever added) a Telegram admin command must call this same mutation
// (CLAUDE.md Golden Rule 1). Admin identity is derived from the verified
// session, never trusted from the client.
export const createMatch = mutation({
  args: {
    startsAt: v.number(),
    durationMin: v.optional(v.number()),
    description: v.string(),
    level: v.string(),
    court: v.string(),
    format: v.string(),
    maxMembers: v.number(),
    pricePerPerson: v.optional(v.number()),
    lundaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminPlayer(ctx);

    const matchId = await ctx.db.insert("matches", {
      ...args,
      isPublished: false,
      createdBy: admin._id,
      isDeleted: false,
      createdAt: Date.now(),
    });

    await scheduleReminders(ctx, matchId, args.startsAt);
    // No board sync here — the match is a draft (isPublished: false) and
    // must stay invisible to the group and the player-facing web view until
    // publishMatch is called.
    return matchId;
  },
});

// Drafts stay invisible (board + player-facing web view) until an admin
// explicitly publishes. Idempotent — publishing an already-published match
// is a no-op.
export const publishMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    await requireAdminPlayer(ctx);

    const existing = await ctx.db.get("matches", matchId);
    if (!existing || existing.isDeleted) throw new Error("Match not found");
    if (existing.isPublished) return;

    await ctx.db.patch("matches", matchId, { isPublished: true });
    // force: true — a silent in-place edit would update the existing board
    // message with no Telegram notification, so a newly published match
    // (the moment it actually becomes joinable) would go unnoticed by the
    // group. Same reasoning as the manual "Отправить в группу" repost.
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {
      force: true,
    });
  },
});

export const editMatch = mutation({
  args: {
    matchId: v.id("matches"),
    startsAt: v.optional(v.number()),
    durationMin: v.optional(v.number()),
    description: v.optional(v.string()),
    level: v.optional(v.string()),
    court: v.optional(v.string()),
    format: v.optional(v.string()),
    maxMembers: v.optional(v.number()),
    pricePerPerson: v.optional(v.number()),
    lundaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminPlayer(ctx);

    const { matchId, ...patch } = args;
    const existing = await ctx.db.get("matches", matchId);
    if (!existing || existing.isDeleted) {
      throw new Error("Match not found");
    }

    const isReschedule =
      patch.startsAt !== undefined && patch.startsAt !== existing.startsAt;
    const isExtraSeats =
      patch.maxMembers !== undefined && patch.maxMembers > existing.maxMembers;

    // A maxMembers decrease below the live roster count would leave the
    // board showing a nonsensical negative spots-left with nobody demoted —
    // auto-demotion is a policy decision (who gets bumped?) we're not making
    // here, so just refuse the edit until the admin clears seats manually.
    if (patch.maxMembers !== undefined && patch.maxMembers < existing.maxMembers) {
      const rosterCount = (
        await ctx.db
          .query("memberships")
          .withIndex("by_match_and_role", (q) =>
            q.eq("matchId", matchId).eq("role", "roster"),
          )
          .collect()
      ).filter((m) => !m.isDeleted).length;

      if (patch.maxMembers < rosterCount) {
        throw new Error("Сначала уберите игроков из состава");
      }
    }

    // Any other visible change — a maxMembers *decrease* counts here too,
    // since that's not the "extra seats" case above.
    const detailChanges = describeDetailChanges(patch, existing, isExtraSeats);

    await ctx.db.patch("matches", matchId, patch);

    if (isReschedule) {
      // Cancel stale, not-yet-fired reminder jobs before scheduling new ones
      // for the new time — otherwise players get pinged for the old slot.
      // Already-fired rows are left alone (nothing to cancel, and the
      // dead-man's-switch relies on their firedAt surviving).
      const staleReminders = await ctx.db
        .query("matchReminders")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .collect();
      for (const reminder of staleReminders) {
        if (reminder.firedAt !== undefined) continue;
        if (reminder.jobId) await ctx.scheduler.cancel(reminder.jobId);
        await ctx.db.delete("matchReminders", reminder._id);
      }

      await scheduleReminders(ctx, matchId, patch.startsAt!);

      await ctx.scheduler.runAfter(
        0,
        internal.telegram.notify.matchRescheduled,
        { matchId },
      );
    }

    if (isExtraSeats) {
      // Bump board (below) + DM the current waitlist that seats opened up.
      // Doesn't auto-promote — waitlist promotion stays an explicit admin
      // action (Promote button), per v1 scope.
      await ctx.scheduler.runAfter(
        0,
        internal.telegram.notify.extraSeatsOpened,
        { matchId },
      );
    }

    if (detailChanges.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.telegram.notify.matchDetailsChanged,
        { matchId, changes: detailChanges },
      );
    }

    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Cancel = soft delete (CLAUDE.md Golden Rule 5). Cancels any pending
// reminder jobs; leaves memberships as historical record.
export const cancelMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    await requireAdminPlayer(ctx);

    const existing = await ctx.db.get("matches", matchId);
    if (!existing || existing.isDeleted) throw new Error("Match not found");

    await ctx.db.patch("matches", matchId, { isDeleted: true });

    const reminders = await ctx.db
      .query("matchReminders")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .collect();
    for (const reminder of reminders) {
      if (reminder.firedAt !== undefined) continue;
      if (reminder.jobId) await ctx.scheduler.cancel(reminder.jobId);
      await ctx.db.delete("matchReminders", reminder._id);
    }

    await ctx.scheduler.runAfter(0, internal.telegram.notify.matchCancelled, {
      matchId,
    });
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Open = not deleted and not yet started. Board sorts soonest-first. Also
// resolves roster/waitlist first names for the board — full names shown
// inline (per explicit user decision, revisiting CLAUDE.md's original
// "collapsed rosters" call — see TODO.md's board model note). The 4096-char
// guard in lib/board.ts's renderBoard is the safety net if this ever gets
// too long for one message; we deliberately don't split into multiple
// board messages (that reintroduces the burial problem the collapsed
// design existed to avoid).
export const listOpenWithRosterCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const matches = (
      await ctx.db
        .query("matches")
        .withIndex("by_isDeleted_startsAt", (q) =>
          q.eq("isDeleted", false).gte("startsAt", Date.now()),
        )
        .order("asc")
        .take(50)
    ).filter((m) => m.isPublished);

    const namesFor = async (matchId: Id<"matches">, role: "roster" | "waitlist") => {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_match_and_role", (q) =>
          q.eq("matchId", matchId).eq("role", role),
        )
        .take(200);

      const players = await Promise.all(
        memberships
          .filter((m) => !m.isDeleted)
          .map((m) => ctx.db.get("players", m.playerId)),
      );

      return players
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => ({ name: p.firstName, telegramUserId: p.telegramUserId }));
    };

    return await Promise.all(
      matches.map(async (match) => {
        const [rosterNames, waitlistNames] = await Promise.all([
          namesFor(match._id, "roster"),
          namesFor(match._id, "waitlist"),
        ]);
        return {
          ...match,
          rosterCount: rosterNames.length,
          rosterNames,
          waitlistNames,
        };
      }),
    );
  },
});

export const getById = internalQuery({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    return await ctx.db.get("matches", matchId);
  },
});

// Confirmed (roster, not waitlist) players for a match — used to re-ping on
// reschedule and, later, for reminder sweeps.
export const listRosterPlayers = internalQuery({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_match_and_role", (q) =>
        q.eq("matchId", matchId).eq("role", "roster"),
      )
      .take(200);

    const players = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map((m) => ctx.db.get("players", m.playerId)),
    );

    return players.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// Waitlisted players for a match — used by the extra-seats DM notify.
export const listWaitlistPlayers = internalQuery({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_match_and_role", (q) =>
        q.eq("matchId", matchId).eq("role", "waitlist"),
      )
      .take(200);

    const players = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map((m) => ctx.db.get("players", m.playerId)),
    );

    return players.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// Match detail page: the match plus full roster/waitlist with player info
// and membership metadata (joinedAt, addedBy). Any authenticated player can
// view this (the unified matches view) — admin-only actions are gated
// separately at the mutation level (cancelMatch, removeMember, etc.). A
// draft (isPublished: false) is admin-only — regular players see "not
// found", same as any other match they shouldn't know exists yet.
export const getMatchDetail = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    // Graceful-degrade on a transient auth race (see players.listAll) —
    // already returns T | null, so a failed check just looks like "not
    // found" for a moment until the query self-heals.
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    if (!player) return null;

    const match = await ctx.db.get("matches", matchId);
    if (!match) return null;
    if (!match.isPublished && !player.isAdmin) return null;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .take(400);

    // Payment status is private — only an admin, or the player it belongs
    // to, should ever receive it over the wire. Redacting here (not just
    // hiding it in the UI) matters: the raw query response is otherwise
    // inspectable regardless of what the frontend chooses to render.
    const redactPaid = (m: Doc<"memberships">): Doc<"memberships"> =>
      player.isAdmin || m.playerId === player._id
        ? m
        : { ...m, paid: undefined };

    const members = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map(async (m) => ({
          membership: redactPaid(m),
          player: await ctx.db.get("players", m.playerId),
        })),
    );

    // Admin-only: who joined and then left themselves — distinct from
    // admin removals/promotions, via removedBy (see memberships.ts).
    const cancelled = player.isAdmin
      ? await Promise.all(
          memberships
            .filter((m) => m.isDeleted && m.removedBy === "self")
            .map(async (m) => ({
              membership: m,
              player: await ctx.db.get("players", m.playerId),
            })),
        )
      : [];

    return {
      match,
      roster: members.filter((m) => m.membership.role === "roster"),
      waitlist: members.filter((m) => m.membership.role === "waitlist"),
      cancelled,
      myMembership: members.find((m) => m.membership.playerId === player._id)?.membership ?? null,
    };
  },
});

// Read-only player web view (Milestone 9) — any authenticated player (not
// just admins) can see upcoming matches with FULL rosters. This is the
// deliberate exception to the board's collapsed-roster rule: CLAUDE.md's
// board model says full rosters show "one tap (or the web view)". Admins
// additionally see drafts (isPublished: false) so they can review and
// publish them; regular players only ever see published matches.
export const listUpcomingForPlayer = query({
  args: {},
  handler: async (ctx) => {
    // Graceful-degrade on a transient auth race (see players.listAll).
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    if (!player) return [];

    const matches = (
      await ctx.db
        .query("matches")
        .withIndex("by_isDeleted_startsAt", (q) =>
          q.eq("isDeleted", false).gte("startsAt", Date.now()),
        )
        .order("asc")
        .take(50)
    ).filter((m) => m.isPublished || player.isAdmin);

    return await Promise.all(
      matches.map(async (match) => {
        const memberships = await ctx.db
          .query("memberships")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .take(400);

        const members = await Promise.all(
          memberships
            .filter((m) => !m.isDeleted)
            .map(async (m) => ({
              role: m.role,
              player: await ctx.db.get("players", m.playerId),
            })),
        );

        return {
          match,
          roster: members.filter((m) => m.role === "roster"),
          waitlist: members.filter((m) => m.role === "waitlist"),
        };
      }),
    );
  },
});

// Same shape as listAllForPlayerPage, mirrored for the matches page's
// "Прошедшие" quick view — matches that have already happened, most
// recent first. Paginated for the same reason as "Все игры": past-match
// history has no natural upper bound as a community's history grows, so a
// bounded take() would eventually start silently dropping the oldest
// matches. See listAllForPlayerPage's comment for the isPublished-after-
// paginate tradeoff (short pages for non-admins is expected, not a bug).
export const listPastForPlayerPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    if (!player) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("matches")
      .withIndex("by_isDeleted_startsAt", (q) =>
        q.eq("isDeleted", false).lt("startsAt", Date.now()),
      )
      .order("desc")
      .paginate(paginationOpts);

    const page = await Promise.all(
      result.page
        .filter((m) => m.isPublished || player.isAdmin)
        .map(async (match) => {
          const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_match", (q) => q.eq("matchId", match._id))
            .take(400);

          const members = await Promise.all(
            memberships
              .filter((m) => !m.isDeleted)
              .map(async (m) => ({
                role: m.role,
                player: await ctx.db.get("players", m.playerId),
              })),
          );

          return {
            match,
            roster: members.filter((m) => m.role === "roster"),
            waitlist: members.filter((m) => m.role === "waitlist"),
          };
        }),
    );

    return { ...result, page };
  },
});

// The matches page's "Все игры" quick view — every match ever, paginated
// (cursor-based, via Convex's usePaginatedQuery) rather than a bounded
// take(), since this is the one view with no natural upper bound as a
// community's history grows. isPublished is filtered after paginate (not
// part of the index), so a returned page can be shorter than
// paginationOpts.numItems for non-admins — a documented Convex tradeoff,
// not a bug; the client just keeps requesting more until isDone.
export const listAllForPlayerPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    if (!player) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("matches")
      .withIndex("by_isDeleted_startsAt", (q) => q.eq("isDeleted", false))
      .order("desc")
      .paginate(paginationOpts);

    const page = await Promise.all(
      result.page
        .filter((m) => m.isPublished || player.isAdmin)
        .map(async (match) => {
          const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_match", (q) => q.eq("matchId", match._id))
            .take(400);

          const members = await Promise.all(
            memberships
              .filter((m) => !m.isDeleted)
              .map(async (m) => ({
                role: m.role,
                player: await ctx.db.get("players", m.playerId),
              })),
          );

          return {
            match,
            roster: members.filter((m) => m.role === "roster"),
            waitlist: members.filter((m) => m.role === "waitlist"),
          };
        }),
    );

    return { ...result, page };
  },
});

// Public, unauthenticated preview for the marketing site (apps/web) — the
// same shape of data already visible to anyone in the Telegram group's
// board, just without player names/usernames. Deliberately excludes roster/
// waitlist membership details (PII) since this has no auth gate at all,
// unlike listUpcomingForPlayer.
export const listPublicUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const matches = (
      await ctx.db
        .query("matches")
        .withIndex("by_isDeleted_startsAt", (q) =>
          q.eq("isDeleted", false).gte("startsAt", Date.now()),
        )
        .order("asc")
        .take(20)
    ).filter((m) => m.isPublished);

    return await Promise.all(
      matches.map(async (match) => {
        const roster = await ctx.db
          .query("memberships")
          .withIndex("by_match_and_role", (q) =>
            q.eq("matchId", match._id).eq("role", "roster"),
          )
          .take(200);

        return {
          matchId: match._id,
          startsAt: match.startsAt,
          court: match.court,
          format: match.format,
          level: match.level,
          maxMembers: match.maxMembers,
          rosterCount: roster.filter((m) => !m.isDeleted).length,
        };
      }),
    );
  },
});

// The current player's own match history — past matches they had a live
// (roster or waitlist) membership in, most recent first.
export const listMyHistory = query({
  args: {},
  handler: async (ctx) => {
    // Graceful-degrade on a transient auth race (see players.listAll).
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    if (!player) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .take(200);

    const now = Date.now();
    const withMatch = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map(async (m) => {
          const match = await ctx.db.get("matches", m.matchId);
          return { membership: m, match };
        }),
    );

    const past: { membership: Doc<"memberships">; match: Doc<"matches"> }[] = [];
    for (const row of withMatch) {
      if (row.match && !row.match.isDeleted && row.match.startsAt < now) {
        past.push({ membership: row.membership, match: row.match });
      }
    }

    return past.sort((a, b) => b.match.startsAt - a.match.startsAt);
  },
});

// Distinct court/format/level values from recent matches, for the match
// form's autocomplete — database-backed (not the browser's own autofill),
// so a value entered on one device suggests on any other. No venue table
// in v1 (CLAUDE.md §7).
async function distinctFieldValues(
  ctx: QueryCtx,
  field: "court" | "format" | "level",
) {
  if (!(await requireAdminPlayer(ctx).catch(() => null))) return [];
  const matches = await ctx.db.query("matches").order("desc").take(200);
  return [...new Set(matches.map((m) => m[field]))];
}

export const listCourtHistory = query({
  args: {},
  handler: (ctx) => distinctFieldValues(ctx, "court"),
});

export const listFormatHistory = query({
  args: {},
  handler: (ctx) => distinctFieldValues(ctx, "format"),
});

export const listLevelHistory = query({
  args: {},
  handler: (ctx) => distinctFieldValues(ctx, "level"),
});

// Admin dashboard calendar heatmap + trend charts — every non-deleted match
// (past or future) with its roster headcount, so the client can bucket by
// day (a day with several tournaments sums to one heatmap cell) and by
// week/month for the trend charts. Bounded take(); a community-scale
// history fits comfortably under this without needing pagination yet.
export const listAllForCalendar = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdminPlayer(ctx).catch(() => null))) return [];

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_isDeleted_startsAt", (q) => q.eq("isDeleted", false))
      .order("desc")
      .take(500);

    return await Promise.all(
      matches.map(async (match) => {
        const roster = await ctx.db
          .query("memberships")
          .withIndex("by_match_and_role", (q) =>
            q.eq("matchId", match._id).eq("role", "roster"),
          )
          .take(200);

        return {
          matchId: match._id,
          startsAt: match.startsAt,
          court: match.court,
          format: match.format,
          maxMembers: match.maxMembers,
          rosterCount: roster.filter((m) => !m.isDeleted).length,
        };
      }),
    );
  },
});

// A specific player's match history — same shape as listMyHistory, but for
// an admin looking up any player (the dedicated player profile page).
export const listHistoryForPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    // Graceful-degrade on a transient auth race (see players.listAll).
    if (!(await requireAdminPlayer(ctx).catch(() => null))) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .take(200);

    const now = Date.now();
    const withMatch = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map(async (m) => {
          const match = await ctx.db.get("matches", m.matchId);
          return { membership: m, match };
        }),
    );

    const past: { membership: Doc<"memberships">; match: Doc<"matches"> }[] = [];
    for (const row of withMatch) {
      if (row.match && !row.match.isDeleted && row.match.startsAt < now) {
        past.push({ membership: row.membership, match: row.match });
      }
    }

    return past.sort((a, b) => b.match.startsAt - a.match.startsAt);
  },
});

// Admin-only complement to listHistoryForPlayer — matches this player was
// on the ROSTER for but got flagged as a no-show (memberships.setNoShow),
// surfaced on the admin player-profile page so an admin can see attendance
// reliability at a glance. Not shown on the public profile.
export const listNoShowsForPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    if (!(await requireAdminPlayer(ctx).catch(() => null))) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .take(200);

    const withMatch = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted && m.role === "roster" && m.noShow)
        .map(async (m) => {
          const match = await ctx.db.get("matches", m.matchId);
          return { membership: m, match };
        }),
    );

    return withMatch
      .filter(
        (row): row is { membership: Doc<"memberships">; match: Doc<"matches"> } =>
          !!row.match && !row.match.isDeleted,
      )
      .sort((a, b) => b.match.startsAt - a.match.startsAt);
  },
});

// Attended-match calendar data — public, same "shareable profile" design as
// players.getPublicProfile: reveals only dates and a same-day match count,
// nothing about who else played or match details. Backs the GitHub-style
// activity calendar (MatchCalendarHeatmap) on both the admin player-profile
// page and the public profile page. "Attended" = roster (not waitlist),
// the match already happened, and not flagged noShow (everyone defaults to
// attended — see schema.ts).
export const getAttendedMatchDays = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get("players", playerId);
    if (!player || player.isDeleted) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .take(500);

    const now = Date.now();
    const withMatch = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted && m.role === "roster" && !m.noShow)
        .map(async (m) => await ctx.db.get("matches", m.matchId)),
    );

    return withMatch
      .filter((match): match is Doc<"matches"> => !!match && !match.isDeleted && match.startsAt < now)
      .map((match) => ({ startsAt: match.startsAt, rosterCount: 1 }));
  },
});

// Bot command support — "/matches": every open (upcoming, published)
// match, same data the board already shows. internalQuery (not exposed to
// the browser) since the bot resolves "who's asking" from the Telegram
// update, not a web session.
export const listOpenForBotCommand = internalQuery({
  args: {},
  handler: async (ctx) => {
    const matches = (
      await ctx.db
        .query("matches")
        .withIndex("by_isDeleted_startsAt", (q) =>
          q.eq("isDeleted", false).gte("startsAt", Date.now()),
        )
        .order("asc")
        .take(20)
    ).filter((m) => m.isPublished);

    return await Promise.all(
      matches.map(async (match) => {
        const roster = await ctx.db
          .query("memberships")
          .withIndex("by_match_and_role", (q) =>
            q.eq("matchId", match._id).eq("role", "roster"),
          )
          .take(200);
        return { match, rosterCount: roster.filter((m) => !m.isDeleted).length };
      }),
    );
  },
});

// Bot command support — "/my": every match (past + upcoming, roster or
// waitlist) the calling Telegram user has a live membership in, newest
// first. Resolves the player from telegramUserId (bot context has no web
// session to derive it from), unlike the dashboard's listMyHistory.
export const listHistoryForTelegramUser = internalQuery({
  args: { telegramUserId: v.number() },
  handler: async (ctx, { telegramUserId }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", telegramUserId))
      .unique();
    if (!player) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .take(200);

    const withMatch = await Promise.all(
      memberships
        .filter((m) => !m.isDeleted)
        .map(async (m) => ({ membership: m, match: await ctx.db.get("matches", m.matchId) })),
    );

    return withMatch
      .filter(
        (row): row is { membership: Doc<"memberships">; match: Doc<"matches"> } =>
          !!row.match && !row.match.isDeleted,
      )
      .sort((a, b) => b.match.startsAt - a.match.startsAt);
  },
});
