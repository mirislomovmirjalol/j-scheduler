import { useEffect, useRef, useState } from "react"

import { cn } from "@J-schedule/ui/lib/utils"

const SWAP_DUR_MS = 150

// transitions-dev text-states-swap, adapted to React: the old label exits
// up with blur, then the new label enters from below — e.g. a button
// flipping between "Отправить в группу" / "Отправляем…".
export default function TextSwap({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  const [display, setDisplay] = useState(children)
  const [phase, setPhase] = useState<"idle" | "exit" | "enter-start">("idle")
  const prevRef = useRef(children)

  useEffect(() => {
    if (prevRef.current === children) return
    prevRef.current = children
    setPhase("exit")
    const exitTimer = setTimeout(() => {
      setDisplay(children)
      setPhase("enter-start")
    }, SWAP_DUR_MS)
    return () => clearTimeout(exitTimer)
  }, [children])

  useEffect(() => {
    if (phase !== "enter-start") return
    const frame = requestAnimationFrame(() => setPhase("idle"))
    return () => cancelAnimationFrame(frame)
  }, [phase])

  return (
    <span
      className={cn(
        "t-text-swap",
        phase === "exit" && "is-exit",
        phase === "enter-start" && "is-enter-start",
        className,
      )}
    >
      {display}
    </span>
  )
}
