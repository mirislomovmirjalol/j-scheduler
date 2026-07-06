import { setSessionCookie } from "better-auth/cookies";
import { internal } from "../_generated/api";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";

export type TelegramProfile = {
  telegramUserId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
};

// createAuthEndpoint's real ctx type is inferred per-call from that
// endpoint's own request schema, so a caller-agnostic helper shared across
// different endpoints (different request bodies) can't reuse one precise
// type without fighting better-auth's internal (and partly unexported)
// adapter types. Kept loose deliberately — every field this helper actually
// touches (context.adapter, context.internalAdapter, and ctx itself for
// setSessionCookie) is exercised by both callers' typechecked tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthEndpointCtx = any;

// Shared by every Telegram-identity-based sign-in method (the deep-link flow
// in telegramDeepLinkPlugin.ts, and the Mini App flow in
// telegramMiniAppPlugin.ts): find-or-create the better-auth user + account
// for this Telegram id, sync our players table, and start a session. Each
// caller is responsible for verifying the identity claim first (a confirmed
// one-time code for the deep link, an HMAC-signed initData payload for the
// Mini App) — this helper trusts whatever profile it's given.
//
// We don't stash telegramUserId on the better-auth user directly: the
// Convex component's user table has a fixed schema, so the Telegram id
// lives in account.accountId instead, and our own players table is synced
// separately via upsertFromAuthUser.
export async function signInAsTelegramUser(
  ctx: AuthEndpointCtx,
  convexCtx: GenericCtx<DataModel>,
  profile: TelegramProfile,
) {
  const accountId = String(profile.telegramUserId);

  const existingAccount: { userId: string } | null =
    await ctx.context.adapter.findOne({
      model: "account",
      where: [
        { field: "providerId", operator: "eq", value: "telegram" },
        { field: "accountId", operator: "eq", value: accountId },
      ],
    });

  let user = existingAccount
    ? await ctx.context.adapter.findOne({
        model: "user",
        where: [{ field: "id", operator: "eq", value: existingAccount.userId }],
      })
    : null;

  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  if (!user) {
    user = await ctx.context.internalAdapter.createUser({
      name: displayName,
      email: `telegram-${profile.telegramUserId}@users.noreply`,
      image: profile.photoUrl,
      emailVerified: true,
    });

    await ctx.context.internalAdapter.createAccount({
      userId: user!.id,
      providerId: "telegram",
      accountId,
    });
  }
  const foundOrCreatedUser = user!;

  if ("runMutation" in convexCtx) {
    await convexCtx.runMutation(internal.players.upsertFromAuthUser, {
      authUserId: foundOrCreatedUser.id,
      telegramUserId: profile.telegramUserId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
    });
  }

  const session = await ctx.context.internalAdapter.createSession(
    foundOrCreatedUser.id,
  );
  if (!session) {
    throw new Error("Could not create session");
  }

  await setSessionCookie(ctx, { session, user: foundOrCreatedUser });

  return foundOrCreatedUser;
}
