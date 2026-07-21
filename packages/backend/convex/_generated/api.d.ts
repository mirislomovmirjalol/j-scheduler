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
import type * as auth_signInHelpers from "../auth/signInHelpers.js";
import type * as auth_telegramDeepLinkPlugin from "../auth/telegramDeepLinkPlugin.js";
import type * as auth_telegramMiniAppPlugin from "../auth/telegramMiniAppPlugin.js";
import type * as communitySettings from "../communitySettings.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_matchMessage from "../lib/matchMessage.js";
import type * as lib_strings from "../lib/strings.js";
import type * as lib_telegramAuth from "../lib/telegramAuth.js";
import type * as lib_time from "../lib/time.js";
import type * as maintenance from "../maintenance.js";
import type * as matchBoardMessages from "../matchBoardMessages.js";
import type * as matchReminders from "../matchReminders.js";
import type * as matches from "../matches.js";
import type * as memberships from "../memberships.js";
import type * as players from "../players.js";
import type * as telegram_api from "../telegram/api.js";
import type * as telegram_commands from "../telegram/commands.js";
import type * as telegram_dm from "../telegram/dm.js";
import type * as telegram_matchBoard from "../telegram/matchBoard.js";
import type * as telegram_notify from "../telegram/notify.js";
import type * as telegram_processedUpdates from "../telegram/processedUpdates.js";
import type * as telegram_reminders from "../telegram/reminders.js";
import type * as telegram_router from "../telegram/router.js";
import type * as telegram_setWebhook from "../telegram/setWebhook.js";
import type * as telegram_webhook from "../telegram/webhook.js";
import type * as webLogin from "../webLogin.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/signInHelpers": typeof auth_signInHelpers;
  "auth/telegramDeepLinkPlugin": typeof auth_telegramDeepLinkPlugin;
  "auth/telegramMiniAppPlugin": typeof auth_telegramMiniAppPlugin;
  communitySettings: typeof communitySettings;
  crons: typeof crons;
  http: typeof http;
  "lib/matchMessage": typeof lib_matchMessage;
  "lib/strings": typeof lib_strings;
  "lib/telegramAuth": typeof lib_telegramAuth;
  "lib/time": typeof lib_time;
  maintenance: typeof maintenance;
  matchBoardMessages: typeof matchBoardMessages;
  matchReminders: typeof matchReminders;
  matches: typeof matches;
  memberships: typeof memberships;
  players: typeof players;
  "telegram/api": typeof telegram_api;
  "telegram/commands": typeof telegram_commands;
  "telegram/dm": typeof telegram_dm;
  "telegram/matchBoard": typeof telegram_matchBoard;
  "telegram/notify": typeof telegram_notify;
  "telegram/processedUpdates": typeof telegram_processedUpdates;
  "telegram/reminders": typeof telegram_reminders;
  "telegram/router": typeof telegram_router;
  "telegram/setWebhook": typeof telegram_setWebhook;
  "telegram/webhook": typeof telegram_webhook;
  webLogin: typeof webLogin;
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
