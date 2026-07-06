import { api } from "@J-schedule/backend/convex/_generated/api";
import { Button } from "@J-schedule/ui/components/button";
import { Input } from "@J-schedule/ui/components/input";
import { Label } from "@J-schedule/ui/components/label";
import { useQuery } from "convex/react";
import { useId, useState } from "react";

import { epochMsToTashkentLocal, tashkentLocalToEpochMs } from "@/lib/tashkent-time";

export type MatchFormValues = {
  startsAt: string; // datetime-local value, Tashkent-local
  durationMin: string;
  description: string;
  level: string;
  court: string;
  format: string;
  maxMembers: string;
  pricePerPerson: string;
  lundaUrl: string;
};

const FORMATS = ["Американо", "Мексикано", "King"];

export function defaultMatchFormValues(match?: {
  startsAt: number;
  durationMin?: number;
  description: string;
  level: string;
  court: string;
  format: string;
  maxMembers: number;
  pricePerPerson?: number;
  lundaUrl?: string;
}): MatchFormValues {
  return {
    startsAt: match ? epochMsToTashkentLocal(match.startsAt) : "",
    durationMin: match?.durationMin ? String(match.durationMin) : "120",
    description: match?.description ?? "",
    level: match?.level ?? "",
    court: match?.court ?? "",
    format: match?.format ?? FORMATS[0],
    maxMembers: match ? String(match.maxMembers) : "8",
    pricePerPerson: match?.pricePerPerson ? String(match.pricePerPerson) : "",
    lundaUrl: match?.lundaUrl ?? "",
  };
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
  };
}

export default function MatchForm({
  initialValues,
  submitLabel,
  onSubmit,
  submitting,
}: {
  initialValues: MatchFormValues;
  submitLabel: string;
  onSubmit: (values: MatchFormValues) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState(initialValues);
  const courtHistory = useQuery(api.matches.listCourtHistory);
  const courtListId = useId();

  const set = <K extends keyof MatchFormValues>(key: K, value: MatchFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Дата и время</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            required
            value={values.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
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
          required
          placeholder="Например: обычная еженедельная игра"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="court">Корт</Label>
          <Input
            id="court"
            required
            list={courtListId}
            value={values.court}
            onChange={(e) => set("court", e.target.value)}
          />
          <datalist id={courtListId}>
            {courtHistory?.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="format">Формат</Label>
          <Input
            id="format"
            required
            list={`${courtListId}-format`}
            value={values.format}
            onChange={(e) => set("format", e.target.value)}
          />
          <datalist id={`${courtListId}-format`}>
            {FORMATS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Уровень</Label>
          <Input
            id="level"
            required
            placeholder="1-2"
            value={values.level}
            onChange={(e) => set("level", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxMembers">Мест</Label>
          <Input
            id="maxMembers"
            type="number"
            min={1}
            required
            value={values.maxMembers}
            onChange={(e) => set("maxMembers", e.target.value)}
          />
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
        {submitting ? "Сохраняем…" : submitLabel}
      </Button>
    </form>
  );
}
