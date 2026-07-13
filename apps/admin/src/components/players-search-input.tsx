import { useEffect, useRef, useState } from "react"

import { useDebouncedValue } from "@/lib/use-debounced-value"

// Standalone, always-visible (not tucked inside the Filters panel) — search
// is the primary, most-used way to narrow the players list, so it gets its
// own prime spot next to the Filters trigger rather than being an extra
// click away. Owns the debounce timer and every keystroke's state itself,
// so typing only re-renders this small input — not the whole players table
// (the actual cause of a "laggy" feel: every keystroke re-rendering every
// row, each with its own mutations/dialogs/checkbox). Keyed by the
// parent's resetKey, which only changes on an explicit "Сбросить" click —
// never on our own debounced updates — so typing never remounts or loses
// focus.
export default function PlayersSearchInput({
  initialValue,
  onDebouncedChange,
  resetKey,
}: {
  initialValue: string
  onDebouncedChange: (value: string) => void
  resetKey: number
}) {
  return (
    <PlayersSearchInputInner
      key={resetKey}
      initialValue={initialValue}
      onDebouncedChange={onDebouncedChange}
    />
  )
}

function PlayersSearchInputInner({
  initialValue,
  onDebouncedChange,
}: {
  initialValue: string
  onDebouncedChange: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const debounced = useDebouncedValue(value, 300)
  const onDebouncedChangeRef = useRef(onDebouncedChange)
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange
  })
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onDebouncedChangeRef.current(debounced)
  }, [debounced])

  return (
    <input
      type="text"
      placeholder="Имя или @username"
      className="h-9 w-48 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}
