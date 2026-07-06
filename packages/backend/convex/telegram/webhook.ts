import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const telegramWebhook = httpAction(async (ctx, request) => {
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== process.env.TELEGRAM_SECRET_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (typeof update.update_id !== "number") {
    return new Response("Bad Request", { status: 400 });
  }

  // CLAUDE.md §9: log every inbound update — a dead webhook otherwise fails
  // silently. Chat id specifically is also how you find a group's chat id
  // in the first place (Telegram has no "look up chat id" API otherwise).
  const chat = update.message?.chat ?? update.callback_query?.message?.chat;
  console.log("telegram update", {
    updateId: update.update_id,
    type: update.message ? "message" : update.callback_query ? "callback_query" : "other",
    chatId: chat?.id,
    chatType: chat?.type,
  });

  const isNew = await ctx.runMutation(
    internal.telegram.processedUpdates.recordIfNew,
    { updateId: update.update_id },
  );
  if (!isNew) {
    return new Response(null, { status: 200 });
  }

  if (update.message) {
    await ctx.runAction(internal.telegram.router.handleMessage, {
      message: update.message,
    });
  } else if (update.callback_query) {
    await ctx.runAction(internal.telegram.router.handleCallbackQuery, {
      callbackQuery: update.callback_query,
    });
  }

  return new Response(null, { status: 200 });
});
