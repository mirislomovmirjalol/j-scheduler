import type { Metadata, Viewport } from "next"

import PageHero from "@/app/_components/page-hero"
import CtaBand from "@/app/_sections/cta-band"
import Formats from "@/app/tournaments/_sections/formats"
import FormatNote from "@/app/tournaments/_sections/how-to-choose"

export const metadata: Metadata = {
  title: "Турниры — One Padel",
  description: "Два регулярных турнира по уровням в One Padel — играем в основном Американо.",
}

// This page opens on a light section (unlike the dark home hero), so the
// native browser toolbar should start light too — see layout.tsx's default.
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  viewportFit: "cover",
}

export default function TournamentsPage() {
  return (
    <>
      <PageHero
        eyebrow="ТУРНИРЫ"
        lines={["Турниры", "по уровням"]}
        intro="Мы организуем товарищеские игры, а не сдаём корты в аренду. Ниже — какие турниры собираем регулярно и в каком формате играем."
      />
      <Formats />
      <FormatNote />
      <CtaBand />
    </>
  )
}
