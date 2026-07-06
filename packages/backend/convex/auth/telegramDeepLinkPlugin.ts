import { APIError, createAuthEndpoint } from "better-auth/api";
import * as z from "zod";
import { internal } from "../_generated/api";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { signInAsTelegramUser } from "./signInHelpers";

// Fallback sign-in method for regular browsers (not opened as a Telegram
// Mini App — see telegramMiniAppPlugin.ts for that path). This project
// originally used the Telegram Login Widget, which required BotFather
// domain registration and had real-world reliability issues — browser
// popup blockers, and a "not logged into web.telegram.org" fallback flow
// that could silently stall with no visible error. This flow instead rides
// entirely on the bot's own webhook, which is already proven reliable:
//   1. Frontend calls webLogin.create, gets a one-time code.
//   2. User opens t.me/<bot>?start=<code> and taps Start.
//   3. Our webhook (telegram/router.ts) sees "/start <code>", calls
//      webLogin.confirm.
//   4. The frontend's reactive webLogin.getStatus query sees "confirmed",
//      then POSTs here with the code to actually create the session.
export const telegramDeepLinkLogin = (convexCtx: GenericCtx<DataModel>) => {
  return {
    id: "telegram-deeplink-login",
    endpoints: {
      signInTelegramDeepLink: createAuthEndpoint(
        "/sign-in/telegram-deeplink",
        {
          method: "POST",
          body: z.object({ code: z.string() }),
          requireRequest: true,
        },
        async (ctx) => {
          if (!("runMutation" in convexCtx)) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Not available",
            });
          }

          const profile = await convexCtx.runMutation(
            internal.webLogin.consume,
            { code: ctx.body.code },
          );
          if (!profile) {
            throw new APIError("UNAUTHORIZED", {
              message: "Login code not confirmed or expired",
            });
          }

          const user = await signInAsTelegramUser(ctx, convexCtx, profile);

          return ctx.json({ success: true, userId: user.id });
        },
      ),
    },
  };
};
