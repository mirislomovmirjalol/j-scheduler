"use client"

import { useRef } from "react"

// transitions-dev avatar group hover — distance-falloff lift with
// direction-aware easing (clean ease-in on hover, bouncy ease-out on
// return). React form, adapted from the skill's reference.
export default function AvatarRow({
  items,
  className,
}: {
  items: React.ReactNode[]
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  function setShifts(activeIdx: number | null, phase: "in" | "out") {
    const root = rootRef.current
    if (!root) return
    const cs = getComputedStyle(document.documentElement)
    const num = (name: string, fb: number) => {
      const v = Number.parseFloat(cs.getPropertyValue(name))
      return Number.isFinite(v) ? v : fb
    }
    const ease = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb

    const lift = num("--avatar-lift", -6)
    const falloff = num("--avatar-falloff", 0.45)
    const scale = num("--avatar-scale", 1.06)
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)")

    root.querySelectorAll<HTMLElement>(".t-avatar").forEach((el, i) => {
      el.style.transitionTimingFunction = tf
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px")
        el.style.setProperty("--scale-active", "1")
        return
      }
      const d = Math.abs(i - activeIdx)
      el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px")
      el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1")
    })
  }

  return (
    <div
      ref={rootRef}
      className={`flex ${className ?? ""}`}
      onMouseLeave={() => setShifts(null, "out")}
    >
      {items.map((node, i) => (
        <div key={i} className="t-avatar" onMouseEnter={() => setShifts(i, "in")}>
          {node}
        </div>
      ))}
    </div>
  )
}
