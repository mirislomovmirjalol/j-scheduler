import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";

// One row per match with a live Telegram message — see schema.ts for the
// shape. Looked up before every sync so we know whether to edit-in-place or
// post fresh.
export const getByMatch = internalQuery({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    return await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique();
  },
});

// Indexed lookup for the "unpin started matches" cron — matchBoardMessages
// grows without bound over a community's lifetime (rows only ever removed
// on cancel), so this can't be a take(N)+filter scan: past some table size
// that would stop seeing the (necessarily recent) pinned row entirely. At
// most one row is ever pinned in practice (see telegram/matchBoard.ts), so
// `.collect()` on the indexed match is safe.
export const listPinned = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_pinned", (q) => q.eq("pinned", true))
      .collect();
  },
});

// Records the message just posted/reposted/edited for a match.
export const upsert = internalMutation({
  args: {
    matchId: v.id("matches"),
    chatId: v.number(),
    messageId: v.number(),
    pinned: v.boolean(),
  },
  handler: async (ctx, { matchId, chatId, messageId, pinned }) => {
    const existing = await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique();

    if (existing) {
      await ctx.db.patch("matchBoardMessages", existing._id, { chatId, messageId, pinned });
    } else {
      await ctx.db.insert("matchBoardMessages", { matchId, chatId, messageId, pinned });
    }
  },
});

// The match's message is gone (cancelled/deleted match) — drop the row so a
// future publish of a different match doesn't confuse itself with stale
// tracking data.
export const remove = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const existing = await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique();
    if (existing) await ctx.db.delete("matchBoardMessages", existing._id);
  },
});

// Admin patches pinned:false after the "unpin started matches" cron
// successfully unpins — see telegram/matchBoard.ts.
export const setPinned = internalMutation({
  args: { matchId: v.id("matches"), pinned: v.boolean() },
  handler: async (ctx, { matchId, pinned }) => {
    const existing = await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique();
    if (existing) await ctx.db.patch("matchBoardMessages", existing._id, { pinned });
  },
});

// Called right after telegram/matchBoard.ts displaces the previously pinned
// match (via getChat + a targeted unpinChatMessage — see that file), so our
// own bookkeeping doesn't keep saying pinned:true for a match Telegram no
// longer has pinned. Indexed — same rationale as listPinned.
export const clearAllPinned = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("matchBoardMessages")
      .withIndex("by_pinned", (q) => q.eq("pinned", true))
      .collect();
    for (const row of rows) {
      await ctx.db.patch("matchBoardMessages", row._id, { pinned: false });
    }
  },
});

// Guards every FORCE repost (matches.publishMatch, repostMatchToGroup,
// repostAllToGroup) — see schema.ts's boardRepostLock comment. A stale lock
// (crashed run that never released) is ignored past this timeout rather
// than wedging every repost button forever; generously longer than any real
// paced repost should ever take.
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Thrown as ConvexError (not a plain Error) specifically so its message
// actually reaches the client — Convex replaces a plain Error's message
// with a generic one on the wire by default; ConvexError's `.data` survives
// the trip. The admin UI checks for this to show "please wait" instead of a
// generic failure toast.
export async function acquireBoardRepostLock(ctx: MutationCtx) {
  const existing = await ctx.db.query("boardRepostLock").first();
  const now = Date.now();
  if (existing?.inProgress && now - existing.startedAt < LOCK_TIMEOUT_MS) {
    throw new ConvexError("Рассылка уже выполняется, подожди немного и попробуй снова");
  }
  if (existing) {
    await ctx.db.patch("boardRepostLock", existing._id, { inProgress: true, startedAt: now });
  } else {
    await ctx.db.insert("boardRepostLock", { inProgress: true, startedAt: now });
  }
}

// Called once the force-repost action that acquired the lock is fully done
// (success or failure) — see telegram/matchBoard.ts's syncMatchMessage and
// repostAllMatches, both of which release in a finally block.
export const releaseBoardRepostLock = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("boardRepostLock").first();
    if (existing) await ctx.db.patch("boardRepostLock", existing._id, { inProgress: false });
  },
});

// Read before every force-repost's sendMessage call so it can pace itself
// against the LAST send from ANY force-repost — whether that was a bulk
// loop iteration or a separate single publish/repost — not just other sends
// within the same action call. See telegram/matchBoard.ts.
export const getLastSentAt = internalQuery({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("boardRepostLock").first();
    return existing?.lastSentAt;
  },
});

export const recordGroupSent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("boardRepostLock").first();
    if (existing) await ctx.db.patch("boardRepostLock", existing._id, { lastSentAt: Date.now() });
  },
});
