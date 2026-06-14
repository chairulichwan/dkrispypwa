// src/lib/account-utils.ts
import { ACCOUNT_STYLE, AccountType } from '@/app/dashboard/types'

export const E_WALLET_TYPES: AccountType[] = ['e-wallet', 'ovo', 'gopay', 'qris', 'toko', 'online shop', 'freelance',  'jasa', 'kuliner', 'usaha lainnya'  ]

export function mapAccounts(raw: any[]) {
  return raw.map((acc) => ({
    ...acc,
    balance: Number(acc.balance) || 0,
    bgColor: ACCOUNT_STYLE[acc.type as AccountType]?.bgColor ?? 'bg-gray-50',
    iconBg: ACCOUNT_STYLE[acc.type as AccountType]?.iconBg ?? 'bg-gray-100 text-gray-600',
  }))
}

export function calcTotals(accounts: ReturnType<typeof mapAccounts>) {
  return {
    totalWealth: accounts.reduce((s, a) => s + a.balance, 0),
    walletTotal: accounts
      .filter((a) => E_WALLET_TYPES.includes(a.type as AccountType))
      .reduce((s, a) => s + a.balance, 0),
  }
}