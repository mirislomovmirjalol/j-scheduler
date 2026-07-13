import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

// Bootstraps the first admin: the moment we see this Telegram id (via /start
// or Join), grant admin if it matches the seed env var. After that, admins
// grant admin from the dashboard (CLAUDE.md #8) — a no-op once isAdmin is
// already true.
function isSeedAdmin(telegramUserId: number): boolean {
  const seed = process.env.SEED_ADMIN_TELEGRAM_ID;
  return seed !== undefined && Number(seed) === telegramUserId;
}

type TelegramProfile = {
  telegramUserId: number;
  firstName: string;
  lastName?: string;
  username?: string;
};

// Find-or-create the authed player row for a Telegram user, refreshing their
// display info. Does NOT touch wantsDms — joining a match must never
// silently opt someone into DMs (CLAUDE.md Golden Rule 2). Only
// upsertFromTelegramStart flips that flag, since that's the explicit opt-in.
//
// Plain helper (not a registered mutation) so both upsertFromTelegramStart
// and memberships.joinMatch can call it directly from within their own
// transaction, per Convex guidance to avoid nested runMutation calls.
export async function findOrCreatePlayerFromTelegram(
  ctx: MutationCtx,
  profile: TelegramProfile,
): Promise<Doc<"players">> {
  const existing = await ctx.db
    .query("players")
    .withIndex("by_telegramUserId", (q) =>
      q.eq("telegramUserId", profile.telegramUserId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch("players", existing._id, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
      isAdmin: existing.isAdmin || isSeedAdmin(profile.telegramUserId),
    });
    return (await ctx.db.get("players", existing._id))!;
  }

  const playerId = await ctx.db.insert("players", {
    type: "authed",
    telegramUserId: profile.telegramUserId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
    isAdmin: isSeedAdmin(profile.telegramUserId),
    wantsDms: false,
    isDeleted: false,
    createdAt: Date.now(),
  });
  return (await ctx.db.get("players", playerId))!;
}

// /start in a DM: find-or-create the player, then explicitly opt them into
// DMs. Returns whether they were already subscribed, so the caller can
// reply with the right string (welcome vs. "already subscribed").
export const upsertFromTelegramStart = internalMutation({
  args: {
    telegramUserId: v.number(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await findOrCreatePlayerFromTelegram(ctx, args);
    const alreadySubscribed = player.wantsDms;
    if (!alreadySubscribed) {
      await ctx.db.patch("players", player._id, { wantsDms: true });
    }
    return { alreadySubscribed };
  },
});

// Flips DM opt-in off. Used when a Bot API send comes back 403 (user never
// /start'ed, or blocked the bot) — CLAUDE.md #6 DM 403 handling.
export const setWantsDms = internalMutation({
  args: { playerId: v.id("players"), wantsDms: v.boolean() },
  handler: async (ctx, { playerId, wantsDms }) => {
    await ctx.db.patch("players", playerId, { wantsDms });
  },
});

// Self-serve counterpart to setWantsDms above — lets a player opt in/out of
// DM reminders from the web profile page, not just via the bot's /start.
// Patches the caller's OWN row (derived from auth), never a client-supplied
// playerId.
export const setWantsDmsSelf = mutation({
  args: { wantsDms: v.boolean() },
  handler: async (ctx, { wantsDms }) => {
    const player = await requireAuthedPlayer(ctx);
    await ctx.db.patch("players", player._id, { wantsDms });
  },
});

// Called from signInAsTelegramUser (auth/signInHelpers.ts), shared by every
// Telegram sign-in method's endpoint (deep-link, Mini App), right after
// better-auth resolves/creates a user for a verified Telegram identity.
// Links (or creates) the player row for that Telegram id to the better-auth
// user, so ctx.auth.getUserIdentity() can resolve back to a player on every
// later dashboard request. Runs on every login (not just first), so it also
// refreshes display info.
export const upsertFromAuthUser = internalMutation({
  args: {
    authUserId: v.string(),
    telegramUserId: v.number(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await findOrCreatePlayerFromTelegram(ctx, args);
    await ctx.db.patch("players", player._id, { authUserId: args.authUserId });
  },
});

// The canonical "who am I" query for the dashboard — resolves the caller's
// player row via their verified auth identity, not a client-supplied id.
export const getCurrentPlayer = query({
  args: {},
  handler: async (ctx) => {
    const player = await requireAuthedPlayer(ctx).catch(() => null);
    return player;
  },
});

// Resolves the caller's player row from ctx.auth, or throws. Every
// dashboard mutation/query that needs "who's asking" should go through
// this rather than trusting a client-supplied id (Convex guideline: never
// accept a userId as an arg for authorization).
export async function requireAuthedPlayer(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"players">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const player = await ctx.db
    .query("players")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique();

  if (!player || player.isDeleted) throw new Error("Not authenticated");
  return player;
}

export async function requireAdminPlayer(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"players">> {
  const player = await requireAuthedPlayer(ctx);
  if (!player.isAdmin) throw new Error("Not authorized");
  return player;
}

// Player management page — every non-deleted player, both types. Bounded
// take() rather than unbounded collect(); a community-scale roster fits
// comfortably under this.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    // Graceful-degrade like getCurrentPlayer: a transient JWT-refresh race
    // (Convex's client refreshes its short-lived auth token on a timer that
    // can miss its window in a backgrounded tab) can make
    // ctx.auth.getUserIdentity() briefly return null for an otherwise-valid
    // admin session. The query should self-heal on the next reactive
    // re-run rather than crash the page.
    const admin = await requireAdminPlayer(ctx).catch(() => null);
    if (!admin) return [];
    const players = await ctx.db.query("players").order("desc").take(500);
    return players.filter((p) => !p.isDeleted);
  },
});

