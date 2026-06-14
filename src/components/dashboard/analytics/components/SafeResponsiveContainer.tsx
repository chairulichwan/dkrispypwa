//src/components/dashboard/analytics/components/SafeResponsiveContainer.tsx

"use client"

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react"

interface SafeResponsiveContainerProps {
  children: ReactElement<any>
  className?: string
  style?: CSSProperties
  fallback?: ReactElement | null
}

interface Size {
  width: number
  height: number
}

/**
 * Recharts ResponsiveContainer often warns with width(-1)/height(-1)
 * when rendered inside animated / tabbed layouts before the DOM settles.
 *
 * This component measures its own box first, then injects explicit width/height
 * into the chart element. That avoids the noisy warning and makes rendering
 * more stable in motion-heavy layouts.
 */
export default function SafeResponsiveContainer({
  children,
  className,
  style,
  fallback = null,
}: SafeResponsiveContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let raf = 0

    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        const width = Math.floor(rect.width)
        const height = Math.floor(rect.height)

        if (width > 1 && height > 1) {
          setSize((prev) => {
            if (prev?.width === width && prev?.height === height) return prev
            return { width, height }
          })
        }
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("orientationchange", measure)
    window.addEventListener("resize", measure)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener("orientationchange", measure)
      window.removeEventListener("resize", measure)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 1,
        minHeight: 1,
        ...style,
      }}
    >
      {size ? cloneElement(children, { width: size.width, height: size.height }) : fallback}
    </div>
  )
}

