import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

const RETENTION_MS = 24 * 60 * 60 * 1000;
const PRUNE_BATCH_SIZE = 200;

// Telegram retries webhooks on any non-200, so every update_id must be
// recorded before we act on it. Returns false for a duplicate delivery.
export const recordIfNew = internalMutation({
  args: { updateId: v.number() },
  handler: async (ctx, { updateId }) => {
    const existing = await ctx.db
      .query("processedUpdates")
      .withIndex("by_updateId", (q) => q.eq("updateId", updateId))
      .unique();
    if (existing) return false;

    await ctx.db.insert("processedUpdates", {
      updateId,
      processedAt: Date.now(),
    });
    return true;
  },
});

// Rows are inserted in increasing processedAt order, so scanning
// oldest-first and stopping at the first still-fresh row avoids a full scan.
export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    const rows = await ctx.db
      .query("processedUpdates")
      .order("asc")
      .take(PRUNE_BATCH_SIZE);

    for (const row of rows) {
      if (row.processedAt >= cutoff) break;
      await ctx.db.delete(row._id);
    }
  },
});
