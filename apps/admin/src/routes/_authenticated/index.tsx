import { api } from "@J-schedule/backend/convex/_generated/api"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import StatCard from "@/components/stat-card"

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
})

function HomePage() {
  const player = useQuery(api.players.getCurrentPlayer)
  const matches = useQuery(api.matches.listUpcomingForPlayer)
  const history = useQuery(api.matches.listMyHistory)
  const players = useQuery(api.players.listAll)

  const openSeats = matches?.reduce(
    (sum, { match, roster }) => sum + Math.max(match.maxMembers - roster.length, 0),
    0,
  )
  const draftCount = matches?.filter(({ match }) => !match.isPublished).length

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Привет{player ? `, ${player.firstName}` : ""}!
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Предстоящих игр" value={matches?.length ?? "—"} />
        <StatCard label="Свободных мест" value={openSeats ?? "—"} />
        <StatCard label="Сыграно игр" value={history?.length ?? "—"} />
        {player?.isAdmin && (
          <>
            <StatCard label="Черновики" value={draftCount ?? "—"} />
            <StatCard label="Игроков" value={players?.length ?? "—"} />
            <StatCard
              label="Админов"
              value={players?.filter((p) => p.isAdmin).length ?? "—"}
            />
          </>
        )}
      </div>
    </div>
  )
}
