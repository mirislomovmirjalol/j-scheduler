import { httpRouter } from "convex/server";

import { authComponent, createAuth, trustedOrigins } from "./auth";
import { telegramWebhook } from "./telegram/webhook";

const http = httpRouter();

// cors is off by default — without it, a frontend with no server of its own
// (apps/admin) can't call these auth endpoints cross-origin at all (the
// browser blocks the preflight). apps/web never hit this because its
// requests went through its own SSR server at a same-origin relative path.
authComponent.registerRoutes(http, createAuth, {
  cors: { allowedOrigins: trustedOrigins },
});

http.route({
  path: "/telegram",
  method: "POST",
  handler: telegramWebhook,
});

export default http;
