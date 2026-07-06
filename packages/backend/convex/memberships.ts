import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { findOrCreatePlayerFromTelegram, requireAdminPlayer } from "./players";

// The Join button on the board. Auto-creates the player (without opting
// them into DMs — see players.ts) and puts them on the roster if there's
// room, else the waitlist. The capacity check happens INSIDE this mutation
// so it's race-safe: Convex mutations are serializable, so two simultaneous
// taps for the last seat resolve deterministically — first commit wins the
// seat, the other lands on the waitlist (CLAUDE.md #6).
export const joinMatch = internalMutation({
  args: {
    matchId: v.id("matches"),
    telegramUserId: v.number(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get("matches", args.matchId);
    if (!match || match.isDeleted) {
      return { outcome: "match_gone" as const, alreadyJoined: false };
    }

    const player = await findOrCreatePlayerFromTelegram(ctx, args);

    // Guard double-join: a live membership for this match+player already
    // exists, so re-tapping Join is a no-op that just reports current state.
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", player._id),
      )
      .unique();

    if (existing && !existing.isDeleted) {
      return { outcome: existing.role, alreadyJoined: true };
    }

    const rosterCount = (
      await ctx.db
        .query("memberships")
        .withIndex("by_match_and_role", (q) =>
          q.eq("matchId", args.matchId).eq("role", "roster"),
        )
        .take(200)
    ).filter((m) => !m.isDeleted).length;

    const role = rosterCount < match.maxMembers ? "roster" : "waitlist";

    if (existing) {
      // Resurrect a previously soft-deleted membership (e.g. they left and
      // are rejoining) rather than inserting a second row for the pair.
      await ctx.db.patch("memberships", existing._id, {
        role,
        isDeleted: false,
        joinedAt: Date.now(),
        addedBy: "self",
      });
    } else {
      await ctx.db.insert("memberships", {
        matchId: args.matchId,
        playerId: player._id,
        role,
        joinedAt: Date.now(),
        addedBy: "self",
        isDeleted: false,
      });
    }

    return { outcome: role, alreadyJoined: false };
  },
});

// Self-serve drop, reached from the Drop button on a reminder DM (never
// from the public board — v1's roster removal there stays admin-only).
// Frees the seat; does NOT auto-promote the next waitlisted player, since
// waitlist promotion is admin-only in v1.
export const dropMatch = internalMutation({
  args: { matchId: v.id("matches"), telegramUserId: v.number() },
  handler: async (ctx, { matchId, telegramUserId }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_telegramUserId", (q) =>
        q.eq("telegramUserId", telegramUserId),
      )
      .unique();
    if (!player) return { outcome: "not_a_member" as const };

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", matchId).eq("playerId", player._id),
      )
      .unique();

    if (!existing || existing.isDeleted) {
      return { outcome: "not_a_member" as const };
    }

    await ctx.db.patch("memberships", existing._id, { isDeleted: true });

    // A roster departure frees a seat — tell the waitlist. (A waitlist
    // departure frees nothing meaningful, so no notification there.)
    if (existing.role === "roster") {
      await ctx.scheduler.runAfter(0, internal.telegram.notify.extraSeatsOpened, {
        matchId,
      });
    }

    return { outcome: existing.role };
  },
});

// Admin removes anyone (roster or waitlist) from a match — dashboard roster
// management. Does not auto-promote the next waitlisted player; that's a
// separate explicit action (promoteFromWaitlist).
export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    await requireAdminPlayer(ctx);
    await ctx.db.patch("memberships", membershipId, { isDeleted: true });
    await ctx.scheduler.runAfter(0, internal.telegram.notify.membershipChanged, {
      membershipId,
      kind: "removed",
    });
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Admin promotes a specific waitlisted player to the roster. Capacity is
// re-checked here (not just trusted from the UI) since the roster may have
// changed since the dashboard last loaded.
export const promoteFromWaitlist = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    await requireAdminPlayer(ctx);

    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.isDeleted || membership.role !== "waitlist") {
      throw new Error("Not a waitlisted membership");
    }

    const match = await ctx.db.get("matches", membership.matchId);
    if (!match || match.isDeleted) throw new Error("Match not found");

    const rosterCount = (
      await ctx.db
        .query("memberships")
        .withIndex("by_match_and_role", (q) =>
          q.eq("matchId", membership.matchId).eq("role", "roster"),
        )
        .take(200)
    ).filter((m) => !m.isDeleted).length;

    if (rosterCount >= match.maxMembers) {
      throw new Error("Match is already full");
    }

    await ctx.db.patch("memberships", membershipId, { role: "roster" });
    await ctx.scheduler.runAfter(0, internal.telegram.notify.membershipChanged, {
      membershipId,
      kind: "promoted",
    });
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Admin quick-add-guest flow: creates the guest player row and joins them to
// this match in one step, following the same roster/waitlist capacity logic
// as a self-serve join (CLAUDE.md Golden Rule 6: guests are first-class
// player rows, never a string on a membership).
export const addGuestToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    firstName: v.string(),
    guestNote: v.optional(v.string()),
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminPlayer(ctx);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match || match.isDeleted) throw new Error("Match not found");

    const guestId = await ctx.db.insert("players", {
      type: "guest",
      telegramUserId: null,
      firstName: args.firstName,
      guestNote: args.guestNote,
      level: args.level,
      isAdmin: false,
      wantsDms: false,
      isDeleted: false,
      createdAt: Date.now(),
    });

    const rosterCount = (
      await ctx.db
        .query("memberships")
        .withIndex("by_match_and_role", (q) =>
          q.eq("matchId", args.matchId).eq("role", "roster"),
        )
        .take(200)
    ).filter((m) => !m.isDeleted).length;

    const role = rosterCount < match.maxMembers ? "roster" : "waitlist";

    await ctx.db.insert("memberships", {
      matchId: args.matchId,
      playerId: guestId,
      role,
      joinedAt: Date.now(),
      addedBy: { admin: admin._id },
      isDeleted: false,
    });

    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
    return guestId;
  },
});

// Resolves a membership's player + match in one shot — used by
// telegram/notify.ts's membershipChanged to DM the affected player after an
// admin removes or promotes them. Works even after removeMember has already
// patched isDeleted: true, since the membership row itself still exists.
export const getWithPlayerAndMatch = internalQuery({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership) return null;

    const [player, match] = await Promise.all([
      ctx.db.get("players", membership.playerId),
      ctx.db.get("matches", membership.matchId),
    ]);

    return { membership, player, match };
  },
});
