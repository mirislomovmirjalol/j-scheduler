import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { strings } from "../lib/strings";
import { callTelegramApi } from "./api";

export const handleMessage = internalAction({
  args: { message: v.any() },
  handler: async (ctx, { message }) => {
    const chat = message.chat;
    const text: string | undefined = message.text;
    const from = message.from;

    // /start only makes sense as a DM opt-in; group messages fall through.
    if (chat?.type === "private" && text?.startsWith("/start") && from?.id) {
      const { alreadySubscribed } = await ctx.runMutation(
        internal.players.upsertFromTelegramStart,
        {
          telegramUserId: from.id,
          firstName: from.first_name ?? "",
          lastName: from.last_name ?? undefined,
          username: from.username ?? undefined,
        },
      );
      await callTelegramApi("sendMessage", {
        chat_id: chat.id,
        text: alreadySubscribed
          ? strings.dmAlreadySubscribed
          : strings.dmWelcome,
      });
      return;
    }

    // Extension point for Milestone 4+ (admin commands).
    console.log("telegram message received, no handler yet", {
      chatId: chat?.id,
      text,
    });
  },
});

export const handleCallbackQuery = internalAction({
  args: { callbackQuery: v.any() },
  handler: async (ctx, { callbackQuery }) => {
    const id: string = callbackQuery.id;
    const data: string | undefined = callbackQuery.data;
    const from = callbackQuery.from;

    const joinMatch = data?.match(/^join:(.+)$/);
    const dropMatch = data?.match(/^drop:(.+)$/);

    if (!from?.id || (!joinMatch && !dropMatch)) {
      // Unrecognized button (or a superseded board from before a redeploy).
      await callTelegramApi("answerCallbackQuery", { callback_query_id: id });
      return;
    }

    // We answer *after* the mutation (not "ack first, then work") so the
    // toast can reflect the real outcome — Convex mutations are fast enough
    // (tens of ms) to stay well inside Telegram's ~15s ack window.
    try {
      if (joinMatch) {
        const result = await ctx.runMutation(internal.memberships.joinMatch, {
          matchId: joinMatch[1] as Id<"matches">,
          telegramUserId: from.id,
          firstName: from.first_name ?? "",
          lastName: from.last_name ?? undefined,
          username: from.username ?? undefined,
        });

        const text =
          result.outcome === "match_gone"
            ? strings.matchGone
            : result.outcome === "roster"
              ? result.alreadyJoined
                ? strings.alreadyOnRoster
                : strings.joinedRoster
              : result.alreadyJoined
                ? strings.alreadyOnWaitlist
                : strings.joinedWaitlist;

        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: id,
          text,
        });

        if (result.outcome !== "match_gone") {
          await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
        }
        return;
      }

      // dropMatch — reached from the Drop button on a reminder DM.
      const result = await ctx.runMutation(internal.memberships.dropMatch, {
        matchId: dropMatch![1] as Id<"matches">,
        telegramUserId: from.id,
      });

      await callTelegramApi("answerCallbackQuery", {
        callback_query_id: id,
        text:
          result.outcome === "not_a_member"
            ? strings.dropNotAMember
            : strings.dropped,
      });

      if (result.outcome !== "not_a_member") {
        await ctx.scheduler.runAfter(0, internal.telegram.board.syncBoard, {});
      }
    } catch (err) {
      console.error("callback_query handling failed", err);
      await callTelegramApi("answerCallbackQuery", {
        callback_query_id: id,
        text: strings.genericError,
      });
    }
  },
});
