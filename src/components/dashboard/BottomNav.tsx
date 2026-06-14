//src/components/dashboard/BottomNav.tsx

'use client'

import {
  Home,
  Wallet,
  BarChart3,
  History,
} from 'lucide-react'

export default function BottomNav({
  page,
  setPage,
}: any) {

  const menus = [
    {
      key: 'home',
      icon: Home,
      label: 'Home',
    },
    {
      key: 'assets',
      icon: Wallet,
      label: 'Wallet',
    },
    {
      key: 'report',
      icon: BarChart3,
      label: 'Insight',
    },
    {
      key: 'history',
      icon: History,
      label: 'History',
    },
  ]

  return (
    <nav className="
      fixed
      bottom-0
      left-0
      right-0
      z-40
      bg-white/90
      backdrop-blur-2xl
      border-t
      border-slate-200
      px-3
      py-3
      flex
      justify-around
    ">

      {menus.map((item) => {

        const Icon = item.icon

        return (
          <button
            key={item.key}
            onClick={() =>
              setPage(item.key)
            }
            className="
              flex
              flex-col
              items-center
              gap-1
            "
          >

            <Icon
              size={22}
              className={
                page === item.key
                  ? 'text-blue-600'
                  : 'text-slate-400'
              }
            />

            <span className={`
              text-[11px]
              font-semibold
              ${
                page === item.key
                  ? 'text-blue-600'
                  : 'text-slate-400'
              }
            `}>
              {item.label}
            </span>

          </button>
        )
      })}

    </nav>
  )
}