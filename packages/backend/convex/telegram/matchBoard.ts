import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, type ActionCtx } from "../_generated/server";
import { renderMatchMessage } from "../lib/matchMessage";
import { callTelegramApi, TelegramApiError } from "./api";

// Telegram's official Bot API FAQ caps a GROUP specifically at ~20 new
// messages per minute (separate from — and much stricter than — the 30/sec
// global limit and the 1/sec per-chat limit those numbers usually get
// quoted for). Every force-repost's sendMessage call — whether it came from
// a single publish/repost or one iteration of a bulk run — paces itself
// against the LAST group send (see matchBoardMessages.getLastSentAt/
// recordGroupSent) so a burst of individual actions can't trip this any
// more than the bulk loop can.
const GROUP_MESSAGE_PACING_MS = 3200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Displaces whatever's currently pinned (asked directly via getChat, not
// our own possibly-stale bookkeeping — see the comment where this is
// called from) and pins `messageId` in its place. Shared by syncMatchMessage
// (pins the message it just posted) and repostAllMatches (pins an
// already-posted message once per bulk run, rather than once per match).
async function pinMessage(
  ctx: ActionCtx,
  chatId: number,
  messageId: number,
): Promise<boolean> {
  try {
    const chat = await callTelegramApi<{ pinned_message?: { message_id: number } }>(
      "getChat",
      { chat_id: chatId },
    );
    const currentlyPinnedId = chat.pinned_message?.message_id;
    if (currentlyPinnedId !== undefined && currentlyPinnedId !== messageId) {
      // Best-effort — bot may lack pin rights (CLAUDE.md #6: degrade
      // gracefully, never throw into the user's face over this).
      try {
        await callTelegramApi("unpinChatMessage", {
          chat_id: chatId,
          message_id: currentlyPinnedId,
        });
      } catch (err) {
        console.error("unpinChatMessage failed while displacing old pin", err);
      }
    }
    await ctx.runMutation(internal.matchBoardMessages.clearAllPinned, {});
    await callTelegramApi("pinChatMessage", {
      chat_id: chatId,
      message_id: messageId,
      // Sound on purpose — the pinned match is meant to be the one thing
      // that actively grabs attention (this is a rare, deliberate admin
      // action now, not something that fires on every publish).
      disable_notification: false,
    });
    return true;
  } catch (err) {
    console.error("pinning failed, match message still posted fine", err);
    return false;
  }
}

// Sends `payload` into the group, first pacing against the last group send
// from ANY force-repost (see GROUP_MESSAGE_PACING_MS above), then records
// this send so the next caller — whatever triggers it — paces against it in
// turn.
async function sendPacedMessage(
  ctx: ActionCtx,
  payload: Record<string, unknown>,
): Promise<{ message_id: number }> {
  const lastSentAt = await ctx.runQuery(internal.matchBoardMessages.getLastSentAt, {});
  if (lastSentAt != null) {
    const waitMs = GROUP_MESSAGE_PACING_MS - (Date.now() - lastSentAt);
    if (waitMs > 0) await sleep(waitMs);
  }
  const sent = await callTelegramApi<{ message_id: number }>("sendMessage", payload);
  await ctx.runMutation(internal.matchBoardMessages.recordGroupSent, {});
  return sent;
}

