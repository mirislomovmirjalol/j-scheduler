import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { telegramDeepLinkLogin } from "./auth/telegramDeepLinkPlugin";
import { telegramMiniAppLogin } from "./auth/telegramMiniAppPlugin";

const siteUrl = process.env.SITE_URL!;
// Additional trusted origins beyond siteUrl — comma-separated, e.g. a dev
// tunnel URL (ngrok/cloudflared), plus every other frontend that talks to
// this same Convex deployment (apps/web, apps/admin, each in both dev and
// prod).
const extraTrustedOrigins = (process.env.EXTRA_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Shared with http.ts's registerRoutes CORS config — a frontend with no
// server of its own (apps/admin) hits these auth endpoints directly
// cross-origin, which needs actual CORS headers, not just better-auth's own
// trustedOrigins (that's a separate CSRF-style check, not Access-Control-*).
export const trustedOrigins = [siteUrl, ...extraTrustedOrigins];

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    // No email/password (CLAUDE.md: Telegram Login Widget only, no
    // passwords) — both telegram* plugins here are Telegram-identity-based,
    // just two different ways to prove it depending on how the app was
    // opened:
    //  - telegramMiniAppLogin: opened as a registered Telegram Mini App —
    //    automatic, no user action (see telegramMiniAppPlugin.ts).
    //  - telegramDeepLinkLogin: a regular browser — a one-time code
    //    confirmed via the bot's own webhook (see telegramDeepLinkPlugin.ts).
    // Replaced the original Telegram Login Widget entirely: it required
    // BotFather domain registration and proved unreliable in practice
    // (browser popup blockers, a "not logged into web.telegram.org"
    // fallback flow that silently stalled).
    //
    // crossDomain is the documented fix for apps/admin: a frontend with no
    // server of its own calls this Convex deployment directly from its own
    // origin, and browsers never attach a cross-site cookie to a fetch() no
    // matter the SameSite setting used (that only affects
    // same-site/top-level-navigation cookies). This plugin instead shuttles
    // the session via a custom header + the client's localStorage — see
    // auth-client.ts's crossDomainClient() and telegram-deep-link-login.tsx's
    // use of authClient.$fetch (not a raw fetch()) so that wrapping actually
    // applies. apps/web doesn't need this (it proxies /api/auth/* through
    // its own SSR server at a same-origin relative path), but registering
    // the plugin is harmless for it.
    plugins: [
      telegramDeepLinkLogin(ctx),
      telegramMiniAppLogin(ctx),
      crossDomain({ siteUrl }),
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
