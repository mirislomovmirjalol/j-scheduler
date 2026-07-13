"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"

// Client-side only — pages stay static (RSC, prerenderable) and dynamic
// match data loads via useQuery instead of a server-side fetchQuery. Gets
// genuine Convex reactivity (roster counts update live) instead of a
// once-per-request snapshot.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
