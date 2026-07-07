import { api } from "@J-schedule/backend/convex/_generated/api"
import { Badge } from "@J-schedule/ui/components/badge"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useState } from "react"

import StatCard from "@/components/stat-card"
import { formatTashkentDateTime } from "@/lib/format"

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
})

type RoleFilter = "roster" | "waitlist" | null

function HistoryPage() {
  const history = useQuery(api.matches.listMyHistory)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null)

  const visible = roleFilter ? history?.filter((h) => h.membership.role === roleFilter) : history

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Моя история</h1>

      {history && history.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Сыграно игр"
            value={history.length}
            onClick={() => setRoleFilter(null)}
            active={roleFilter === null}
          />
          <StatCard
            label="В ростере"
            value={history.filter((h) => h.membership.role === "roster").length}
            onClick={() => setRoleFilter(roleFilter === "roster" ? null : "roster")}
            active={roleFilter === "roster"}
          />
          <StatCard
            label="В листе ожидания"
            value={history.filter((h) => h.membership.role === "waitlist").length}
            onClick={() => setRoleFilter(roleFilter === "waitlist" ? null : "waitlist")}
            active={roleFilter === "waitlist"}
          />
        </div>
      )}

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
          <EmptyDescription>
            Сыгранные игры, в которых ты участвовал(-а), появятся здесь.
          </EmptyDescription>
        </Empty>
      ) : visible && visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет игр в этой категории.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible?.map(({ membership, match }) => (
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
  )
}
