import { Badge } from "@J-schedule/ui/components/badge"
import { cn } from "@J-schedule/ui/lib/utils"

import { usePresence } from "@/lib/use-presence"

const BADGE_CLOSE_MS = 180

// A Badge that pops in/out of the DOM with `show` (transitions-dev
// notification-badge, adapted as a plain pop rather than a corner-anchored
// slide — see transitions.css's .t-badge-pop for the rationale).
export default function PresenceBadge({
  show,
  children,
  ...badgeProps
}: { show: boolean; children: React.ReactNode } & React.ComponentProps<typeof Badge>) {
  const { rendered, open } = usePresence(show, BADGE_CLOSE_MS)

  if (!rendered) return null

  return (
    <Badge {...badgeProps} className={cn("t-badge-pop", badgeProps.className)} data-open={open ? "true" : "false"}>
      {children}
    </Badge>
  )
}
