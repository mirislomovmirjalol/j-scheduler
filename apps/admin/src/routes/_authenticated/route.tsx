import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data) {
      throw redirect({ to: "/login" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="grid h-svh grid-rows-[auto_1fr]">
      <Header />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function Header() {
  const player = useQuery(api.players.getCurrentPlayer)
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <Link to="/" className="text-sm font-semibold tracking-tight">
        Игры
      </Link>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {player && (
          <span>
            {player.firstName}
            {player.lastName ? ` ${player.lastName}` : ""}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => navigate({ to: "/login" }),
              },
            })
          }}
        >
          Выйти
        </Button>
      </div>
    </header>
  )
}
