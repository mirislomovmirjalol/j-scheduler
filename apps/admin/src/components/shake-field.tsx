import { useEffect, useRef, useState } from "react"

import { cn } from "@J-schedule/ui/lib/utils"

// transitions-dev error-state-shake, wired to a validation attempt counter
// rather than the reference's auto-revert timer: a form error should stay
// visible until the field is actually fixed, not fade out on its own after
// a few seconds. `attempt` only needs to change (e.g. incremented once per
// failed submit) — the shake replays whenever it does and `error` is set.
//
// The message stays mounted even after `error` clears (holding the last
// text) so the CSS fade-to-neutral has something to animate out — an
// immediate unmount would skip straight past the transition.
export default function ShakeField({
  error,
  attempt,
  children,
}: {
  error?: string
  attempt: number
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [lastError, setLastError] = useState(error ?? "")

  if (error && error !== lastError) {
    setLastError(error)
  }

  useEffect(() => {
    if (!error || !ref.current) return
    const el = ref.current
    el.classList.remove("is-shaking")
    void el.offsetWidth
    el.classList.add("is-shaking")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  return (
    <div className={cn("t-input-wrap", error && "is-error")}>
      <div ref={ref} className={cn("t-input", error && "is-error")}>
        {children}
      </div>
      <p className="t-error-msg mt-1 text-xs text-destructive">{lastError}</p>
    </div>
  )
}
