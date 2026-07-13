import { internalAction } from "../_generated/server";
import { strings } from "../lib/strings";
import { callTelegramApi } from "./api";

// One-off registration so /matches and /my show up in Telegram's own
// command menu/autocomplete (bot commands work without this — it's purely
// a discoverability nicety). Not called automatically anywhere; run once
// after deploying via `convex run telegram/commands:registerCommands`
// (and again any time the command list changes).
export const registerCommands = internalAction({
  args: {},
  handler: async () => {
    await callTelegramApi("setMyCommands", {
      commands: [
        { command: "matches", description: strings.matchesCommandDescription },
        { command: "my", description: strings.myCommandDescription },
        { command: "pay", description: strings.payCommandDescription },
      ],
    });
  },
});
