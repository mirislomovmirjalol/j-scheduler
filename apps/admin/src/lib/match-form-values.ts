import { epochMsToTashkentLocal, tashkentLocalToEpochMs } from "@/lib/tashkent-time"

export type MatchFormValues = {
  startsAt: string // datetime-local value, Tashkent-local
  durationMin: string
  description: string
  level: string
  court: string
  format: string
  maxMembers: string
  pricePerPerson: string
  lundaUrl: string
}

export function defaultMatchFormValues(match?: {
  startsAt: number
  durationMin?: number
  description: string
  level: string
  court: string
  format: string
  maxMembers: number
  pricePerPerson?: number
  lundaUrl?: string
}): MatchFormValues {
  return {
    startsAt: match ? epochMsToTashkentLocal(match.startsAt) : "",
    durationMin: match?.durationMin ? String(match.durationMin) : "120",
    description: match?.description ?? "",
    level: match?.level ?? "",
    court: match?.court ?? "",
    format: match?.format ?? "",
    maxMembers: match ? String(match.maxMembers) : "8",
    pricePerPerson: match?.pricePerPerson ? String(match.pricePerPerson) : "",
    lundaUrl: match?.lundaUrl ?? "",
  }
}

export function matchFormValuesToArgs(values: MatchFormValues) {
  return {
    startsAt: tashkentLocalToEpochMs(values.startsAt),
    durationMin: values.durationMin ? Number(values.durationMin) : undefined,
    description: values.description,
    level: values.level,
    court: values.court,
    format: values.format,
    maxMembers: Number(values.maxMembers),
    pricePerPerson: values.pricePerPerson ? Number(values.pricePerPerson) : undefined,
    lundaUrl: values.lundaUrl || undefined,
  }
}
