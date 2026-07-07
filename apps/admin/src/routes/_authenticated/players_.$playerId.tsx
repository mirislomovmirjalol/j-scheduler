import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Id } from "@J-schedule/backend/convex/_generated/dataModel"
import { Badge } from "@J-schedule/ui/components/badge"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import BackButton from "@/components/back-button"
import { formatTashkentDateTime } from "@/lib/format"
import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/players_/$playerId")({
  component: PlayerProfilePage,
})

function PlayerProfilePage() {
  const { player: currentPlayer, isChecking } = useAdminGuard()
  const { playerId } = Route.useParams()
  const id = playerId as Id<"players">
  const player = useQuery(api.players.getById, { playerId: id })
  const history = useQuery(api.matches.listHistoryForPlayer, { playerId: id })

  if (isChecking || player === undefined) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }
  if (!currentPlayer?.isAdmin) return <Navigate to="/matches" />
  if (player === null) {
    return <p className="p-6 text-sm text-muted-foreground">Игрок не найден.</p>
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {player.firstName} {player.lastName ?? ""}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {player.username && <span>@{player.username}</span>}
          {player.type === "guest" && <Badge variant="secondary">гость</Badge>}
          {player.isAdmin && <Badge variant="outline">админ</Badge>}
          {player.level && <span>Уровень {player.level}</span>}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">История игр</h2>
        {history === undefined ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : history.length === 0 ? (
          <Empty>
            <EmptyTitle>Пока нет прошедших игр</EmptyTitle>
            <EmptyDescription>Сыгранные игры появятся здесь.</EmptyDescription>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map(({ membership, match }) => (
              <li key={membership._id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {formatTashkentDateTime(match.startsAt, "short")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.court} · {match.format} · Уровень {match.level}
                      </p>
                    </div>
                    <Badge variant={membership.role === "roster" ? "secondary" : "outline"}>
                      {membership.role === "roster" ? "играл(а)" : "лист ожидания"}
                    </Badge>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
