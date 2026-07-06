import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { Toaster } from "@J-schedule/ui/components/sonner"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import { ThemeProvider } from "@/components/theme-provider"
import { authClient } from "@/lib/auth-client"
import { convexClient } from "@/lib/convex-client"

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  return (
    <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
      <ThemeProvider>
        <Outlet />
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools />
    </ConvexBetterAuthProvider>
  )
}
