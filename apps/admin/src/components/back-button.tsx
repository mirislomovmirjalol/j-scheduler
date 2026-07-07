import { Button } from "@J-schedule/ui/components/button"
import { useRouter } from "@tanstack/react-router"

export default function BackButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      onClick={() => router.history.back()}
    >
      ← Назад
    </Button>
  )
}
