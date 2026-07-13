import { Input } from "@J-schedule/ui/components/input"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { usePresence } from "@/lib/use-presence"

const DROPDOWN_CLOSE_MS = 150

// Native <input list="..."> datalist suggestions don't render on iOS
// Safari at all (a longstanding WebKit gap), which is where this
// database-backed autocomplete matters most on a phone. This is a small
// hand-rolled dropdown instead, so it works identically on every mobile
// browser.
export default function AutocompleteInput({
  id,
  value,
  onChange,
  options,
  ...inputProps
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: string[] | undefined
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const filtered = (options ?? []).filter(
    (option) => option !== value && option.toLowerCase().includes(value.toLowerCase()),
  )
  const showDropdown = open && filtered.length > 0
  const { rendered, closing } = usePresence(showDropdown, DROPDOWN_CLOSE_MS)

  // Portaled to <body> and positioned from the real input's own
  // getBoundingClientRect, not anchored via CSS `absolute` inside the form.
  // The match form lays these fields out in a grid — an absolutely
  // positioned dropdown doesn't reserve space in that layout, so a list
  // long enough to need its max-h-48 scroll would just float on top of
  // whatever field sits close beneath it in the next grid row. Fixed
  // positioning from a measured rect (same pattern as the calendar
  // heatmap's tooltip) sidesteps that entirely.
  useEffect(() => {
    if (!rendered) return
    function updateRect() {
      const el = wrapperRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.bottom, left: r.left, width: r.width })
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [rendered])

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        id={id}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        {...inputProps}
      />
      {rendered &&
        rect &&
        createPortal(
          <div
            className={`t-dropdown fixed z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md ${
              showDropdown ? "is-open" : ""
            } ${closing ? "is-closing" : ""}`}
            style={{ top: rect.top, left: rect.left, width: rect.width }}
            data-origin="top-center"
          >
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                // Fires before the input's onBlur closes the list.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
