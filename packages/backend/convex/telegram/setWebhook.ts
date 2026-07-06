import { internalAction } from "../_generated/server";
import { callTelegramApi } from "./api";

// Run manually via `npx convex run telegram/setWebhook:setWebhook` after
// TELEGRAM_BOT_TOKEN / TELEGRAM_SECRET_TOKEN are set, to point a bot
// (staging or prod, whichever token is configured) at this deployment.
export const setWebhook = internalAction({
  args: {},
  handler: async () => {
    const siteUrl = process.env.CONVEX_SITE_URL;
    const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
    if (!siteUrl) throw new Error("CONVEX_SITE_URL is not set");
    if (!secretToken) throw new Error("TELEGRAM_SECRET_TOKEN is not set");

    await callTelegramApi("setWebhook", {
      url: `${siteUrl}/telegram`,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    });
  },
});
