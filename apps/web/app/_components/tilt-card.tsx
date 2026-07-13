"use client"

import { useRef } from "react"

// transitions-dev card hover tilt. Pointer tracked on the flat outer
// wrapper (never transforms) so the tilting inner card's rotating edges
// don't slip out from under the cursor near the borders.
const MAX_TILT_DEG = 10

export default function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  function track(e: React.PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const tilt = tiltRef.current
    const card = cardRef.current
    if (!tilt || !card) return
    const r = tilt.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    tilt.classList.add("is-hover")
    card.classList.add("is-tilting")
    card.style.setProperty("--tilt-ry", ((px - 0.5) * MAX_TILT_DEG).toFixed(2) + "deg")
    card.style.setProperty("--tilt-rx", ((0.5 - py) * MAX_TILT_DEG).toFixed(2) + "deg")
    card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%")
    card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%")
  }

  function reset() {
    const tilt = tiltRef.current
    const card = cardRef.current
    if (!tilt || !card) return
    tilt.classList.remove("is-hover")
    card.classList.remove("is-tilting")
    card.style.setProperty("--tilt-rx", "0deg")
    card.style.setProperty("--tilt-ry", "0deg")
  }

  return (
    <div
      ref={tiltRef}
      className="t-tilt"
      onPointerMove={track}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") reset()
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div ref={cardRef} className={`t-tilt-card ${className ?? ""}`}>
        {children}
        <div className="t-tilt-glare" />
      </div>
    </div>
  )
}
