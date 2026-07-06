import { api } from "@J-schedule/backend/convex/_generated/api";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import MatchForm, {
  defaultMatchFormValues,
  matchFormValuesToArgs,
} from "@/components/match-form";

export const Route = createFileRoute("/_app/matches/new")({
  beforeLoad: ({ context }) => {
    if (!context.player.isAdmin) throw redirect({ to: "/matches" });
  },
  component: NewMatchPage,
});

function NewMatchPage() {
  const navigate = useNavigate();
  const createMatch = useMutation(api.matches.createMatch);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Новая игра</h1>
      <MatchForm
        initialValues={defaultMatchFormValues()}
        submitLabel="Создать игру"
        submitting={submitting}
        onSubmit={async (values) => {
          setSubmitting(true);
          try {
            const matchId = await createMatch(matchFormValuesToArgs(values));
            toast.success("Игра создана");
            navigate({ to: "/matches/$matchId", params: { matchId } });
          } catch (err) {
            toast.error("Не получилось создать игру");
            console.error(err);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
