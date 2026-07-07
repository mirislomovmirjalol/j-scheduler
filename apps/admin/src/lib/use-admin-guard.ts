import { api } from "@J-schedule/backend/convex/_generated/api"
import { useQuery } from "convex/react"

// Admin-only routes can't gate in `beforeLoad` here the way apps/web does:
// apps/web has SSR, so the player is already resolved server-side by the
// time beforeLoad runs. apps/admin is client-only — the Convex client only
// gets a valid auth token attached asynchronously (inside
// ConvexBetterAuthProvider's effect), so a one-shot query in beforeLoad on a
// cold load could run before that handshake finishes and falsely look
// unauthenticated. useQuery sidesteps this entirely: it shows `undefined`
// while loading and updates on its own once the token attaches — no race.
export function useAdminGuard() {
  const player = useQuery(api.players.getCurrentPlayer)
  return { player, isChecking: player === undefined }
}
