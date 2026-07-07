import { useEffect, useState } from "react"

// Delays reflecting a fast-changing value (typically search input) so
// callers can wait for the user to pause typing before firing a query —
// avoids sending a request per keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
