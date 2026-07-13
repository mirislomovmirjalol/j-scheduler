import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import {
  findOrCreatePlayerFromTelegram,
  requireAdminPlayer,
  requireAuthedPlayer,
} from "./players";

// Shared by every "leave" path (bot self-drop, web self-serve leave, admin
// removal) — Golden Rule 1: one write path regardless of trigger. Records
// who actually dropped the membership (mirrors addedBy) so the admin
// dashboard can show a "who cancelled" list of genuine self-drops, distinct
// from admin cleanup.
async function dropMembership(
  ctx: MutationCtx,
  membership: Doc<"memberships">,
  removedBy: "self" | { admin: Id<"players"> },
) {
  await ctx.db.patch("memberships", membership._id, {
    isDeleted: true,
    removedBy,
  });

  // A roster departure frees a seat — tell the waitlist, regardless of who
  // triggered it. (A waitlist departure frees nothing meaningful.)
  if (membership.role === "roster") {
    await ctx.scheduler.runAfter(0, internal.telegram.notify.extraSeatsOpened, {
      matchId: membership.matchId,
    });
  }
}

// Shared by every "join" path (bot self-serve, web self-serve, admin
// add-existing-player) — Golden Rule 1 again. The capacity check happens
// INSIDE this function so it's race-safe regardless of caller: Convex
// mutations are serializable, so two simultaneous joins for the last seat
// resolve deterministically. Resurrects a previously soft-deleted
// membership (rejoining after having left) rather than inserting a second
// row for the same match+player pair.
async function joinOrResurrectMembership(
  ctx: MutationCtx,
  matchId: Id<"matches">,
  playerId: Id<"players">,
  addedBy: "self" | { admin: Id<"players"> },
): Promise<{ outcome: "roster" | "waitlist"; alreadyJoined: boolean }> {
  const match = await ctx.db.get("matches", matchId);
  if (!match || match.isDeleted) throw new Error("Match not found");

  const existing = await ctx.db
    .query("memberships")
    .withIndex("by_match_and_player", (q) =>
      q.eq("matchId", matchId).eq("playerId", playerId),
    )
    .unique();

  if (existing && !existing.isDeleted) {
    return { outcome: existing.role, alreadyJoined: true };
  }

  const rosterCount = (
    await ctx.db
      .query("memberships")
      .withIndex("by_match_and_role", (q) =>
        q.eq("matchId", matchId).eq("role", "roster"),
      )
      .take(200)
  ).filter((m) => !m.isDeleted).length;

  const role = rosterCount < match.maxMembers ? "roster" : "waitlist";

  if (existing) {
    await ctx.db.patch("memberships", existing._id, {
      role,
      isDeleted: false,
      joinedAt: Date.now(),
      addedBy,
    });
  } else {
    await ctx.db.insert("memberships", {
      matchId,
      playerId,
      role,
      joinedAt: Date.now(),
      addedBy,
      isDeleted: false,
    });
  }

  return { outcome: role, alreadyJoined: false };
}

// Board toggle support: resolves whether the tapper currently has a live
// membership for this match. Telegram's board is one shared message, so the
// button's label can't differ per viewer — only the tap's effect can. The
// router calls this first, then dispatches to joinMatch or dropMatch.
export const getMembershipStatus = internalQuery({
  args: { matchId: v.id("matches"), telegramUserId: v.number() },
  handler: async (ctx, { matchId, telegramUserId }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_telegramUserId", (q) =>
        q.eq("telegramUserId", telegramUserId),
      )
      .unique();
    if (!player) return { isMember: false as const };

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", matchId).eq("playerId", player._id),
      )
      .unique();

    if (!existing || existing.isDeleted) return { isMember: false as const };
    return { isMember: true as const, role: existing.role };
  },
});

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
    if (!match || match.isDeleted || !match.isPublished) {
      return { outcome: "match_gone" as const, alreadyJoined: false };
    }

    const player = await findOrCreatePlayerFromTelegram(ctx, args);
    const result = await joinOrResurrectMembership(ctx, args.matchId, player._id, "self");
    return result;
  },
});

