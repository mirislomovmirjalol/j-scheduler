import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@J-schedule/ui/components/dropdown-menu"
import { useTheme } from "next-themes"

import { NavTooltip, navIconButtonClassName } from "@/components/nav-tooltip"

export default function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" aria-label="Тема" className={navIconButtonClassName}>
            <HugeiconsIcon
              icon={Sun01Icon}
              strokeWidth={2}
              className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
            />
            <HugeiconsIcon
              icon={Moon02Icon}
              strokeWidth={2}
              className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
            />
            <NavTooltip label="Тема" />
          </button>
        }
      />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onClick={() => setTheme("light")}>Светлая</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Тёмная</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>Системная</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
