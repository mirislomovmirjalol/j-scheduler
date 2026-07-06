import { api } from "@J-schedule/backend/convex/_generated/api";
import { Badge } from "@J-schedule/ui/components/badge";
import { Card, CardContent } from "@J-schedule/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/_player/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const history = useQuery(api.matches.listMyHistory);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Моя история</h1>

      {history === undefined ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : history.length === 0 ? (
        <Empty>
          <EmptyTitle>Пока нет прошедших игр</EmptyTitle>
          <EmptyDescription>
            Сыгранные игры, в которых ты участвовал(-а), появятся здесь.
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map(({ membership, match }) => (
            <li key={membership._id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
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
                  <Badge variant={membership.role === "roster" ? "secondary" : "outline"}>
                    {membership.role === "roster" ? "играл(а)" : "лист ожидания"}
                  </Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
