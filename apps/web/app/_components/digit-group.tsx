// transitions-dev number pop-in. Keying by the stringified value forces a
// remount whenever it changes, which is what replays the CSS animation —
// same approach as apps/admin's digit-group.tsx.
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
    <span className={`t-digit-group ${className ?? ""}`} key={str}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}
