// ViewBox & Layout
export const VIEWBOX_WIDTH = 320
export const VIEWBOX_HEIGHT = 120
export const PADDING_X = 12
export const PADDING_Y = 12
export const TOOLTIP_WIDTH = 120

// Chart Dimensions
export const CHART_HEIGHT = VIEWBOX_HEIGHT - PADDING_Y * 2
export const CHART_WIDTH = VIEWBOX_WIDTH - PADDING_X * 2

// Spring Physics Configs
export const SPRING_CONFIG = {
  tooltip: { stiffness: 400, damping: 30, mass: 0.6 },
  tracker: { stiffness: 420, damping: 34, mass: 0.5 },
  entrance: { stiffness: 400, damping: 30 },
} as const

// Animation Durations
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.6,
} as const

// Throttle Settings
export const THROTTLE_MS = 16 // ~60fps

// Zoom & Pan Limits
export const ZOOM_CONFIG = {
  min: 1,
  max: 3,
  step: 0.5,
  default: 1,
} as const

// Keyboard Navigation
export const KEYBOARD_KEYS = {
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  ESCAPE: "Escape",
  ENTER: "Enter",
  SPACE: " ",
} as const

// Colors
export const COLORS = {
  positive: {
    primary: "#10B981",
    crosshair: "rgba(16,185,129,0.5)",
  },
  negative: {
    primary: "#EF4444",
    crosshair: "rgba(239,68,68,0.5)",
  },
  surface: {
    base: "#0B1528",
    glass: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
  },
} as const

// SVG Filter Settings
export const SVG_FILTERS = {
  glow: { stdDeviation: 5 },
  dotGlow: { stdDeviation: 6 },
} as const

// Stroke Widths
export const STROKE_WIDTHS = {
  glow: 8,
  main: 2.8,
  crosshair: 1.2,
} as const

// Opacity Values
export const OPACITY = {
  area: { start: 0.24, middle: 0.08, end: 0 },
  stroke: { start: 0.5, middle: 0.95, end: 1 },
  glow: 0.2,
} as const