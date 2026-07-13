import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdminPlayer, requireAuthedPlayer } from "./players";

// Single-row table — always take the first (only) row rather than querying
// by a key, same "small enough for a full scan" reasoning as `players`.
async function getRow(ctx: QueryCtx | MutationCtx) {
  return (await ctx.db.query("communitySettings").take(1))[0] ?? null;
}

// Any authed player can read this (not admin-only) — they're the ones who
// need to know where to send money.
export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthedPlayer(ctx);
    return await getRow(ctx);
  },
});

// Same read, no auth gate — used by the bot (board sync, /pay command),
// which resolves callers from the Telegram update, not a web session.
export const getInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getRow(ctx);
  },
});

export const setPaymentInfo = mutation({
  args: { paymentInfo: v.optional(v.string()) },
  handler: async (ctx, { paymentInfo }) => {
    const admin = await requireAdminPlayer(ctx);
    const existing = await getRow(ctx);

    if (existing) {
      await ctx.db.patch("communitySettings", existing._id, {
        paymentInfo,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("communitySettings", {
        paymentInfo,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }
  },
});
