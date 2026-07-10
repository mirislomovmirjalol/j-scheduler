import { Input } from "@J-schedule/ui/components/input"
import { useState } from "react"

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

  const filtered = (options ?? []).filter(
    (option) => option !== value && option.toLowerCase().includes(value.toLowerCase()),
  )
  const showDropdown = open && filtered.length > 0
  const { rendered, closing } = usePresence(showDropdown, DROPDOWN_CLOSE_MS)

  return (
    <div className="relative">
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
      {rendered && (
        <div
          className={`t-dropdown absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md ${
            showDropdown ? "is-open" : ""
          } ${closing ? "is-closing" : ""}`}
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
        </div>
      )}
    </div>
  )
}
