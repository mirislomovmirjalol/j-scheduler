import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { telegramWidgetLogin } from "./auth/telegramPlugin";

const siteUrl = process.env.SITE_URL!;
// Dev-only escape hatch: a tunnel URL (ngrok/cloudflared/localhost.run) for
// testing the Telegram Login Widget, which requires a public HTTPS domain.
// Unset in prod.
const extraTrustedOrigin = process.env.EXTRA_TRUSTED_ORIGIN;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: extraTrustedOrigin ? [siteUrl, extraTrustedOrigin] : [siteUrl],
    database: authComponent.adapter(ctx),
    // No email/password (CLAUDE.md: Telegram Login Widget only, no
    // passwords) — telegramWidgetLogin() below is the only sign-in method.
    plugins: [
      telegramWidgetLogin(ctx),
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
