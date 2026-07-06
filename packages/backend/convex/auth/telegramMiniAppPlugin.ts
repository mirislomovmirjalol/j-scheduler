import { APIError, createAuthEndpoint } from "better-auth/api";
import * as z from "zod";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { isAuthDateFresh, verifyTelegramMiniAppInitData } from "../lib/telegramAuth";
import { signInAsTelegramUser } from "./signInHelpers";

// Sign-in via Telegram Mini App initData (see telegramAuth.ts for the
// verification algorithm). This is the preferred method whenever the app is
// actually opened as a registered Mini App from within Telegram — it's
// automatic (no button, no confirmation step), which also sidesteps a real
// bug: a Mini App navigating to a t.me deep link (the fallback flow in
// webLogin.ts) closes the Mini App itself rather than just opening the
// chat, losing all page state. Falls back to the deep-link flow when
// window.Telegram.WebApp.initData isn't available (i.e. a regular browser).
export const telegramMiniAppLogin = (convexCtx: GenericCtx<DataModel>) => {
  return {
    id: "telegram-miniapp-login",
    endpoints: {
      signInTelegramMiniApp: createAuthEndpoint(
        "/sign-in/telegram-miniapp",
        {
          method: "POST",
          body: z.object({ initData: z.string() }),
          requireRequest: true,
        },
        async (ctx) => {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Bot not configured",
            });
          }

          const result = await verifyTelegramMiniAppInitData(
            ctx.body.initData,
            botToken,
          );
          if (!result.valid || !isAuthDateFresh(result.authDate)) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired Mini App init data",
            });
          }

          const user = await signInAsTelegramUser(ctx, convexCtx, {
            telegramUserId: result.user.id,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            username: result.user.username,
            photoUrl: result.user.photo_url,
          });

          return ctx.json({ success: true, userId: user.id });
        },
      ),
    },
  };
};
