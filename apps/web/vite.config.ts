import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
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
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});
