import PresenceBadge from "@/components/presence-badge"

// Pops in/out with the match's isPublished flag — most visibly the moment
// an admin hits "Опубликовать" and the badge disappears from under them.
export default function DraftBadge({ show }: { show: boolean }) {
  return (
    <PresenceBadge show={show} className="text-primary">
      Черновик
    </PresenceBadge>
  )
}
