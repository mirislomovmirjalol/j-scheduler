"use client"

import { useEffect, useRef } from "react"

// transitions-dev texts reveal, scroll-triggered instead of mount-triggered
// (this is a scrolling marketing page, not a route transition) — plays
// once when the block enters the viewport.
export default function TextReveal({
  lines,
  className,
  as: Tag = "div",
}: {
  lines: React.ReactNode[]
  className?: string
  as?: "div" | "h1" | "h2"
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-shown")
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={`t-stagger ${className ?? ""}`}>
      {lines.map((line, i) => (
        <span key={i} className={`t-stagger-line t-stagger-line--${i + 1}`}>
          {line}
        </span>
      ))}
    </Tag>
  )
}
