import { cn } from "@J-schedule/ui/lib/utils"

// Plays the transitions-dev skeleton-reveal fade+unblur once, on this
// element's first mount — used where a loading skeleton is swapped for a
// differently-shaped content tree (route-level loading states), so the two
// can't share a single absolutely-positioned slot the way the reference
// snippet's two-layer overlay assumes. The animation itself is pure CSS
// (@starting-style on .t-reveal) — this component is just the DOM anchor.
export default function Reveal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("t-reveal", className)}>{children}</div>
}
