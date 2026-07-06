import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3001,
    // Dev-only: lets a tunnel (cloudflared/localhost.run) hit this server
    // for testing the Telegram Login Widget, which requires a public HTTPS
    // domain registered via @BotFather. Never applies in production builds.
    allowedHosts: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    // Every route here is auth-gated and dynamic (CLAUDE.md: no static
    // pages worth prerendering) — TanStack Start's prerender/crawl step
    // is what's currently broken across recent Nitro versions on Vercel
    // (spawns a preview server to crawl pages; fails with module-not-found
    // or infinite-loop errors). Disabling it sidesteps that entirely.
    tanstackStart({ prerender: { enabled: false } }),
    nitro(),
    viteReact(),
  ],
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});
