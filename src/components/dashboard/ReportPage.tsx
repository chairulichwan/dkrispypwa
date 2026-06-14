//src/components/dashboard/ReportPage.tsx

'use client'

import {
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts'

const data = [
  { value: 40 },
  { value: 80 },
  { value: 60 },
  { value: 120 },
  { value: 90 },
  { value: 160 },
]

export default function ReportPage() {
  return (
    <div className="space-y-5">

      <div className="
        h-[180px]
        bg-white/10
        rounded-2xl
        p-4
        backdrop-blur-xl
      ">

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>

            <Line
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={false}
            />

          </LineChart>
        </ResponsiveContainer>

      </div>

    </div>
  )
}