import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

const REMINDER_KIND = v.union(
  v.literal("t_minus_3h"),
  v.literal("t_minus_30m"),
);

const REMINDER_LEADS = [
  { kind: "t_minus_3h" as const, leadMs: 3 * 60 * 60 * 1000 },
  { kind: "t_minus_30m" as const, leadMs: 30 * 60 * 1000 },
];

// Marks a reminder job as fired instead of deleting it, so the
// dead-man's-switch can tell "fired" apart from "never scheduled".
export const markFired = internalMutation({
  args: { matchId: v.id("matches"), kind: REMINDER_KIND },
  handler: async (ctx, { matchId, kind }) => {
    const rows = await ctx.db
      .query("matchReminders")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .take(10);
    const row = rows.find((r) => r.kind === kind);
    if (row) {
      await ctx.db.patch("matchReminders", row._id, { firedAt: Date.now() });
    }
  },
});

// Finds reminders that are past due (their fire time has already passed for
// a match that hasn't started yet) but have no firedAt — i.e. a real
// silent failure, not just "not due yet" (CLAUDE.md #9 dead-man's-switch).
export const listOverdueUnfired = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    const upcoming = await ctx.db
      .query("matches")
      .withIndex("by_isDeleted_startsAt", (q) =>
        q.eq("isDeleted", false).gte("startsAt", now).lte("startsAt", horizon),
      )
      .take(100);

    const overdue: { matchId: Id<"matches">; kind: "t_minus_3h" | "t_minus_30m" }[] =
      [];

    for (const match of upcoming) {
      const reminders = await ctx.db
        .query("matchReminders")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .take(10);

      for (const { kind, leadMs } of REMINDER_LEADS) {
        const dueAt = match.startsAt - leadMs;
        if (dueAt > now) continue; // not due yet
        const row = reminders.find((r) => r.kind === kind);
        if (!row || row.firedAt === undefined) {
          overdue.push({ matchId: match._id, kind });
        }
      }
    }

    return overdue;
  },
});

const FIRED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const pruneFired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - FIRED_RETENTION_MS;
    const rows = await ctx.db.query("matchReminders").take(200);
    for (const row of rows) {
      if (row.firedAt !== undefined && row.firedAt < cutoff) {
        await ctx.db.delete("matchReminders", row._id);
      }
    }
  },
});
