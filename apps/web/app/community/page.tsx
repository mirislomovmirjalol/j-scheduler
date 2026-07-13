import type { Metadata, Viewport } from "next"

import PageHero from "@/app/_components/page-hero"
import CtaBand from "@/app/_sections/cta-band"
import Guidelines from "@/app/community/_sections/guidelines"
import Roster from "@/app/community/_sections/roster"

export const metadata: Metadata = {
  title: "Сообщество — One Padel",
  description: "Как устроены составы, лист ожидания и правила клуба One Padel.",
}

// This page opens on a light section, so the native browser toolbar
// should start light too — see layout.tsx's default.
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  viewportFit: "cover",
}

export default function CommunityPage() {
  return (
    <>
      <PageHero
        eyebrow="СООБЩЕСТВО"
        lines={["Живая команда,", "не приложение"]}
        intro="Составы собирают организаторы клуба. Ниже — как это устроено на практике и что мы просим соблюдать всех, кто играет с нами."
      />
      <Roster />
      <Guidelines />
      <CtaBand />
    </>
  )
}
