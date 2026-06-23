export const EASE_OUT_SMOOTH = [0.23, 1, 0.32, 1] as const

export const IOS_SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
}

export const INTERACTIVE_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
}

export const TAP_FEEDBACK = {
  scale: 0.96,
  filter: "brightness(0.95)",
} as const

export function fadeUp(delay = 0, y = 20, duration = 0.5) {
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration,
      delay,
      ease: EASE_OUT_SMOOTH,
    },
  }
}
