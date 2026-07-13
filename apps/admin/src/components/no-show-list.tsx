import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel"
import { Badge } from "@J-schedule/ui/components/badge"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"

import { formatTashkentDateTime } from "@/lib/format"

// Admin-only complement to MatchHistoryList — matches this player was on
// the roster for but got flagged as a no-show (memberships.setNoShow), so
// an admin can see attendance reliability at a glance on the profile page.
export default function NoShowList({
  entries,
}: {
  entries: { membership: Doc<"memberships">; match: Doc<"matches"> }[]
}) {
  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyTitle>Пропусков нет</EmptyTitle>
        <EmptyDescription>Все игры, куда записывался(-ась), посещал(а).</EmptyDescription>
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
              <Badge variant="destructive">не пришёл</Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
