import { internalMutation } from "./_generated/server";

// One-off reset: wipes every match, membership, board message pointer,
// reminder job, and dedup/login-request row — keeps only players with
// isAdmin: true (deletes every other player row, guests included).
//
// internalMutation (not exposed to any client/session) since this is a
// maintenance operation run directly via the CLI, not something reachable
// through the dashboard or bot — there's no end-user auth identity to
// check against in that context anyway.
//
// Run with: bunx convex run maintenance:wipeAllDataKeepAdmins --prod
// (drop --prod to run against dev instead).
//
// .collect() (not the usual bounded take()) is deliberate here: this is a
// one-off full wipe, not a hot-path query pattern — it genuinely needs
// every row in each table, not a capped sample.
export const wipeAllDataKeepAdmins = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Cancel pending reminder jobs before deleting their rows — otherwise
    // an already-scheduled T-3h/T-30m job fires later for a match that no
    // longer exists.
    const reminders = await ctx.db.query("matchReminders").collect();
    for (const reminder of reminders) {
      if (reminder.jobId) {
        await ctx.scheduler.cancel(reminder.jobId);
      }
      await ctx.db.delete("matchReminders", reminder._id);
    }

    for (const table of [
      "matches",
      "memberships",
      "boardState",
      "processedUpdates",
      "webLoginRequests",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(table, row._id);
      }
    }

    const players = await ctx.db.query("players").collect();
    let deletedPlayers = 0;
    for (const player of players) {
      if (!player.isAdmin) {
        await ctx.db.delete("players", player._id);
        deletedPlayers++;
      }
    }

    return {
      remindersCancelled: reminders.length,
      playersDeleted: deletedPlayers,
      playersKept: players.length - deletedPlayers,
    };
  },
});
