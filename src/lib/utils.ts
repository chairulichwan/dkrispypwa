// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`
    return `Rp ${value}`
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1)}M`
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}jt`
  }
  if (amount >= 100_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return formatRupiah(amount)
}

export function formatAccountNumber(num: string | null | undefined): string {
  if (!num) return ""
  return num.replace(/(.{4})/g, "$1 ").trim()
}

export function maskAccountNumber(num: string | null | undefined): string {
  if (!num) return "•••• ••••"
  const last4 = num.slice(-4)
  const masked = "•".repeat(Math.max(0, num.length - 4))
  return formatAccountNumber(masked + last4)
}