// Recomputes ONE match's Telegram message from its current roster/waitlist
// and edits it in place, or posts a fresh message if there's no live one yet
// (or the old one is gone). Called after any create/publish/edit/cancel/
// join/leave for that match — each match owns its own message, so this
// never touches any other match's message (unlike the old combined-board
// syncBoard, which re-rendered everything on every event).
//
// force=true skips the edit attempt and always deletes-and-reposts at the
// bottom instead — used by publishMatch and the admin's manual/bulk repost
// actions, since Telegram doesn't push a notification for edited messages,
// only new ones. `pin` is only consulted when force=true: it lets the
// caller pin (or explicitly not pin) the freshly posted message.
//
// `releaseLock`: set to true ONLY by callers that themselves called
// matchBoardMessages.acquireBoardRepostLock before scheduling this action
// (matches.publishMatch, matches.repostMatchToGroup) — this action then
// releases it when done, success or failure. Left unset when called
// internally by repostAllMatches's loop, which holds the lock for the
// whole batch and releases it itself once every match is done.
export const syncMatchMessage = internalAction({
  args: {
    matchId: v.id("matches"),
    force: v.optional(v.boolean()),
    pin: v.optional(v.boolean()),
    releaseLock: v.optional(v.boolean()),
  },
  handler: async (ctx, { matchId, force, pin, releaseLock }) => {
    try {
      const chatIdEnv = process.env.TELEGRAM_CHAT_ID;
      if (!chatIdEnv) {
        console.error("TELEGRAM_CHAT_ID is not set; skipping match message sync");
        return;
      }
      const chatId = Number(chatIdEnv);
      // Optional: posts into a specific forum topic (e.g. "Игры") instead of
      // the group's default/General thread. Unset by default so non-forum
      // groups (or groups where this isn't configured) behave exactly as
      // before.
      const topicIdEnv = process.env.TELEGRAM_TOPIC_ID;
      const topicId = topicIdEnv ? Number(topicIdEnv) : undefined;

      const [match, existing] = await Promise.all([
        ctx.runQuery(internal.matches.getOpenWithRosterCountsById, { matchId }),
        ctx.runQuery(internal.matchBoardMessages.getByMatch, { matchId }),
      ]);

      // Match is cancelled/gone/still a draft — it shouldn't have a live
      // message. If it had one, delete it (Telegram drops a deleted message
      // from the pinned list automatically) and forget we ever tracked it.
      if (!match) {
        if (existing) {
          try {
            await callTelegramApi("deleteMessage", {
              chat_id: existing.chatId,
              message_id: existing.messageId,
            });
          } catch (err) {
            console.error("deleteMessage failed for cancelled match", err);
          }
          await ctx.runMutation(internal.matchBoardMessages.remove, { matchId });
        }
        return;
      }

      const settings = await ctx.runQuery(internal.communitySettings.getInternal, {});
      const { text, buttons } = renderMatchMessage(match, settings?.paymentInfo);

      // Tracks whether the in-place edit below failed for a reason OTHER
      // than "not modified" (message gone, deleted, >48h old, transient
      // API error) — if so we still need to delete the stale message and
      // post fresh, same as an explicit force repost, or the old message
      // stays live in the group alongside a brand-new untracked duplicate.
      let editFailed = false;

      if (existing && !force) {
        try {
          await callTelegramApi("editMessageText", {
            chat_id: existing.chatId,
            message_id: existing.messageId,
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
          console.error("editMessageText failed, reposting match message", err);
          editFailed = true;
        }
      }

      if (existing && (force || editFailed)) {
        try {
          await callTelegramApi("deleteMessage", {
            chat_id: existing.chatId,
            message_id: existing.messageId,
          });
        } catch (err) {
          // Bot may lack delete rights, or the message is >48h old — degrade
          // gracefully (CLAUDE.md #6), just post the fresh one below.
          console.error("deleteMessage failed, posting fresh match message anyway", err);
        }
      }

      const sent = await sendPacedMessage(ctx, {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
        ...(topicId !== undefined ? { message_thread_id: topicId } : {}),
      });

      // Pinning only happens on an explicit force-repost with pin requested
      // — never on a silent in-place edit/fallback-repost — so it stays a
      // deliberate action rather than something that can fire unattended.
      // Any OTHER path that reaches here (force without pin, or the
      // editFailed fallback) is posting a message that was never pinned, so
      // `pinned` is always false rather than carried over from `existing`
      // — the old message's pin state says nothing about this new one's.
      const pinned = force && pin ? await pinMessage(ctx, chatId, sent.message_id) : false;

      await ctx.runMutation(internal.matchBoardMessages.upsert, {
        matchId,
        chatId,
        messageId: sent.message_id,
        pinned,
      });
    } finally {
      if (releaseLock) {
        await ctx.runMutation(internal.matchBoardMessages.releaseBoardRepostLock, {});
      }
    }
  },
});

// Bulk sibling of syncMatchMessage — reposts every currently open match.
// Runs each repost SEQUENTIALLY (awaited, not fire-and-forget) rather than
// letting matches.repostAllToGroup schedule N independent syncMatchMessage
// calls — those ran concurrently and could race each other's delete-then-
// repost, producing duplicate messages. Pacing between sends now lives
// inside syncMatchMessage/sendPacedMessage itself (shared with every other
// force-repost caller), so this loop doesn't need its own sleep. Always
// calls syncMatchMessage with pin:false: pinning once per match in a
// 10-match batch is what burned through Telegram's separate, stricter pin
// rate limit during testing (a getChat+unpin+pin dance on every single
// match). If `pin` is requested, this pins exactly ONE match — the soonest
// upcoming (listOpenWithRosterCounts is soonest-first) — using the message
// it just posted, rather than re-running syncMatchMessage a second time
// (which would delete-and-repost it yet again). Always releases
// matches.repostAllToGroup's lock, even on failure, so a crashed run
// doesn't wedge every repost button for the full LOCK_TIMEOUT_MS.
export const repostAllMatches = internalAction({
  args: { pin: v.boolean() },
  handler: async (ctx, { pin }) => {
    try {
      const matches = await ctx.runQuery(internal.matches.listOpenWithRosterCounts, {});

      for (const match of matches) {
        await ctx.runAction(internal.telegram.matchBoard.syncMatchMessage, {
          matchId: match._id,
          force: true,
          pin: false,
        });
      }

      if (pin && matches.length > 0) {
        const soonest = matches[0];
        const posted = await ctx.runQuery(internal.matchBoardMessages.getByMatch, {
          matchId: soonest._id,
        });
        if (posted) {
          const pinned = await pinMessage(ctx, posted.chatId, posted.messageId);
          await ctx.runMutation(internal.matchBoardMessages.upsert, {
            matchId: soonest._id,
            chatId: posted.chatId,
            messageId: posted.messageId,
            pinned,
          });
        }
      }
    } finally {
      await ctx.runMutation(internal.matchBoardMessages.releaseBoardRepostLock, {});
    }
  },
});

// Cron target (see crons.ts): once a pinned match's startsAt has passed,
// unpin its message so the pinned list only ever shows upcoming games. Never
// deletes the message — the match itself, and its message, stay visible
// until an admin cancels it.
export const unpinStartedMatches = internalAction({
  args: {},
  handler: async (ctx) => {
    const pinnedRows = await ctx.runQuery(internal.matchBoardMessages.listPinned, {});
    const now = Date.now();

    for (const row of pinnedRows) {
      const match = await ctx.runQuery(internal.matches.getById, { matchId: row.matchId });
      if (!match || match.startsAt > now) continue;

      try {
        await callTelegramApi("unpinChatMessage", {
          chat_id: row.chatId,
          message_id: row.messageId,
        });
      } catch (err) {
        // Bot may lack pin rights, or the message may already be gone —
        // leave `pinned: true` so the next hourly run retries rather than
        // silently losing track of a message that's still actually pinned.
        console.error("unpinChatMessage failed", err);
        continue;
      }
      await ctx.runMutation(internal.matchBoardMessages.setPinned, {
        matchId: row.matchId,
        pinned: false,
      });
    }
  },
});
