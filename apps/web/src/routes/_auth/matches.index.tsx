import { api } from "@J-schedule/backend/convex/_generated/api";
import { Button } from "@J-schedule/ui/components/button";
import { Card, CardContent } from "@J-schedule/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import SeatMeter from "@/components/seat-meter";

export const Route = createFileRoute("/_auth/matches/")({
  component: MatchesList,
});

function MatchesList() {
  const matches = useQuery(api.matches.listUpcoming);
  const repostToGroup = useMutation(api.boardState.repostToGroup);
  const [reposting, setReposting] = useState(false);
  const now = Date.now();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Матчи</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={reposting}
            onClick={async () => {
              setReposting(true);
              try {
                await repostToGroup({});
                toast.success("Доска отправлена в группу");
              } catch {
                toast.error("Не получилось отправить доску");
              } finally {
                setReposting(false);
              }
            }}
          >
            {reposting ? "Отправляем…" : "Отправить в группу"}
          </Button>
          <Button render={<Link to="/matches/new" />}>+ Новая игра</Button>
        </div>
      </div>

      {matches === undefined ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-5 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Empty>
          <EmptyTitle>Пока нет игр</EmptyTitle>
          <EmptyDescription>
            Создай первую игру, и она появится на доске в группе.
          </EmptyDescription>
          <Button render={<Link to="/matches/new" />} className="mt-4">
            + Новая игра
          </Button>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => {
            const isPast = match.startsAt < now;
            return (
              <li key={match._id}>
                <Link to="/matches/$matchId" params={{ matchId: match._id }}>
                  <Card className="transition-colors hover:bg-secondary">
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className={isPast ? "opacity-50" : undefined}>
                        <p className="text-lg font-medium">
                          {new Date(match.startsAt).toLocaleString("ru-RU", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Tashkent",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {match.court} · {match.format} · Уровень {match.level}
                        </p>
                      </div>
                      <SeatMeter
                        rosterCount={match.rosterCount}
                        maxMembers={match.maxMembers}
                        waitlistCount={match.waitlistCount}
                      />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
