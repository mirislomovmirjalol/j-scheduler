import { cn } from "@J-schedule/ui/lib/utils"

// transitions-dev number pop-in. Keying the group by the stringified value
// forces React to remount the digit spans whenever it changes, which is
// what replays the CSS animation — no manual class-toggle/reflow dance
// needed, since a fresh DOM node always plays its mount-time animation.
export default function DigitGroup({
  value,
  className,
}: {
  value: string | number
  className?: string
}) {
  const str = String(value)
  const chars = str.split("")

  return (
    <span className={cn("t-digit-group", className)} key={str}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={
            i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined
          }
        >
          {ch}
        </span>
      ))}
    </span>
  )
}
