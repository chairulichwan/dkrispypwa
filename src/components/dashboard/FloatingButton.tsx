//src/components/dashboard/FloatingButton.tsx


'use client'

import { Plus } from 'lucide-react'

export default function FloatingButton({
  onClick,
}: any) {

  return (
    <button
      onClick={onClick}
      className="
        fixed
        bottom-24
        left-1/2
        -translate-x-1/2
        z-50
        w-16
        h-16
        rounded-full
        bg-gradient-to-br
        from-blue-600
        to-violet-600
        text-white
        shadow-2xl
        flex
        items-center
        justify-center
      "
    >

      <Plus size={28} />

    </button>
  )
}