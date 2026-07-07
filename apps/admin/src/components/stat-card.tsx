import { Card, CardContent } from "@J-schedule/ui/components/card"

// Small at-a-glance number used across the dashboard/matches/players/history
// stat strips — a label and a value, nothing else. Kept tiny on purpose:
// these are summary counts, not a chart or a second page of detail.
export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground uppercase">{label}</span>
      </CardContent>
    </Card>
  )
}
