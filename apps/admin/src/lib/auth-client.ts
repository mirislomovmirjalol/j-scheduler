import { env } from "@J-schedule/env/web"
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// Unlike apps/web (which proxies /api/auth/* through its own SSR server at
// a same-origin relative path), apps/admin has no server of its own —
// baseURL must point at Convex directly, or every session/token check
// silently queries this app's own origin (which has no auth API at all)
// and never finds a session.
//
// crossDomainClient pairs with the server-side crossDomain() plugin
// (convex/auth.ts): it shuttles the session via a custom header + this
// browser's localStorage instead of a cookie, since browsers never attach
// a cross-site cookie to a fetch() (regardless of SameSite). Only applies
// to requests made through authClient's own $fetch — see
// telegram-deep-link-login.tsx for why that matters.
export const authClient = createAuthClient({
  baseURL: env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient()],
})
