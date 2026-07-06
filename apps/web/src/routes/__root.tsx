import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Toaster } from "@J-schedule/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import appCss from "../index.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Игры — панель организатора",
      },
    ],
    scripts: [
      // No-op outside Telegram; when opened as a registered Mini App, this
      // populates window.Telegram.WebApp with initData for auto sign-in
      // (see components/telegram-login.tsx).
      { src: "https://telegram.org/js/telegram-web-app.js" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },
});

function RootDocument() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <html lang="ru" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="h-svh">
          <ThemeProvider>
            <Outlet />
            <Toaster richColors />
          </ThemeProvider>
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
