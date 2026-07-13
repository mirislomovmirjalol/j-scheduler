import type { Metadata, Viewport } from "next"
import { Golos_Text, IBM_Plex_Mono, Unbounded } from "next/font/google"

import ConvexClientProvider from "@/app/_components/convex-client-provider"
import Footer from "@/app/_components/footer"
import Nav from "@/app/_components/nav"
import { getImagePath } from "@/app/_lib/media"

import "./globals.css"

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "800"],
})

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
})

export const metadata: Metadata = {
  title: "One Padel — сообщество игроков в паделл",
  description:
    "One Padel — не корт, а команда. Еженедельные игры, любой уровень, живое сообщество в Telegram.",
}

// themeColor: kept for browsers that still honor it (older Safari,
// Chrome/Android, some in-app WebViews) — Safari 26+ no longer does, it
// instead samples the sticky header's own background-color (see nav.tsx).
// This is just the pre-hydration default; nav.tsx updates it live as the
// page crosses light/dark sections. Pages that always open on a light
// section (tournaments/community/about) override it.
// viewportFit "cover": lets the page extend under the notch/home-indicator
// safe areas instead of leaving an unstyled system-default gap there.
export const viewport: Viewport = {
  themeColor: "#16211c",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      className={`${unbounded.variable} ${golos.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-chalk text-ink">
        <ConvexClientProvider>
          <Nav logoBlack={getImagePath("logo-black")} logoWhite={getImagePath("logo-white")} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ConvexClientProvider>
      </body>
    </html>
  )
}
