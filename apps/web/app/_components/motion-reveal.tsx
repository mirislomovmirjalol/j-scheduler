"use client"

import { motion } from "motion/react"

// Single-block scroll reveal (section headings, standalone paragraphs) —
// fade + rise, once, per Emil Kowalski's animation framework: entering
// content uses ease-out, occasional (scroll-triggered) animation is fine
// at standard UI speed. Kept under 300ms per his "UI animations should
// stay under 300ms" rule — this isn't a marketing hero moment, just a
// reveal, so it doesn't earn the longer marketing-animation exception.
export function MotionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Orchestrated stagger for card grids — each direct child staggers in
// 60ms behind the previous one (within the 30-80ms range the skill
// recommends), so groups read as a cascade instead of popping in at once.
export function MotionStagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
