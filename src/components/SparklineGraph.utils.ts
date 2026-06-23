import type { ChartPoint } from "./SparklineGraph.types"
import { PADDING_X, PADDING_Y, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./SparklineGraph.constants"

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null
  let lastThis: any
  let timeoutId: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (lastArgs) {
          func.apply(lastThis, lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args
      lastThis = this
    }
  }
}

export function buildSmoothChart(values: number[]) {
  if (values.length < 2) {
    return {
      points: [] as ChartPoint[],
      linePath: "",
      areaPath: "",
    }
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const spread = max - min || 1

  const points: ChartPoint[] = values.map((value, index) => {
    const x = PADDING_X + (index / Math.max(values.length - 1, 1)) * (VIEWBOX_WIDTH - PADDING_X * 2)
    const y =
      VIEWBOX_HEIGHT -
      PADDING_Y -
      ((value - min) / spread) * (VIEWBOX_HEIGHT - PADDING_Y * 2)

    return { x, y, value, index }
  })

  let linePath = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  const bottomY = (VIEWBOX_HEIGHT - PADDING_Y / 2).toFixed(2)
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${bottomY} L ${points[0].x.toFixed(2)} ${bottomY} Z`

  return { points, linePath, areaPath }
}

export function formatTimeLabel(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export function calculateZoomTransform(
  scale: number,
  translateX: number,
  viewBoxWidth: number
) {
  const scaledWidth = viewBoxWidth * scale
  const maxTranslateX = 0
  const minTranslateX = -(scaledWidth - viewBoxWidth)
  
  const clampedTranslateX = clamp(translateX, minTranslateX, maxTranslateX)
  
  return {
    scale,
    x: clampedTranslateX,
    originX: 0,
  }
}