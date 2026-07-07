import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Id } from "@J-schedule/backend/convex/_generated/dataModel"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import BackButton from "@/components/back-button"
import MatchForm from "@/components/match-form"
import { defaultMatchFormValues, matchFormValuesToArgs } from "@/lib/match-form-values"
import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/matches_/$matchId/edit")({
  component: EditMatchPage,
})

function EditMatchPage() {
  const { player, isChecking } = useAdminGuard()
  const { matchId } = Route.useParams()
  const id = matchId as Id<"matches">
  const detail = useQuery(api.matches.getMatchDetail, { matchId: id })
  const editMatch = useMutation(api.matches.editMatch)
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  if (isChecking || detail === undefined) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <Skeleton className="mb-2 h-7 w-48" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }
  if (!player?.isAdmin) return <Navigate to="/matches" />
  if (detail === null) {
    return <p className="p-6 text-sm text-muted-foreground">Игра не найдена.</p>
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col p-6">
      <BackButton />
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">Редактировать игру</h1>
      <MatchForm
        initialValues={defaultMatchFormValues(detail.match)}
        submitLabel="Сохранить"
        submitting={submitting}
        onSubmit={async (values) => {
          setSubmitting(true)
          try {
            await editMatch({ matchId: id, ...matchFormValuesToArgs(values) })
            toast.success("Игра обновлена")
            navigate({ to: "/matches/$matchId", params: { matchId: id } })
          } catch (err) {
            toast.error("Не получилось сохранить")
            console.error(err)
          } finally {
            setSubmitting(false)
          }
        }}
      />
    </div>
  )
}
