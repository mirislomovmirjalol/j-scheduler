import { Button } from "@J-schedule/ui/components/button"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Index,
})

function Index() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>TanStack Router is wired up and using the shared UI package.</p>
        </div>
        <Button className="mt-2">Button</Button>
      </div>
    </div>
  )
}
