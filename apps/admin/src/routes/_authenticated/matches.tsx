import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
})

function MatchesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Матчи</h1>
      <p className="text-sm text-muted-foreground">Скоро здесь появится список игр.</p>
    </div>
  )
}
