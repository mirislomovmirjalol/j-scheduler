import { Badge } from "@J-schedule/ui/components/badge"

import { matchStatus } from "@/lib/match-status"

const STATUS_LABEL: Record<ReturnType<typeof matchStatus>, string> = {
  past: "Прошла",
  full: "Заполнена",
  open: "Открыта",
}

const STATUS_VARIANT: Record<ReturnType<typeof matchStatus>, React.ComponentProps<typeof Badge>["variant"]> = {
  past: "outline",
  full: "secondary",
  open: "default",
}

export default function MatchStatusBadge({
  match,
  rosterCount,
}: {
  match: { startsAt: number; maxMembers: number }
  rosterCount: number
}) {
  const status = matchStatus(match, rosterCount)
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
