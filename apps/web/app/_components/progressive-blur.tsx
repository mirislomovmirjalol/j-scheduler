// Single backdrop-filter layer, single modest blur amount, faded via one
// mask-image gradient. Two other techniques were tried and both made
// things worse on real devices:
//
// 1. Stacking several masked layers of increasing blur strength (the
//    original MagicUI-derived approach) — WKWebView-based in-app browsers
//    have a tight compositing budget and tend to flatten/cull most of the
//    overlapping layers, showing a hard cutoff instead of a gradual ramp.
// 2. Stacking several unmasked layers of decreasing height, each with the
//    same modest blur — without explicit z-index, each layer paints on
//    top of the already-blurred result of the layer beneath it, so the
//    blur compounds sequentially (roughly √N × blur, not N × blur) and
//    quickly overshoots into a fully illegible smear near the edge,
//    cutting off hard instead of fading.
//
// A single layer has nothing to compound and nothing for a compositor to
// flatten unpredictably — one backdrop-filter, one mask, applied once.
export function ProgressiveBlur({
  className,
  height = "140px",
  position = "top",
  blur = 16,
}: {
  className?: string
  height?: string
  position?: "top" | "bottom"
  blur?: number
}) {
  const dir = position === "top" ? "to top" : "to bottom"
  const mask = `linear-gradient(${dir}, transparent 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.75) 70%, black 100%)`

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-10 ${
        position === "top" ? "top-0" : "bottom-0"
      } ${className ?? ""}`}
      style={{
        height,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        maskImage: mask,
        WebkitMaskImage: mask,
        transform: "translateZ(0)",
      }}
    />
  )
}
