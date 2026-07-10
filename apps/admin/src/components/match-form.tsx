import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import { Input } from "@J-schedule/ui/components/input"
import { Label } from "@J-schedule/ui/components/label"
import { useQuery } from "convex/react"
import { useState } from "react"

import AutocompleteInput from "@/components/autocomplete-input"
import ShakeField from "@/components/shake-field"
import TextSwap from "@/components/text-swap"
import type { MatchFormValues } from "@/lib/match-form-values"

type FormErrors = Partial<Record<keyof MatchFormValues, string>>

function validate(values: MatchFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.startsAt) errors.startsAt = "Укажи дату и время"
  if (!values.court.trim()) errors.court = "Укажи корт"
  if (!values.format.trim()) errors.format = "Укажи формат"
  if (!values.level.trim()) errors.level = "Укажи уровень"
  const maxMembers = Number(values.maxMembers)
  if (!values.maxMembers || !Number.isFinite(maxMembers) || maxMembers < 1) {
    errors.maxMembers = "Должно быть не меньше 1"
  }
  return errors
}

export default function MatchForm({
  initialValues,
  submitLabel,
  onSubmit,
  submitting,
}: {
  initialValues: MatchFormValues
  submitLabel: string
  onSubmit: (values: MatchFormValues) => void
  submitting: boolean
}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitAttempt, setSubmitAttempt] = useState(0)
  const courtHistory = useQuery(api.matches.listCourtHistory)
  const formatHistory = useQuery(api.matches.listFormatHistory)
  const levelHistory = useQuery(api.matches.listLevelHistory)

  const set = <K extends keyof MatchFormValues>(key: K, value: MatchFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const nextErrors = validate(values)
        if (Object.keys(nextErrors).length > 0) {
          setErrors(nextErrors)
          setSubmitAttempt((a) => a + 1)
          return
        }
        onSubmit(values)
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Дата и время</Label>
          <ShakeField error={errors.startsAt} attempt={submitAttempt}>
            <Input
              id="startsAt"
              type="datetime-local"
              aria-invalid={!!errors.startsAt}
              value={values.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </ShakeField>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="durationMin">Длительность, мин</Label>
          <Input
            id="durationMin"
            type="number"
            min={0}
            value={values.durationMin}
            onChange={(e) => set("durationMin", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Описание</Label>
        <Input
          id="description"
          placeholder="Например: обычная еженедельная игра"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="court">Корт</Label>
          <ShakeField error={errors.court} attempt={submitAttempt}>
            <AutocompleteInput
              id="court"
              aria-invalid={!!errors.court}
              value={values.court}
              onChange={(v) => set("court", v)}
              options={courtHistory}
            />
          </ShakeField>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="format">Формат</Label>
          <ShakeField error={errors.format} attempt={submitAttempt}>
            <AutocompleteInput
              id="format"
              aria-invalid={!!errors.format}
              value={values.format}
              onChange={(v) => set("format", v)}
              options={formatHistory}
            />
          </ShakeField>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Уровень</Label>
          <ShakeField error={errors.level} attempt={submitAttempt}>
            <AutocompleteInput
              id="level"
              placeholder="1-2"
              aria-invalid={!!errors.level}
              value={values.level}
              onChange={(v) => set("level", v)}
              options={levelHistory}
            />
          </ShakeField>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxMembers">Мест</Label>
          <ShakeField error={errors.maxMembers} attempt={submitAttempt}>
            <Input
              id="maxMembers"
              type="number"
              min={1}
              aria-invalid={!!errors.maxMembers}
              value={values.maxMembers}
              onChange={(e) => set("maxMembers", e.target.value)}
            />
          </ShakeField>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pricePerPerson">Цена с человека</Label>
          <Input
            id="pricePerPerson"
            type="number"
            min={0}
            value={values.pricePerPerson}
            onChange={(e) => set("pricePerPerson", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lundaUrl">Ссылка на Lunda</Label>
        <Input
          id="lundaUrl"
          type="url"
          placeholder="https://…"
          value={values.lundaUrl}
          onChange={(e) => set("lundaUrl", e.target.value)}
        />
      </div>

      <Button type="submit" disabled={submitting} className="mt-2">
        <TextSwap>{submitting ? "Сохраняем…" : submitLabel}</TextSwap>
      </Button>
    </form>
  )
}
