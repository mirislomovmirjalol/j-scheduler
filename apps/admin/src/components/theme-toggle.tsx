import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@J-schedule/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@J-schedule/ui/components/dialog"
import { useTheme } from "next-themes"
import type * as React from "react"

const THEME_OPTIONS = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
  { value: "system", label: "Системная" },
] as const

export default function ThemeToggle({
  render = <button type="button" />,
}: {
  render?: React.ReactElement
}) {
  const { theme, setTheme } = useTheme()

  return (
    <Dialog>
      <DialogTrigger render={render}>
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          <HugeiconsIcon
            icon={Sun01Icon}
            strokeWidth={2}
            className="absolute size-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
          />
          <HugeiconsIcon
            icon={Moon02Icon}
            strokeWidth={2}
            className="absolute size-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
          />
        </span>
        Тема
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Тема</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {THEME_OPTIONS.map((option) => (
            <DialogClose
              key={option.value}
              render={
                <Button
                  variant={theme === option.value ? "default" : "outline"}
                  onClick={() => setTheme(option.value)}
                />
              }
            >
              {option.label}
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
