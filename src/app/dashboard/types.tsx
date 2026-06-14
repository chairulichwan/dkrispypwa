// src/app/dashboard/types.tsx
import type { ReactNode } from "react"
import {
  Banknote,
  Building2,
  Briefcase,
  Coins,
  CreditCard,
  Globe,
  Landmark,
  PiggyBank,
  QrCode,
  ShoppingBag,
  Smartphone,
  User,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wrench,
} from "lucide-react"

export interface AccountStyleConfig {
  bgColor: string
  iconBg: string
  gradient: string
  border: string
  accentColor: string
  icon: ReactNode
  label: string
}

export interface Account {
  id: string
  user_id?: string
  type: string
  name: string
  balance: number | null
  account_number?: string | null
  is_default?: boolean | null
  color?: string | null
  icon?: string | null
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  bgColor: string
  iconBg: string
}

export const ACCOUNT_STYLE: Record<string, AccountStyleConfig> = {
  tunai: {
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100 text-emerald-600",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/20",
    accentColor: "#10b981",
    icon: <Banknote size={18} />,
    label: "Tunai",
  },

  rekening: {
    bgColor: "bg-sky-50",
    iconBg: "bg-sky-100 text-sky-700",
    gradient: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/20",
    accentColor: "#0ea5e9",
    icon: <Building2 size={18} />,
    label: "Rekening",
  },

  BCA: {
    bgColor: "bg-blue-50",
    iconBg: "bg-blue-100 text-blue-700",
    gradient: "from-blue-600/25 to-blue-400/10",
    border: "border-blue-500/30",
    accentColor: "#0056b8",
    icon: <Building2 size={18} />,
    label: "BCA",
  },

  Mandiri: {
    bgColor: "bg-yellow-50",
    iconBg: "bg-yellow-100 text-yellow-800",
    gradient: "from-yellow-500/25 to-orange-400/10",
    border: "border-yellow-500/30",
    accentColor: "#ffc72c",
    icon: <Landmark size={18} />,
    label: "Mandiri",
  },

  BNI: {
    bgColor: "bg-orange-50",
    iconBg: "bg-orange-100 text-orange-700",
    gradient: "from-orange-600/25 to-red-400/10",
    border: "border-orange-500/30",
    accentColor: "#e65100",
    icon: <Building2 size={18} />,
    label: "BNI",
  },

  BRI: {
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-600/25 to-teal-400/10",
    border: "border-emerald-500/30",
    accentColor: "#009245",
    icon: <Coins size={18} />,
    label: "BRI",
  },

  BSI: {
    bgColor: "bg-teal-50",
    iconBg: "bg-teal-100 text-teal-700",
    gradient: "from-teal-600/25 to-cyan-400/10",
    border: "border-teal-500/30",
    accentColor: "#00897b",
    icon: <Building2 size={18} />,
    label: "BSI",
  },

  BTN: {
    bgColor: "bg-red-50",
    iconBg: "bg-red-100 text-red-700",
    gradient: "from-red-600/25 to-rose-400/10",
    border: "border-red-500/30",
    accentColor: "#da291c",
    icon: <Building2 size={18} />,
    label: "BTN",
  },

  CIMB: {
    bgColor: "bg-rose-50",
    iconBg: "bg-rose-100 text-rose-700",
    gradient: "from-rose-600/25 to-pink-400/10",
    border: "border-rose-500/30",
    accentColor: "#e30613",
    icon: <CreditCard size={18} />,
    label: "CIMB Niaga",
  },

  Danamon: {
    bgColor: "bg-lime-50",
    iconBg: "bg-lime-100 text-lime-700",
    gradient: "from-lime-600/25 to-green-400/10",
    border: "border-lime-500/30",
    accentColor: "#8dc63f",
    icon: <Building2 size={18} />,
    label: "Danamon",
  },

  Permata: {
    bgColor: "bg-purple-50",
    iconBg: "bg-purple-100 text-purple-700",
    gradient: "from-purple-600/25 to-violet-400/10",
    border: "border-purple-500/30",
    accentColor: "#7b3f9c",
    icon: <Building2 size={18} />,
    label: "Permata Bank",
  },

  OCBC: {
    bgColor: "bg-indigo-50",
    iconBg: "bg-indigo-100 text-indigo-700",
    gradient: "from-indigo-600/25 to-blue-400/10",
    border: "border-indigo-500/30",
    accentColor: "#003da5",
    icon: <Globe size={18} />,
    label: "OCBC NISP",
  },

  SeaBank: {
    bgColor: "bg-sky-50",
    iconBg: "bg-sky-100 text-sky-600",
    gradient: "from-sky-500/25 to-cyan-400/10",
    border: "border-sky-400/30",
    accentColor: "#00c2d6",
    icon: <Smartphone size={18} />,
    label: "SeaBank",
  },

  Jago: {
    bgColor: "bg-lime-50",
    iconBg: "bg-lime-100 text-lime-600",
    gradient: "from-lime-500/25 to-emerald-400/10",
    border: "border-lime-400/30",
    accentColor: "#1dd1a1",
    icon: <Wallet size={18} />,
    label: "Bank Jago",
  },

  Blu: {
    bgColor: "bg-blue-50",
    iconBg: "bg-blue-100 text-blue-600",
    gradient: "from-blue-500/25 to-indigo-400/10",
    border: "border-blue-400/30",
    accentColor: "#00a8e8",
    icon: <Smartphone size={18} />,
    label: "Blu by BCA Digital",
  },

  Jenius: {
    bgColor: "bg-fuchsia-50",
    iconBg: "bg-fuchsia-100 text-fuchsia-600",
    gradient: "from-fuchsia-500/25 to-pink-400/10",
    border: "border-fuchsia-400/30",
    accentColor: "#d6007e",
    icon: <Smartphone size={18} />,
    label: "Jenius",
  },

  gopay: {
    bgColor: "bg-teal-50",
    iconBg: "bg-teal-100 text-teal-700",
    gradient: "from-teal-500/20 to-emerald-500/10",
    border: "border-teal-500/30",
    accentColor: "#0d9488",
    icon: <Wallet size={18} />,
    label: "GoPay",
  },

  ovo: {
    bgColor: "bg-purple-50",
    iconBg: "bg-purple-100 text-purple-700",
    gradient: "from-purple-600/20 to-violet-500/10",
    border: "border-purple-500/30",
    accentColor: "#7c3aed",
    icon: <Wallet size={18} />,
    label: "OVO",
  },

  grabfood: {
    bgColor: "bg-green-50",
    iconBg: "bg-green-100 text-green-700",
    gradient: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/30",
    accentColor: "#16a34a",
    icon: <UtensilsCrossed size={18} />,
    label: "GrabFood",
  },

  shopeefood: {
    bgColor: "bg-orange-50",
    iconBg: "bg-orange-100 text-orange-600",
    gradient: "from-orange-500/20 to-amber-500/10",
    border: "border-orange-500/30",
    accentColor: "#f97316",
    icon: <ShoppingBag size={18} />,
    label: "ShopeeFood",
  },

  qris: {
    bgColor: "bg-indigo-50",
    iconBg: "bg-indigo-100 text-indigo-700",
    gradient: "from-indigo-500/20 to-blue-500/10",
    border: "border-indigo-500/30",
    accentColor: "#4f46e5",
    icon: <QrCode size={18} />,
    label: "QRIS",
  },

  toko: {
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100 text-amber-600",
    gradient: "from-amber-500/20 to-orange-600/10",
    border: "border-amber-500/20",
    accentColor: "#f59e0b",
    icon: <Building2 size={18} />,
    label: "Toko / Retail",
  },

  "online-shop": {
    bgColor: "bg-pink-50",
    iconBg: "bg-pink-100 text-pink-600",
    gradient: "from-pink-500/20 to-rose-600/10",
    border: "border-pink-500/20",
    accentColor: "#ec4899",
    icon: <Smartphone size={18} />,
    label: "Toko Online",
  },

  freelance: {
    bgColor: "bg-cyan-50",
    iconBg: "bg-cyan-100 text-cyan-600",
    gradient: "from-cyan-500/20 to-sky-600/10",
    border: "border-cyan-500/20",
    accentColor: "#06b6d4",
    icon: <User size={18} />,
    label: "Freelance",
  },

  jasa: {
    bgColor: "bg-indigo-50",
    iconBg: "bg-indigo-100 text-indigo-600",
    gradient: "from-indigo-500/20 to-violet-600/10",
    border: "border-indigo-500/20",
    accentColor: "#6366f1",
    icon: <Wrench size={18} />,
    label: "Bisnis Jasa",
  },

  kuliner: {
    bgColor: "bg-red-50",
    iconBg: "bg-red-100 text-red-600",
    gradient: "from-red-500/20 to-orange-600/10",
    border: "border-red-500/20",
    accentColor: "#ef4444",
    icon: <Utensils size={18} />,
    label: "Kuliner / F&B",
  },

  "usaha-lainnya": {
    bgColor: "bg-slate-50",
    iconBg: "bg-slate-100 text-slate-600",
    gradient: "from-slate-500/20 to-gray-600/10",
    border: "border-slate-500/20",
    accentColor: "#64748b",
    icon: <Briefcase size={18} />,
    label: "Usaha Lainnya",
  },
}

export type AccountType = keyof typeof ACCOUNT_STYLE
