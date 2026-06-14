# Patch Snippets

## 1. `DashboardClient.tsx`

```tsx
<DashboardHeader
  userId={userId}
  userName={userName}
  onLogout={handleLogout}
  isLoggingOut={isLoggingOut}
/>
```

---

## 2. `AccountCards.tsx`

### Before
```tsx
aria-label={`${cfg.label} ${account.name}, saldo ${isEmpty ? 'kosong' : formatRupiah(account.balance)}`}
```

### After
```tsx
aria-label={`${cfg.label} ${account.name}, saldo ${isEmpty ? 'kosong' : formatRupiah(account.balance ?? 0)}`}
```

### Before
```tsx
{isEmpty ? "—" : formatRupiah(account.balance)}
```

### After
```tsx
{isEmpty ? "—" : formatRupiah(account.balance ?? 0)}
```

### Cleaner version
```tsx
const balance = account.balance ?? 0
const isEmpty = balance === 0
```

---

## 3. `AccountDetailSheet.tsx`

### Before
```tsx
{formatRupiah(account.balance)}
```

### After
```tsx
{formatRupiah(account.balance ?? 0)}
```

### Cleaner version
```tsx
const balance = account.balance ?? 0
```

Then use:

```tsx
{formatRupiah(balance)}
```

---

## 4. Route consistency

If canonical route is:

```txt
/account/[id]
```

then examples should become:

```tsx
router.push(`/account/${accountId}?tab=${tabId}`, { scroll: false })
```

```tsx
router.push(`/account/${account.id}?tab=settings`)
```

```tsx
router.push(`/account/${account.id}?tab=overview`)
```

---

## 5. CSV export before delete

### Before
```ts
await softDeleteAccount(account.id)
```

### After
```ts
exportTransactionsCSV(transactions, account.name)
await softDeleteAccount(account.id)
```

---

## 6. Fix broken query chaining style

### Before
```ts
.select`transactions!transactions_account_id_fkey (amount)`)
```

### After
```ts
.select(`
  transactions!transactions_account_id_fkey (amount)
`)
```

---

## 7. Fix broken `router.push` template form

### Before
```ts
router.push`/account/${accountId}?tab=${tabId}`, { scroll: false })
```

### After
```ts
router.push(`/account/${accountId}?tab=${tabId}`, { scroll: false })
```

---

## 8. Fix JSX template prop

### Before
```tsx
message=`"${undoData.accountName}" telah dihapus`}
```

### After
```tsx
message={`"${undoData.accountName}" telah dihapus`}
```
