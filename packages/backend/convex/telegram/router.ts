import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { formatTashkentDateTime } from "../lib/time";
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

      // "/start <code>" — a deep-link login confirmation (see webLogin.ts).
      // Runs independently of, and in addition to, the DM opt-in above.
      const deepLinkCode = text.slice("/start".length).trim();
      if (deepLinkCode) {
        const result = await ctx.runMutation(internal.webLogin.confirm, {
          code: deepLinkCode,
          telegramUserId: from.id,
          firstName: from.first_name ?? "",
          lastName: from.last_name ?? undefined,
          username: from.username ?? undefined,
        });
        if (result.ok) {
          await callTelegramApi("sendMessage", {
            chat_id: chat.id,
            text: strings.webLoginConfirmed,
          });
          return;
        }
      }

      await callTelegramApi("sendMessage", {
        chat_id: chat.id,
        text: alreadySubscribed
          ? strings.dmAlreadySubscribed
          : strings.dmWelcome,
      });
      return;
    }

    // "/matches" — every open (upcoming, published) match, open to anyone,
    // in whatever chat it's asked in. Mirrors the board's own data.
    if (text?.startsWith("/matches") && chat?.id) {
      const matches = await ctx.runQuery(internal.matches.listOpenForBotCommand, {});
      if (matches.length === 0) {
        await callTelegramApi("sendMessage", { chat_id: chat.id, text: strings.noOpenMatches });
        return;
      }
      const lines = [
        strings.openMatchesHeader,
        "",
        ...matches.map(({ match, rosterCount }) =>
          strings.matchLine({
            dateTime: formatTashkentDateTime(match.startsAt),
            court: match.court,
            format: match.format,
            level: match.level,
            rosterCount,
            maxMembers: match.maxMembers,
          }),
        ),
      ];
      await callTelegramApi("sendMessage", { chat_id: chat.id, text: lines.join("\n") });
      return;
    }

    // "/my" — every match (past + upcoming, roster or waitlist) the caller
    // has a live membership in. Personal, so no scale/broadcast concern —
    // just a length cap on the reply itself.
    if (text?.startsWith("/my") && chat?.id && from?.id) {
      const history = await ctx.runQuery(internal.matches.listHistoryForTelegramUser, {
        telegramUserId: from.id,
      });
      if (history.length === 0) {
        await callTelegramApi("sendMessage", { chat_id: chat.id, text: strings.noPersonalMatches });
        return;
      }
      const now = Date.now();
      const SHOWN_LIMIT = 20;
      const shown = history.slice(0, SHOWN_LIMIT);
      const lines = [
        strings.myMatchesHeader,
        "",
        ...shown.map(({ match, membership }) =>
          strings.myMatchLine({
            dateTime: formatTashkentDateTime(match.startsAt),
            court: match.court,
            isPast: match.startsAt < now,
            role: membership.role,
          }),
        ),
      ];
      let text2 = lines.join("\n");
      if (history.length > SHOWN_LIMIT) {
        text2 += strings.myMatchesTruncated(SHOWN_LIMIT, history.length);
      }
      await callTelegramApi("sendMessage", { chat_id: chat.id, text: text2 });
      return;
    }

    // "/pay" — the community's payment details, works in the group AND in
    // DMs (unlike /start, which only makes sense as a DM). This is the
    // actual "stop asking in chat for the card number" fix.
    if (text?.startsWith("/pay") && chat?.id) {
      const settings = await ctx.runQuery(internal.communitySettings.getInternal, {});
      await callTelegramApi("sendMessage", {
        chat_id: chat.id,
        text: settings?.paymentInfo
          ? strings.paymentInfo(settings.paymentInfo)
          : strings.noPaymentInfo,
      });
      return;
    }

    // Extension point for future commands.
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
        const matchId = joinMatch[1] as Id<"matches">;

        // The board's single button is per-match, not per-state — its
        // label can't differ per viewer since it's one shared message.
        // Check the tapper's own current membership first, then dispatch:
        // already in (roster or waitlist) -> leave; otherwise -> join.
        const status = await ctx.runQuery(
          internal.memberships.getMembershipStatus,
          { matchId, telegramUserId: from.id },
        );

        if (status.isMember) {
          const result = await ctx.runMutation(internal.memberships.dropMatch, {
            matchId,
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
          return;
        }

        const result = await ctx.runMutation(internal.memberships.joinMatch, {
          matchId,
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
