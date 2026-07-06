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