// Backs the "add existing member" search in the match detail page — a
// substring match over name/username, not a real search index. Fine at
// community scale (same take(500) bound as listAll); revisit if the roster
// ever grows large enough for this to matter.
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    if (!(await requireAdminPlayer(ctx).catch(() => null))) return [];

    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];

    const players = await ctx.db.query("players").order("desc").take(500);
    return players
      .filter((p) => !p.isDeleted && p.type === "authed")
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(needle) ||
          p.lastName?.toLowerCase().includes(needle) ||
          p.username?.toLowerCase().includes(needle),
      )
      .slice(0, 20);
  },
});

// Player profile page (admin-only lookup of any player).
export const getById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    if (!(await requireAdminPlayer(ctx).catch(() => null))) return null;
    const player = await ctx.db.get("players", playerId);
    if (!player || player.isDeleted) return null;
    return player;
  },
});

// Public, unauthenticated profile — deliberately name + level only, no
// Telegram username or other contact info (explicit privacy decision, same
// reasoning as matches.listPublicUpcoming's "no auth gate at all" caveat).
// Backs the shareable public profile page.
export const getPublicProfile = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get("players", playerId);
    if (!player || player.isDeleted) return null;
    return { firstName: player.firstName, lastName: player.lastName, level: player.level };
  },
});

export const updateLevel = mutation({
  args: { playerId: v.id("players"), level: v.optional(v.string()) },
  handler: async (ctx, { playerId, level }) => {
    await requireAdminPlayer(ctx);
    await ctx.db.patch("players", playerId, { level });
  },
});

export const setIsAdmin = mutation({
  args: { playerId: v.id("players"), isAdmin: v.boolean() },
  handler: async (ctx, { playerId, isAdmin }) => {
    await requireAdminPlayer(ctx);
    await ctx.db.patch("players", playerId, { isAdmin });
  },
});

export const softDeletePlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    await requireAdminPlayer(ctx);
    await ctx.db.patch("players", playerId, { isDeleted: true });
  },
});
