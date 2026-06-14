export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  notifications: "/notifications",
  analytics: "/analytics",
  debts: "/debts",
  transfer: "/transfer",
  profile: "/profile",
  addAccount: "/add-account",
  topup: "/topup",
  accountsList: "/accounts",
} as const

export function accountDetailHref(accountId: string, tab?: string) {
  return tab ? `/account/${accountId}?tab=${tab}` : `/account/${accountId}`
}

export function transferFromHref(accountId?: string) {
  return accountId ? `${ROUTES.transfer}?from=${accountId}` : ROUTES.transfer
}

export function topupAccountHref(accountId: string) {
  return `${ROUTES.topup}?account=${accountId}`
}

