import { cn } from "@J-schedule/ui/lib/utils"

// Stand-in for real photography, which we don't have yet. Styled as a
// deliberate court-line graphic rather than a generic gray box, so it
// reads as "designed" rather than "broken" until real photos land —
// swap the children for a real <img>/<Image> when they're available.
export default function PhotoSlot({
  label,
  className,
  tone = "court",
}: {
  label: string
  className?: string
  tone?: "court" | "clay" | "ink"
}) {
  const toneClasses = {
    court: "bg-court text-chalk/70",
    clay: "bg-clay-soft text-clay",
    ink: "bg-ink text-chalk/60",
  }[tone]

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl",
        toneClasses,
        className,
      )}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 200 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="192" height="192" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="100" x2="196" y2="100" stroke="currentColor" strokeWidth="1.5" />
        <line x1="100" y1="4" x2="100" y2="196" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="eyebrow relative" style={{ color: "currentColor", opacity: 0.8 }}>
        {label}
      </span>
    </div>
  )
}
