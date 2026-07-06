import { api } from "@J-schedule/backend/convex/_generated/api"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
})

function HomePage() {
  const player = useQuery(api.players.getCurrentPlayer)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Привет{player ? `, ${player.firstName}` : ""}!
      </h1>
      <p className="text-sm text-muted-foreground">
        Панель организатора в разработке — экраны появятся здесь один за
        другим.
      </p>
    </div>
  )
}
