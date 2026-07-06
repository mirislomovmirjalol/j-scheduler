import { api } from "@J-schedule/backend/convex/_generated/api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import DashboardNav from "@/components/dashboard-nav";
import { fetchAuthQuery } from "@/lib/auth-server";

// Must be a createServerFn call written directly in this route file (not
// re-exported through a shared lib module — the compiler's server/client
// split only picks it up here) — calling fetchAuthQuery directly in
// beforeLoad instead pulls auth-server.ts's transitive
// AsyncLocalStorage-based imports into the client bundle, which crashes on
// load in the browser.
const getCurrentPlayer = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchAuthQuery(api.players.getCurrentPlayer, {});
});

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const player = await getCurrentPlayer();
    if (!player) {
      throw redirect({ to: "/login" });
    }
    if (!player.isAdmin) {
      throw redirect({ to: "/schedule" });
    }
    return { player };
  },
});

function AuthLayout() {
  const { player } = Route.useRouteContext();
  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <DashboardNav player={player} />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
