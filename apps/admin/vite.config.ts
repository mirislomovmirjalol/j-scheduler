import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Pinned (not the 5173 default) so it's a stable, known origin to add
    // to Convex's EXTRA_TRUSTED_ORIGINS for the Telegram Login Widget.
    port: 3002,
    // Dev-only: lets a tunnel (ngrok/cloudflared/localhost.run) hit this
    // server for testing from another device. Never applies in production
    // builds. Matches apps/web's vite.config.ts.
    allowedHosts: true,
  },
  // tanstackRouter must come before react() (its own requirement).
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
