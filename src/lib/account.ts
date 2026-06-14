import { ACCOUNT_STYLE, type Account, type AccountType } from "@/app/dashboard/types"

export const E_WALLET_TYPES = ["e-wallet", "ovo", "gopay", "qris"] as const

export function normalizeAccount<T extends { type: string; balance: number | null }>(account: T) {
  return {
    ...account,
    balance: Number(account.balance) || 0,
    bgColor: ACCOUNT_STYLE[account.type as AccountType]?.bgColor ?? "bg-gray-50",
    iconBg: ACCOUNT_STYLE[account.type as AccountType]?.iconBg ?? "bg-gray-100 text-gray-600",
  }
}

export function normalizeAccounts<T extends { type: string; balance: number | null }>(accounts: T[]) {
  return accounts.map(normalizeAccount)
}

export function calculateAccountTotals(accounts: Pick<Account, "type" | "balance">[]) {
  const totalWealth = accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0)
  const walletTotal = accounts
    .filter((account) => E_WALLET_TYPES.includes(account.type as (typeof E_WALLET_TYPES)[number]))
    .reduce((sum, account) => sum + (account.balance ?? 0), 0)

  return { totalWealth, walletTotal }
}
