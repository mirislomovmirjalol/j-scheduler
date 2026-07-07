import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import AppNav from "@/components/app-nav"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data) {
      throw redirect({ to: "/login" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="h-svh">
      <AppNav />
      {/* The nav floats (fixed) instead of sitting in flow, so content
          needs its own clearance: extra top padding under the mobile top
          bar, extra left padding beside the desktop left rail. */}
      <main className="h-full overflow-y-auto pt-20 sm:pt-0 sm:pl-24">
        <Outlet />
      </main>
    </div>
  )
}
