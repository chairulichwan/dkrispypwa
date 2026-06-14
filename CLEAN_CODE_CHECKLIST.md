# Clean Code Checklist

Status: initial workspace update based on pasted snapshot and error reports.

## Files already added/updated in workspace

- `src/components/DashboardHeader.tsx`
- `src/hooks/useRealtimeDebts.ts`
- `src/lib/utils.ts`
- `src/lib/supabase/client.ts`
- `src/components/LayoutProviders.tsx`
- `src/lib/routes.ts`
- `src/lib/account.ts`

## Fixes already reflected in workspace

### 0. Legacy shim removed
Removed the old compatibility shim:

```txt
src/components/account/QuickActionOverlay.tsx
```

Canonical component path is now:

```txt
src/components/accounts/QuickActionOverlay.tsx
```

### 1. Dashboard realtime bug fixed
`DashboardHeader` now requires `userId` and uses:

```tsx
useRealtimeDebts(userId, () => {
  router.refresh()
})
```

### 2. Global toast provider restored
`LayoutProviders` now mounts a global `Toaster`.

### 3. Shared utility file added
Created `src/lib/utils.ts` with:
- `cn`
- `formatRupiah`
- `formatRupiahCompact`
- `formatAccountNumber`
- `maskAccountNumber`

### 4. Browser Supabase client added
Created `src/lib/supabase/client.ts`.

---

## Immediate code fixes to apply in the real repo

### A. `src/app/dashboard/DashboardClient.tsx`
Update `DashboardHeader` call:

```tsx
<DashboardHeader
  userId={userId}
  userName={userName}
  onLogout={handleLogout}
  isLoggingOut={isLoggingOut}
/>
```

### B. `src/components/AccountCards.tsx`
Fix nullable balance usage:

```tsx
formatRupiah(account.balance ?? 0)
```

Recommended cleanup:

```tsx
const balance = account.balance ?? 0
const isEmpty = balance === 0
```

### C. `src/components/accounts/AccountDetailSheet.tsx`
Fix nullable balance usage:

```tsx
const balance = account.balance ?? 0
formatRupiah(balance)
```

---

## High-priority clean code tasks

### 1. Unify routes
Choose one route family only:
- `/account/[id]`
- or `/accounts/[id]`

Then update all links/imports consistently.

### 2. Normalize DB nullable numbers at the boundary
Any DB field like `balance`, `amount`, `current_balance`, `current_value` should be normalized once:

```ts
const balance = row.balance ?? 0
```

Do not spread `number | null` through UI components.

### 3. Remove duplicate implementations
Audit and keep one source of truth for:
- `DashboardClient`
- `BottomNav`
- CSV export utility
- auth flow
- notification/alert system

### 4. Move financial write flows to server/RPC
Client-side multi-step mutations are unsafe.
Move to atomic DB transaction / RPC:
- transfer
- income/expense add
- debt payment
- top up

Current workspace hardening progress:
- transfer mutation flow has been extracted into `src/lib/transfer.ts`
- UI no longer owns the multi-step transfer mutation directly
- next upgrade target is replacing that service implementation with a single RPC/server transaction

### 5. Replace `any`
Focus on these first:
- account detail page/client
- transfer flow
- debts/payment flow
- analytics hooks

---

## Search-and-fix patterns

### Nullable number rendering
Search:

```txt
formatRupiah(
formatCurrency(
formatRupiahCompact(
```

If the argument comes from DB, convert to:

```ts
value ?? 0
```

### Broken template literal syntax from pasted snapshot
Search for suspicious forms like:

```txt
router.push`
.select`
.or`
channel`
message=`
```

These should be converted to normal function calls / JSX expressions.

### DashboardHeader callers
Search:

```txt
<DashboardHeader
```

Ensure every caller passes:

```tsx
userId={userId}
```

---

## Recommended next refactors

1. Split `AccountDetailClient.tsx`
   - `AccountHeader`
   - `AccountOverviewTab`
   - `AccountSettingsTab`
   - `RecentTransactionsList`
   - `DeleteAccountDialog`

2. Split `TransferClient.tsx`
   - form UI
   - account pickers
   - submit service

3. Add typed service functions
   - `performTransfer(...)`
   - `recordIncome(...)`
   - `recordExpense(...)`
   - `recordDebtPayment(...)`

4. Centralize query helpers
   - `getUserAccounts(userId)`
   - `getAccountTransactions(accountId, userId)`
   - `getDebtPayments(debtId)`

---

## Rule of thumb for this project

- one feature = one main implementation
- normalize DB data early
- UI should not own multi-step financial mutations
- avoid `any`
- keep internal values consistent
- make UI text match actual behavior
