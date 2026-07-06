import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@J-schedule/env/web";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const convexUrl = env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    // Defaults (1000ms/500ms) hide real latency behind dead air before any
    // loading UI appears, reading as the app "doing nothing" for a beat.
    // Lower thresholds surface the pending state almost immediately instead.
    defaultPendingMs: 150,
    defaultPendingMinMs: 150,
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Страница не найдена
      </div>
    ),
    context: { queryClient, convexQueryClient },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
