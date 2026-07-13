import { HugeiconsIcon } from "@hugeicons/react"
import { Logout01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@J-schedule/ui/components/dropdown-menu"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import { authClient } from "@/lib/auth-client"

export default function UserMenu() {
  const player = useQuery(api.players.getCurrentPlayer)
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2" />}>
        <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-5" />
        <span className="hidden sm:inline">{player?.firstName ?? "Профиль"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link to="/profile" />}>Профиль</DropdownMenuItem>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
