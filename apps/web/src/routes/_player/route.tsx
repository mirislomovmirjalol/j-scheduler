import { api } from "@J-schedule/backend/convex/_generated/api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import PlayerNav from "@/components/player-nav";
import { fetchAuthQuery } from "@/lib/auth-server";

// Must be defined directly in this route file — see the note in
// _auth/route.tsx on why createServerFn can't be re-exported from a shared
// lib module.
const getCurrentPlayer = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchAuthQuery(api.players.getCurrentPlayer, {});
});

export const Route = createFileRoute("/_player")({
  component: PlayerLayout,
  beforeLoad: async () => {
    const player = await getCurrentPlayer();
    if (!player) {
      throw redirect({ to: "/login" });
    }
    return { player };
  },
});

function PlayerLayout() {
  const { player } = Route.useRouteContext();
  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <PlayerNav player={player} />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
