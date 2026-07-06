import { api } from "@J-schedule/backend/convex/_generated/api";
import { Button } from "@J-schedule/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import SeatMeter from "@/components/seat-meter";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardHome,
});

function DashboardHome() {
  const matches = useQuery(api.matches.listUpcoming);
  const now = Date.now();
  const upcoming = matches?.filter((m) => m.startsAt >= now) ?? [];
  const next = upcoming[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <Button render={<Link to="/matches/new" />}>+ Новая игра</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ближайшая игра</CardTitle>
        </CardHeader>
        <CardContent>
          {matches === undefined ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ) : next ? (
            <Link
              to="/matches/$matchId"
              params={{ matchId: next._id }}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-lg font-medium">
                  {new Date(next.startsAt).toLocaleString("ru-RU", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tashkent",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {next.court} · {next.format}
                </p>
              </div>
              <SeatMeter
                rosterCount={next.rosterCount}
                maxMembers={next.maxMembers}
                waitlistCount={next.waitlistCount}
              />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Нет запланированных игр.{" "}
              <Link to="/matches/new" className="underline underline-offset-2">
                Создать первую
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/matches">
          <Card className="transition-colors hover:bg-secondary">
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{upcoming.length}</p>
              <p className="text-sm text-muted-foreground">
                Предстоящих игр — все матчи
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/players">
          <Card className="transition-colors hover:bg-secondary">
            <CardContent>
              <p className="text-2xl font-semibold">Игроки</p>
              <p className="text-sm text-muted-foreground">
                Уровни, админы, удаление
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
