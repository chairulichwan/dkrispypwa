// src/components/LayoutProviders.tsx
"use client"

import type { ReactNode } from "react"
import { Toaster } from "react-hot-toast"

interface LayoutProvidersProps {
  children: ReactNode
}

export default function LayoutProviders({ children }: LayoutProvidersProps) {
  return (
    <>
      {children}
      <Toaster position="bottom-center" />
    </>
  )
}
