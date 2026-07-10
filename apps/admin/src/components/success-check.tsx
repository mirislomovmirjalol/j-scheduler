import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { useEffect, useState } from "react"

import { cn } from "@J-schedule/ui/lib/utils"

const VISIBLE_MS = 1500

type CheckState = { prevTrigger: number; visible: boolean }

// transitions-dev success-check, minus the SVG stroke-draw (Hugeicons
// icons are prebuilt components, not a raw <path> we can measure with
// getTotalLength) — fade + rotate + blur + Y-bob still read as an earned
// "saved" moment on their own. `trigger` is a counter: bump it once per
// successful save to show the check, which then auto-hides itself.
export default function SuccessCheck({
  trigger,
  className,
}: {
  trigger: number
  className?: string
}) {
  const [state, setState] = useState<CheckState>(() => ({ prevTrigger: trigger, visible: false }))

  if (trigger !== state.prevTrigger) {
    setState({ prevTrigger: trigger, visible: trigger !== 0 })
  }

  useEffect(() => {
    if (!state.visible) return
    const hideTimer = setTimeout(() => {
      setState((s) => (s.visible ? { ...s, visible: false } : s))
    }, VISIBLE_MS)
    return () => clearTimeout(hideTimer)
  }, [state.visible, trigger])

  if (!state.visible) return null

  return (
    <span
      key={trigger}
      data-state="in"
      aria-hidden="true"
      className={cn("t-success-check text-primary", className)}
    >
      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-4" />
    </span>
  )
}
