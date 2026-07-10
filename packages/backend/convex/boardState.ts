import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { requireAdminPlayer } from "./players";

export const get = internalQuery({
  args: { chatId: v.number() },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("boardState")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .unique();
  },
});

// Records the board message just posted/reposted.
export const setMessage = internalMutation({
  args: { chatId: v.number(), messageId: v.number() },
  handler: async (ctx, { chatId, messageId }) => {
    const existing = await ctx.db
      .query("boardState")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .unique();

    if (existing) {
      await ctx.db.patch("boardState", existing._id, { messageId });
    } else {
      await ctx.db.insert("boardState", { chatId, messageId });
    }
  },
});

// Admin action: force a fresh repost of the board (delete + resend) rather
// than a silent in-place edit. Telegram doesn't notify group members on
// edited messages, only new ones — so this is how an admin actually pings
// the group after creating a match they want people to notice.
export const repostToGroup = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminPlayer(ctx);
    await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {
      force: true,
    });
  },
});
