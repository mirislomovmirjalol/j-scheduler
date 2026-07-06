import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { strings } from "../lib/strings";
import { formatTashkentDateTime } from "../lib/time";
import { sendDMText } from "./dm";

// Fires at T-3h / T-30m for a match. Sweeps the confirmed roster (opted-in
// only) with a throttled/sequential sender — one DM at a time, well under
// Telegram's rate limits at this community's scale (CLAUDE.md #6).
export const sendReminder = internalAction({
  args: {
    matchId: v.id("matches"),
    kind: v.union(v.literal("t_minus_3h"), v.literal("t_minus_30m")),
  },
  handler: async (ctx, { matchId, kind }) => {
    const match = await ctx.runQuery(internal.matches.getById, { matchId });
    if (match && !match.isDeleted) {
      const roster = await ctx.runQuery(internal.matches.listRosterPlayers, {
        matchId,
      });

      const text = strings.reminderText({
        kind,
        dateTime: formatTashkentDateTime(match.startsAt),
        court: match.court,
      });

      for (const player of roster) {
        if (!player.wantsDms || player.telegramUserId === null) continue;
        await sendDMText(ctx, {
          playerId: player._id,
          telegramUserId: player.telegramUserId,
          text,
          replyMarkup: {
            inline_keyboard: [
              [{ text: strings.dropButtonLabel, callback_data: `drop:${matchId}` }],
            ],
          },
        });
      }
    }

    await ctx.runMutation(internal.matchReminders.markFired, {
      matchId,
      kind,
    });
  },
});

// Cron-driven: logs loudly if any reminder that should have fired by now
// didn't. v1 "alerting" is just prominent function-log output — visible in
// the Convex dashboard — there's no external paging channel yet.
export const checkDeadManSwitch = internalAction({
  args: {},
  handler: async (ctx) => {
    const overdue = await ctx.runQuery(
      internal.matchReminders.listOverdueUnfired,
      {},
    );
    if (overdue.length > 0) {
      console.error(
        "DEAD MAN'S SWITCH: reminders overdue and never fired",
        overdue,
      );
    }
  },
});
