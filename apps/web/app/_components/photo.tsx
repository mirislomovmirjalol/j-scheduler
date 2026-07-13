import Image from "next/image"

import PhotoSlot from "@/app/_components/photo-slot"

// Pairs with getImagePath: renders the real photo when one exists on
// disk, otherwise falls back to the existing court-line placeholder so
// sections never look broken while photography is still pending.
export default function Photo({
  src,
  alt,
  label,
  tone = "court",
  className,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority = false,
}: {
  src: string | null
  alt: string
  label: string
  tone?: "court" | "clay" | "ink"
  className?: string
  sizes?: string
  priority?: boolean
}) {
  if (!src) {
    return <PhotoSlot label={label} tone={tone} className={className} />
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  )
}
