import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import Reveal from "@/components/reveal"
import TextSwap from "@/components/text-swap"
import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { player, isChecking } = useAdminGuard()

  if (isChecking) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (!player?.isAdmin) return <Navigate to="/matches" />

  return (
    <Reveal className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
      <PaymentInfoCard />
    </Reveal>
  )
}

function PaymentInfoCard() {
  const settings = useQuery(api.communitySettings.get)

  if (settings === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Реквизиты для оплаты</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Keyed so the form's local edit buffer is (re)seeded from the loaded
  // value exactly once, without a setState-in-effect resync loop.
  return <PaymentInfoForm key={settings?._id ?? "empty"} initialValue={settings?.paymentInfo ?? ""} />
}

function PaymentInfoForm({ initialValue }: { initialValue: string }) {
  const setPaymentInfo = useMutation(api.communitySettings.setPaymentInfo)
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реквизиты для оплаты</CardTitle>
        <CardDescription>
          Показываются игрокам на странице игры, в доске в группе и по команде
          /pay боту (в группе и в личке) — чтобы больше не приходилось
          скидывать номер карты вручную.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <textarea
          rows={4}
          placeholder="Например: Karim Karimov, 8600 1234 5678 9012 (Kapital Bank)"
          className="w-full rounded-md border border-input bg-transparent p-2 text-sm text-foreground outline-none focus-visible:border-ring"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          className="self-start"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true)
            try {
              await setPaymentInfo({ paymentInfo: value.trim() || undefined })
              toast.success("Реквизиты сохранены")
            } catch {
              toast.error("Не получилось сохранить реквизиты")
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <TextSwap>{submitting ? "Сохраняем…" : "Сохранить"}</TextSwap>
        </Button>
      </CardContent>
    </Card>
  )
}
