import { api } from "@J-schedule/backend/convex/_generated/api";
import { Badge } from "@J-schedule/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/_player/schedule")({
  component: SchedulePage,
});

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

function playerName(player: { firstName: string; lastName?: string } | null) {
  if (!player) return "—";
  return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
}

function SchedulePage() {
  const matches = useQuery(api.matches.listUpcomingForPlayer);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Расписание</h1>

      {matches === undefined ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
                <div className="mt-2 flex gap-1.5">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Empty>
          <EmptyTitle>Пока нет игр</EmptyTitle>
          <EmptyDescription>Как только админ создаст игру, она появится здесь.</EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map(({ match, roster, waitlist }) => (
            <Card key={match._id}>
              <CardHeader>
                <CardTitle className="text-base font-medium capitalize">
                  {formatDateTime(match.startsAt)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {match.court} · {match.format} · Уровень {match.level}
                  {match.pricePerPerson ? ` · ${match.pricePerPerson} с человека` : ""}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {match.description && (
                  <p className="text-sm text-muted-foreground">{match.description}</p>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                    Ростер ({roster.length}/{match.maxMembers})
                  </p>
                  {roster.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Пока никто не записался.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {roster.map(({ player }, i) => (
                        <Badge key={i} variant="secondary">
                          {playerName(player)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {waitlist.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                      Лист ожидания ({waitlist.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {waitlist.map(({ player }, i) => (
                        <Badge key={i} variant="outline">
                          {playerName(player)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {match.lundaUrl && (
                  <a
                    href={match.lundaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline underline-offset-2"
                  >
                    Ссылка Lunda
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
