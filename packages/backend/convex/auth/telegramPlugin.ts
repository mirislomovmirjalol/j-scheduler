import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";
import { internal } from "../_generated/api";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { isAuthDateFresh, verifyTelegramWidgetAuth } from "../lib/telegramAuth";

// Custom better-auth plugin: verifies a Telegram Login Widget payload and
// signs the user in, in place of email/password (CLAUDE.md: "Telegram Login
// Widget. No new passwords."). Modeled on the built-in `siwe` plugin, which
// is the closest analog shipped with better-auth — an externally-signed
// identity proof rather than an OAuth2 exchange.
//
// The Convex component behind @convex-dev/better-auth has a *fixed* schema
// for the `user` table — it only recognizes fields for its own bundled
// official plugins, not arbitrary custom fields. So we don't try to stash
// telegramUserId on the better-auth user at all; the Telegram id already
// lives in the standard `account.accountId` field (providerId: "telegram"),
// and we sync our own `players` table directly from this endpoint — which
// is why the plugin factory takes the real Convex ctx as a parameter.
//
// Registers POST /sign-in/telegram, reachable through the existing
// /api/auth/$ catch-all in apps/web (same mechanism that already serves
// every other better-auth endpoint) at /api/auth/sign-in/telegram, and
// directly at `${CONVEX_SITE_URL}/api/auth/sign-in/telegram` since
// better-auth's routes are registered on Convex's own httpRouter.
export const telegramWidgetLogin = (convexCtx: GenericCtx<DataModel>) => {
  return {
    id: "telegram-widget-login",
    endpoints: {
      signInTelegram: createAuthEndpoint(
        "/sign-in/telegram",
        {
          method: "POST",
          body: z.object({
            id: z.number(),
            first_name: z.string(),
            last_name: z.string().optional(),
            username: z.string().optional(),
            photo_url: z.string().optional(),
            auth_date: z.number(),
            hash: z.string(),
          }),
          requireRequest: true,
        },
        async (ctx) => {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Bot not configured",
            });
          }

          const isValid = await verifyTelegramWidgetAuth(ctx.body, botToken);
          if (!isValid || !isAuthDateFresh(ctx.body.auth_date)) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired Telegram login data",
            });
          }

          const telegramUserId = ctx.body.id;
          const accountId = String(telegramUserId);

          const existingAccount = await ctx.context.adapter.findOne<{
            userId: string;
          }>({
            model: "account",
            where: [
              { field: "providerId", operator: "eq", value: "telegram" },
              { field: "accountId", operator: "eq", value: accountId },
            ],
          });

          type FullUser = Awaited<
            ReturnType<typeof ctx.context.internalAdapter.createUser>
          >;

          let user = existingAccount
            ? await ctx.context.adapter.findOne<FullUser>({
                model: "user",
                where: [
                  { field: "id", operator: "eq", value: existingAccount.userId },
                ],
              })
            : null;

          const displayName = [ctx.body.first_name, ctx.body.last_name]
            .filter(Boolean)
            .join(" ");

          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              name: displayName,
              email: `telegram-${telegramUserId}@users.noreply`,
              image: ctx.body.photo_url,
              emailVerified: true,
            });

            await ctx.context.internalAdapter.createAccount({
              userId: user.id,
              providerId: "telegram",
              accountId,
            });
          }

          if ("runMutation" in convexCtx) {
            await convexCtx.runMutation(internal.players.upsertFromAuthUser, {
              authUserId: user.id,
              telegramUserId,
              firstName: ctx.body.first_name,
              lastName: ctx.body.last_name,
              username: ctx.body.username,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not create session",
            });
          }

          await setSessionCookie(ctx, { session, user });

          return ctx.json({ success: true, userId: user.id });
        },
      ),
    },
  };
};