// Self-serve join from the web dashboard — same effect as the bot's Join
// button (CLAUDE.md Golden Rule 1: same underlying assignment logic via
// joinOrResurrectMembership), just resolved via the authed session instead
// of a telegramUserId. A draft match stays unjoinable here too, same as the
// bot.
export const joinMatchSelf = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const player = await requireAuthedPlayer(ctx);

    const match = await ctx.db.get("matches", matchId);
    if (!match || match.isDeleted || !match.isPublished) {
      return { outcome: "match_gone" as const, alreadyJoined: false };
    }

    const result = await joinOrResurrectMembership(ctx, matchId, player._id, "self");
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
    return result;
  },
});

// Self-serve drop — reached from the Drop button on a reminder DM, and from
// the board's own toggle button (router.ts checks the tapper's membership
// state before deciding whether to call this or joinMatch). Frees the seat;
// does NOT auto-promote the next waitlisted player, since waitlist
// promotion is admin-only in v1.
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

    await dropMembership(ctx, existing, "self");
    return { outcome: existing.role };
  },
});

// Self-serve leave from the web dashboard — same effect as the bot's Drop
// button, just resolved via the authed session instead of a telegramUserId.
// Any player can drop their OWN membership; admins use removeMember for
// anyone else's.
export const leaveMatch = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const player = await requireAuthedPlayer(ctx);
    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.isDeleted) {
      throw new Error("Not a member");
    }
    if (membership.playerId !== player._id) {
      throw new Error("Not your membership");
    }

    await dropMembership(ctx, membership, "self");
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Admin removes anyone (roster or waitlist) from a match — dashboard roster
// management. Does not auto-promote the next waitlisted player; that's a
// separate explicit action (promoteFromWaitlist).
export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const admin = await requireAdminPlayer(ctx);

    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.isDeleted) throw new Error("Not a member");

    await dropMembership(ctx, membership, { admin: admin._id });
    await ctx.scheduler.runAfter(0, internal.telegram.notify.membershipChanged, {
      membershipId,
      kind: "removed",
    });
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
  },
});

// Admin flags (or unflags) a roster member as a no-show, after the fact.
// Only meaningful once the match has happened — everyone defaults to
// "attended" (see schema.ts), so this is purely a correction, not a
// check-in. No board sync / DM: this is a quiet record-keeping action, not
// a state change anyone else needs to be notified about.
export const setNoShow = mutation({
  args: { membershipId: v.id("memberships"), noShow: v.boolean() },
  handler: async (ctx, { membershipId, noShow }) => {
    await requireAdminPlayer(ctx);

    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.isDeleted) throw new Error("Not a member");
    if (membership.role !== "roster") {
      throw new Error("Only roster members can be flagged");
    }

    const match = await ctx.db.get("matches", membership.matchId);
    if (!match || match.startsAt >= Date.now()) {
      throw new Error("Match hasn't happened yet");
    }

    await ctx.db.patch("memberships", membershipId, { noShow });
  },
});

// Manual payment tracking (v1 — no gateway integration). Unlike setNoShow,
// not gated on the match having already happened: an admin should be able to
// mark payment collected any time before or after the game.
export const setPaid = mutation({
  args: { membershipId: v.id("memberships"), paid: v.boolean() },
  handler: async (ctx, { membershipId, paid }) => {
    await requireAdminPlayer(ctx);

    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.isDeleted) throw new Error("Not a member");
    if (membership.role !== "roster") {
      throw new Error("Only roster members can be flagged");
    }

    await ctx.db.patch("memberships", membershipId, { paid });
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

// Admin adds an already-registered player (found via players.search) to a
// match — same roster/waitlist capacity logic as addGuestToMatch, but for
// an existing player row instead of creating a guest. Idempotent: re-adding
// someone already on the match is a no-op that returns their current role,
// matching joinMatch's double-tap guard.
export const addExistingPlayerToMatch = mutation({
  args: { matchId: v.id("matches"), playerId: v.id("players") },
  handler: async (ctx, { matchId, playerId }) => {
    const admin = await requireAdminPlayer(ctx);

    const player = await ctx.db.get("players", playerId);
    if (!player || player.isDeleted) throw new Error("Player not found");

    const result = await joinOrResurrectMembership(ctx, matchId, playerId, {
      admin: admin._id,
    });
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
    return result;
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
