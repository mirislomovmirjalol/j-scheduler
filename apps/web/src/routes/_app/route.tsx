import { api } from "@J-schedule/backend/convex/_generated/api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import AppNav from "@/components/app-nav";
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

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  // The player identity rarely changes mid-session — without this,
  // beforeLoad's server round trip re-runs on every single navigation,
  // and the default 1s pendingMs (see router.tsx) hides that behind dead
  // air before any loading UI appears.
  staleTime: 5 * 60 * 1000,
  beforeLoad: async () => {
    const player = await getCurrentPlayer();
    if (!player) {
      throw redirect({ to: "/login" });
    }
    return { player };
  },
});

function AppLayout() {
  const { player } = Route.useRouteContext();
  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <AppNav player={player} />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
