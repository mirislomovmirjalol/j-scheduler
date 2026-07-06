import { Badge } from "@J-schedule/ui/components/badge";
import { cn } from "@J-schedule/ui/lib/utils";

// The dashboard's signature element: exact court occupancy as discrete
// seat cells (filled = roster, outlined = open), with a waitlist count
// appended when relevant. Not a smooth progress bar — it's meant to be
// counted at a glance, the way you'd glance at a scoreboard.
export default function SeatMeter({
  rosterCount,
  maxMembers,
  waitlistCount = 0,
  className,
}: {
  rosterCount: number;
  maxMembers: number;
  waitlistCount?: number;
  className?: string;
}) {
  const cells = Array.from({ length: Math.max(maxMembers, rosterCount) });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-wrap gap-1">
        {cells.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5",
              i < rosterCount ? "bg-foreground" : "ring-1 ring-border ring-inset",
            )}
          />
        ))}
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">
        {rosterCount}/{maxMembers}
      </span>
      {waitlistCount > 0 && (
        <Badge variant="secondary">+{waitlistCount} ожид.</Badge>
      )}
    </div>
  );
}
