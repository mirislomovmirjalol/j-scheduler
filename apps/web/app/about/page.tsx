import type { Metadata, Viewport } from "next"

import PageHero from "@/app/_components/page-hero"
import Mission from "@/app/about/_sections/mission"
import Values from "@/app/about/_sections/values"
import CtaBand from "@/app/_sections/cta-band"

export const metadata: Metadata = {
  title: "О клубе — One Padel",
  description: "История и ценности клуба One Padel.",
}

// This page opens on a light section, so the native browser toolbar
// should start light too — see layout.tsx's default.
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  viewportFit: "cover",
}

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="О КЛУБЕ"
        lines={["История", "One Padel"]}
        intro="Коротко о том, откуда мы взялись и почему клуб устроен именно так."
      />
      <Mission />
      <Values />
      <CtaBand />
    </>
  )
}
