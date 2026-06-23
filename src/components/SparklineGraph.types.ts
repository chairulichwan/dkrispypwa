export type ChartPoint = {
  x: number
  y: number
  value: number
  index: number
}

export interface SparklineGraphProps {
  trendPoints: number[]
  isPositive: boolean
  strokeColor: string
  isLoading: boolean
  timeLabels?: string[] // e.g., ["Sen", "Sel", "Rab", "Kam", "Jum"]
  timestamps?: string[] // ISO date strings for auto-generating labels
}

export interface TooltipData {
  point: ChartPoint
  timeLabel?: string
}