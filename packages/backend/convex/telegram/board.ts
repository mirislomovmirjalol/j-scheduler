import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { renderBoard } from "../lib/board";
import { callTelegramApi, TelegramApiError } from "./api";

// Recomputes the board from open matches and edits it in place, or posts a
// fresh message if there's no live board yet (or the old one is gone).
// Called after any match create/edit/join/leave.
//
// force=true skips the edit attempt and always deletes-and-reposts at the
// bottom instead — used by the burial repost (Milestone 6) and by the
// admin's manual "repost to group" action, since Telegram doesn't push a
// notification for edited messages, only new ones.
export const syncBoard = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const chatIdEnv = process.env.TELEGRAM_CHAT_ID;
    if (!chatIdEnv) {
      console.error("TELEGRAM_CHAT_ID is not set; skipping board sync");
      return;
    }
    const chatId = Number(chatIdEnv);

    const [matches, settings] = await Promise.all([
      ctx.runQuery(internal.matches.listOpenWithRosterCounts, {}),
      ctx.runQuery(internal.communitySettings.getInternal, {}),
    ]);
    const { text, buttons } = renderBoard(matches, settings?.paymentInfo);

    const board = await ctx.runQuery(internal.boardState.get, { chatId });

    if (board?.messageId && !force) {
      try {
        await callTelegramApi("editMessageText", {
          chat_id: chatId,
          message_id: board.messageId,
          text,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: buttons },
        });
        return;
      } catch (err) {
        // Identical re-edit — nothing to do.
        if (
          err instanceof TelegramApiError &&
          err.description.includes("message is not modified")
        ) {
          return;
        }
        // Message may be gone (deleted, or >48h old and un-editable) —
        // fall through and repost fresh below.
        console.error("editMessageText failed, reposting board", err);
      }
    }

    if (board?.messageId && force) {
      try {
        await callTelegramApi("deleteMessage", {
          chat_id: chatId,
          message_id: board.messageId,
        });
      } catch (err) {
        // Bot may lack delete rights, or the message is >48h old — degrade
        // gracefully (CLAUDE.md #6), just post the fresh one below.
        console.error("deleteMessage failed, posting fresh board anyway", err);
      }
    }

    const sent = await callTelegramApi<{ message_id: number }>(
      "sendMessage",
      {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      },
    );

    await ctx.runMutation(internal.boardState.setMessage, {
      chatId,
      messageId: sent.message_id,
    });
  },
});
