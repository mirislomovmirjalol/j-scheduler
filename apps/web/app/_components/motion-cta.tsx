"use client"

import { motion } from "motion/react"

// Spring hover/tap feedback for every primary CTA on the site — decorative
// interaction, so spring physics over a fixed-duration ease per Emil
// Kowalski's animation-decision framework (springs feel "alive"; buttons
// must feel responsive to press). Scales DOWN on both hover and tap
// (tap scaling further down than hover) rather than growing on hover —
// a shrink reads as "pressing into" the button, which is the intended
// feel; growing on hover looks inflated instead of responsive.
export default function MotionCta({
  href,
  children,
  className,
  external = true,
}: {
  href: string
  children: React.ReactNode
  className?: string
  external?: boolean
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={className}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.35 }}
    >
      {children}
    </motion.a>
  )
}
