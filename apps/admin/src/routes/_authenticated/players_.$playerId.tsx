import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Id } from "@J-schedule/backend/convex/_generated/dataModel"
import { Badge } from "@J-schedule/ui/components/badge"
import { Button } from "@J-schedule/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { usePaginatedQuery, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import BackButton from "@/components/back-button"
import MatchHistoryList from "@/components/match-history-list"
import NoShowList from "@/components/no-show-list"
import PlayerActivityCalendar from "@/components/player-activity-calendar"
import Reveal from "@/components/reveal"
import TextSwap from "@/components/text-swap"
import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/players_/$playerId")({
  component: PlayerProfilePage,
})

function PlayerProfilePage() {
  const { player: currentPlayer, isChecking } = useAdminGuard()
  const { playerId } = Route.useParams()
  const id = playerId as Id<"players">
  const player = useQuery(api.players.getById, { playerId: id })
  // Captured once — see matches.index.tsx's comment on why this can't be
  // Date.now() recomputed inside the paginated query itself.
  const [now] = useState(() => Date.now())
  const {
    results: history,
    status: historyStatus,
    loadMore: loadMoreHistory,
  } = usePaginatedQuery(
    api.matches.listHistoryForPlayerPage,
    { playerId: id, now },
    { initialNumItems: 20 },
  )
  const {
    results: noShows,
    status: noShowsStatus,
    loadMore: loadMoreNoShows,
  } = usePaginatedQuery(api.matches.listNoShowsForPlayerPage, { playerId: id }, { initialNumItems: 20 })

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
    <Reveal className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <BackButton />
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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
        {player.type === "authed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const url = `${window.location.origin}/p/${player._id}`
              await navigator.clipboard.writeText(url)
              toast.success("Публичная ссылка скопирована")
            }}
          >
            Скопировать публичную ссылку
          </Button>
        )}
      </div>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="text-base font-medium">Активность</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerActivityCalendar playerId={player._id} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-medium">История игр</h2>
        {historyStatus === "LoadingFirstPage" ? (
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
        ) : (
          <Reveal className="flex flex-col gap-3">
            <MatchHistoryList
              entries={history}
              emptyTitle="Пока нет прошедших игр"
              emptyDescription="Сыгранные игры появятся здесь."
            />
            {historyStatus !== "Exhausted" && (
              <Button
                variant="outline"
                disabled={historyStatus === "LoadingMore"}
                onClick={() => loadMoreHistory(20)}
              >
                <TextSwap>
                  {historyStatus === "LoadingMore" ? "Загружаем…" : "Показать ещё"}
                </TextSwap>
              </Button>
            )}
          </Reveal>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Пропущенные игры</h2>
        {noShowsStatus === "LoadingFirstPage" ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <Reveal className="flex flex-col gap-3">
            <NoShowList entries={noShows} />
            {noShowsStatus !== "Exhausted" && (
              <Button
                variant="outline"
                disabled={noShowsStatus === "LoadingMore"}
                onClick={() => loadMoreNoShows(20)}
              >
                <TextSwap>
                  {noShowsStatus === "LoadingMore" ? "Загружаем…" : "Показать ещё"}
                </TextSwap>
              </Button>
            )}
          </Reveal>
        )}
      </div>
    </Reveal>
  )
}
