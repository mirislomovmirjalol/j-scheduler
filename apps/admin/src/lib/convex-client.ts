import { env } from "@J-schedule/env/web"
import { ConvexReactClient } from "convex/react"

// Not using expectAuth: true (from the official Vite SPA guide) — that
// option holds back *every* query/mutation until an auth token exists,
// which deadlocks our own login page: it needs to call the (intentionally
// public, unauthenticated) webLogin.create mutation to start the flow in
// the first place.
export const convexClient = new ConvexReactClient(env.VITE_CONVEX_URL)
