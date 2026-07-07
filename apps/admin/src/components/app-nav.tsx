import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  HistoryIcon,
  Home01Icon,
  Logout01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@J-schedule/ui/components/dialog"
import { Link, useNavigate } from "@tanstack/react-router"
import { BorderBeam } from "border-beam"
import { useQuery } from "convex/react"
import { useTheme } from "next-themes"

import { NavTooltip, navIconButtonClassName } from "@/components/nav-tooltip"
import ThemeToggle from "@/components/theme-toggle"
import { authClient } from "@/lib/auth-client"

const navShapeClassName =
  "fixed inset-x-0 top-3 z-50 mx-auto flex w-fit flex-row items-center gap-1 rounded-full sm:inset-x-auto sm:top-1/2 sm:left-4 sm:mx-0 sm:-translate-y-1/2 sm:flex-col"

export default function AppNav() {
  const player = useQuery(api.players.getCurrentPlayer)
  const navigate = useNavigate()
  // next-themes already resolves "system" to the actual light/dark value in
  // use — reading that (rather than letting BorderBeam guess independently
  // off matchMedia) is what keeps the beam's colors in sync with a manually
  // chosen theme instead of only the OS preference.
  const { resolvedTheme } = useTheme()

  return (
    <nav className={`${navShapeClassName} relative`}>
      <div className="absolute inset-0 rounded-full">
        <BorderBeam
          size="pulse-inner"
          colorVariant="mono"
          strength={1}
          theme={resolvedTheme === "light" ? "light" : "dark"}
          className="size-full rounded-full border border-border/30 bg-background/40 shadow-lg backdrop-blur-xl"
          aria-hidden="true"
        >
          <div className="size-full rounded-full" />
        </BorderBeam>
      </div>

      <div className="relative flex flex-row items-center gap-1 p-1.5 sm:flex-col">
        <Link to="/" className={navIconButtonClassName}>
          <HugeiconsIcon icon={Home01Icon} strokeWidth={2} className="size-5" />
          <NavTooltip label="Дашборд" />
        </Link>
        <Link to="/matches" className={navIconButtonClassName}>
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-5" />
          <NavTooltip label="Матчи" />
        </Link>
        <Link to="/history" className={navIconButtonClassName}>
          <HugeiconsIcon icon={HistoryIcon} strokeWidth={2} className="size-5" />
          <NavTooltip label="История" />
        </Link>
        <Link to="/players" className={navIconButtonClassName}>
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-5" />
          <NavTooltip label="Игроки" />
        </Link>

        <div role="separator" className="mx-1 h-px w-6 bg-border sm:mx-0 sm:h-6 sm:w-px" />

        <ThemeToggle />

        <Dialog>
          <DialogTrigger
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
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>
                {player?.firstName}
                {player?.lastName ? ` ${player.lastName}` : ""}
              </DialogTitle>
              <DialogDescription>
                {player?.username
                  ? `@${player.username}`
                  : player?.isAdmin
                    ? "Администратор"
                    : "Профиль"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
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
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  )
}
