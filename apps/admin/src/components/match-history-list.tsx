import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel"
import { Badge } from "@J-schedule/ui/components/badge"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"

import { formatTashkentDateTime } from "@/lib/format"

// Shared by history.tsx (a player's own history, filterable by role) and
// players_.$playerId.tsx (an admin looking at one player's history) — same
// entry shape, same empty state, different copy for the two callers.
export default function MatchHistoryList({
  entries,
  emptyTitle,
  emptyDescription,
}: {
  entries: { membership: Doc<"memberships">; match: Doc<"matches"> }[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map(({ membership, match }) => (
        <li key={membership._id}>
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{formatTashkentDateTime(match.startsAt, "short")}</p>
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
  )
}
