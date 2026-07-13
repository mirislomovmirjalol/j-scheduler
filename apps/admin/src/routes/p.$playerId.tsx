import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Id } from "@J-schedule/backend/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import PlayerActivityCalendar from "@/components/player-activity-calendar"
import Reveal from "@/components/reveal"

// Deliberately outside _authenticated — no session required. Shows only
// name + level + activity calendar (getPublicProfile explicitly excludes
// everything else, same "no auth gate at all" caveat as
// matches.listPublicUpcoming), so a player can share this link without
// exposing their Telegram username or match history details.
export const Route = createFileRoute("/p/$playerId")({
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { playerId } = Route.useParams()
  const id = playerId as Id<"players">
  const player = useQuery(api.players.getPublicProfile, { playerId: id })

  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 p-6">
      <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        One Padel
      </span>

      {player === undefined ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : player === null ? (
        <p className="text-sm text-muted-foreground">Игрок не найден.</p>
      ) : (
        <Reveal className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {player.firstName} {player.lastName ?? ""}
            </h1>
            {player.level && (
              <p className="mt-1 text-sm text-muted-foreground">Уровень {player.level}</p>
            )}
          </div>

          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle className="text-base font-medium">Активность</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerActivityCalendar playerId={id} />
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  )
}
