import CommunityPreview from "@/app/_sections/community-preview"
import CtaBand from "@/app/_sections/cta-band"
import Hero from "@/app/_sections/hero"
import HowItWorks from "@/app/_sections/how-it-works"
import TournamentsPreview from "@/app/_sections/tournaments-preview"
import { getImagePath } from "@/app/_lib/media"

export default function HomePage() {
  return (
    <>
      <Hero bgImage={getImagePath("hero")} />
      <HowItWorks />
      <TournamentsPreview />
      <CommunityPreview />
      <CtaBand />
    </>
  )
}
