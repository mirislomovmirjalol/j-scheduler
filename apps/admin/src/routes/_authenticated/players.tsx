import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/players")({
  component: PlayersPage,
})

function PlayersPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Игроки</h1>
      <p className="text-sm text-muted-foreground">Скоро здесь появится список игроков.</p>
    </div>
  )
}
