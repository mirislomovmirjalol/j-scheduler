import { HugeiconsIcon } from "@hugeicons/react"
import { Home01Icon, Logout01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { api } from "@J-schedule/backend/convex/_generated/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@J-schedule/ui/components/dropdown-menu"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import { NavTooltip, navIconButtonClassName } from "@/components/nav-tooltip"
import ThemeToggle from "@/components/theme-toggle"
import { authClient } from "@/lib/auth-client"

export default function AppNav() {
  const player = useQuery(api.players.getCurrentPlayer)
  const navigate = useNavigate()

  return (
    <nav className="shiny-border fixed inset-x-0 top-3 z-50 mx-auto flex w-fit flex-row items-center gap-1 rounded-full border border-border/50 bg-background/80 p-1.5 shadow-lg backdrop-blur-md sm:inset-x-auto sm:top-1/2 sm:left-4 sm:mx-0 sm:-translate-y-1/2 sm:flex-col">
      <Link to="/" className={navIconButtonClassName}>
        <HugeiconsIcon icon={Home01Icon} strokeWidth={2} className="size-5" />
        <NavTooltip label="Дашборд" />
      </Link>

      <div role="separator" className="mx-1 h-px w-6 bg-border sm:mx-0 sm:h-6 sm:w-px" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={player?.firstName ?? "Профиль"}
              className={navIconButtonClassName}
            >
              <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-5" />
              <NavTooltip label={player?.firstName ?? "Профиль"} />
            </button>
          }
        />
        <DropdownMenuContent align="start" side="right">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {player?.username
                ? `@${player.username}`
                : player?.isAdmin
                  ? "Администратор"
                  : "Профиль"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => navigate({ to: "/login" }),
                  },
                })
              }}
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
