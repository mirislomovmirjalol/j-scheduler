/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_telegramPlugin from "../auth/telegramPlugin.js";
import type * as boardState from "../boardState.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_board from "../lib/board.js";
import type * as lib_strings from "../lib/strings.js";
import type * as lib_telegramAuth from "../lib/telegramAuth.js";
import type * as lib_time from "../lib/time.js";
import type * as matchReminders from "../matchReminders.js";
import type * as matches from "../matches.js";
import type * as memberships from "../memberships.js";
import type * as players from "../players.js";
import type * as telegram_api from "../telegram/api.js";
import type * as telegram_board from "../telegram/board.js";
import type * as telegram_dm from "../telegram/dm.js";
import type * as telegram_notify from "../telegram/notify.js";
import type * as telegram_processedUpdates from "../telegram/processedUpdates.js";
import type * as telegram_reminders from "../telegram/reminders.js";
import type * as telegram_router from "../telegram/router.js";
import type * as telegram_setWebhook from "../telegram/setWebhook.js";
import type * as telegram_webhook from "../telegram/webhook.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/telegramPlugin": typeof auth_telegramPlugin;
  boardState: typeof boardState;
  crons: typeof crons;
  http: typeof http;
  "lib/board": typeof lib_board;
  "lib/strings": typeof lib_strings;
  "lib/telegramAuth": typeof lib_telegramAuth;
  "lib/time": typeof lib_time;
  matchReminders: typeof matchReminders;
  matches: typeof matches;
  memberships: typeof memberships;
  players: typeof players;
  "telegram/api": typeof telegram_api;
  "telegram/board": typeof telegram_board;
  "telegram/dm": typeof telegram_dm;
  "telegram/notify": typeof telegram_notify;
  "telegram/processedUpdates": typeof telegram_processedUpdates;
  "telegram/reminders": typeof telegram_reminders;
  "telegram/router": typeof telegram_router;
  "telegram/setWebhook": typeof telegram_setWebhook;
  "telegram/webhook": typeof telegram_webhook;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
