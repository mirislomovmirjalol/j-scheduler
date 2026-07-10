import { api } from "@J-schedule/backend/convex/_generated/api"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import BackButton from "@/components/back-button"
import MatchForm from "@/components/match-form"
import Reveal from "@/components/reveal"
import { defaultMatchFormValues, matchFormValuesToArgs } from "@/lib/match-form-values"
import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/matches/new")({
  component: NewMatchPage,
})

function NewMatchPage() {
  const { player, isChecking } = useAdminGuard()
  const navigate = useNavigate()
  const createMatch = useMutation(api.matches.createMatch)
  const [submitting, setSubmitting] = useState(false)

  if (isChecking) {
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

  return (
    <Reveal className="mx-auto flex max-w-lg flex-col p-6">
      <BackButton />
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">Новая игра</h1>
      <MatchForm
        initialValues={defaultMatchFormValues()}
        submitLabel="Создать игру"
        submitting={submitting}
        onSubmit={async (values) => {
          setSubmitting(true)
          try {
            const matchId = await createMatch(matchFormValuesToArgs(values))
            toast.success("Игра создана")
            navigate({ to: "/matches/$matchId", params: { matchId } })
          } catch (err) {
            toast.error("Не получилось создать игру")
            console.error(err)
          } finally {
            setSubmitting(false)
          }
        }}
      />
    </Reveal>
  )
}
