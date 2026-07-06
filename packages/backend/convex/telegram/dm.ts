import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { callTelegramApi, TelegramApiError } from "./api";

// Sends a DM to a player. A 403 means they never /start'ed the bot, or have
// since blocked it — swallow it and flip wantsDms off so we stop trying
// (CLAUDE.md #6 DM 403 handling). Returns whether the send succeeded.
//
// Exported as a plain function (not just the action below) so other actions
// in this runtime can call it directly instead of paying for an
// action-to-action ctx.runAction hop.
export async function sendDMText(
  ctx: ActionCtx,
  args: {
    playerId: Id<"players">;
    telegramUserId: number;
    text: string;
    replyMarkup?: unknown;
  },
): Promise<boolean> {
  try {
    await callTelegramApi("sendMessage", {
      chat_id: args.telegramUserId,
      text: args.text,
      reply_markup: args.replyMarkup,
    });
    return true;
  } catch (err) {
    if (err instanceof TelegramApiError && err.errorCode === 403) {
      await ctx.runMutation(internal.players.setWantsDms, {
        playerId: args.playerId,
        wantsDms: false,
      });
      return false;
    }
    throw err;
  }
}

// Scheduler-callable wrapper around sendDMText, for call sites that only
// have a FunctionReference to work with (e.g. ctx.scheduler.runAfter).
export const sendDM = internalAction({
  args: {
    playerId: v.id("players"),
    telegramUserId: v.number(),
    text: v.string(),
  },
  handler: async (ctx, args) => sendDMText(ctx, args),
});
