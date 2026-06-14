# RPC Plan: Atomic Financial Mutations

Date: 2026-06-06

This plan defines how to move risky multi-step financial writes out of client components and into atomic Postgres RPC functions.

---

## Why this is needed

Current UI flows still do multi-step writes from the client:

- transfer
- quick add income/expense
- likely debt payment / top up flows in the full app

That means these steps can partially succeed:

1. update account balance
2. insert transaction row
3. update related table
4. insert second transaction row

If any later step fails, balances and history can diverge.

**Target state:** one user action = one RPC call = one DB transaction.

---

## Recommended RPC set

### 1. `perform_transfer(...)`
Use for account-to-account transfers.

#### Purpose
Atomically:
- validate source account ownership
- validate destination account ownership
- validate source balance
- lock both accounts
- debit source
- credit destination
- insert `transfer_out`
- insert `transfer_in`

#### Proposed signature
```sql
perform_transfer(
  p_user_id text,
  p_from_account_id text,
  p_to_account_id text,
  p_amount numeric,
  p_note text default null,
  p_created_at timestamptz default now()
) returns jsonb
```

#### Returns
```json
{
  "success": true,
  "from_balance": 100000,
  "to_balance": 200000,
  "transfer_out_id": "...",
  "transfer_in_id": "..."
}
```

---

### 2. `record_account_transaction(...)`
Use for quick add income/expense and similar single-account mutations.

#### Purpose
Atomically:
- validate account ownership
- lock account row
- validate balance if expense
- update balance
- insert transaction row

#### Proposed signature
```sql
record_account_transaction(
  p_user_id text,
  p_account_id text,
  p_type text,
  p_amount numeric,
  p_category text default null,
  p_note text default null,
  p_created_at timestamptz default now()
) returns jsonb
```

#### Allowed types
- `income`
- `expense`

Optional later:
- `topup`
- `adjustment`

#### Returns
```json
{
  "success": true,
  "transaction_id": "...",
  "new_balance": 150000
}
```

---

### 3. `record_debt_payment(...)`
Use for debt/piutang payment flow.

#### Purpose
Atomically:
- validate debt ownership
- validate remaining amount
- insert `debt_payments`
- update `debts.paid_amount`
- update `debts.status`
- optionally update linked account balance
- optionally insert matching account transaction row

#### Proposed signature
```sql
record_debt_payment(
  p_user_id text,
  p_debt_id text,
  p_amount numeric,
  p_account_id text default null,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_create_account_tx boolean default true
) returns jsonb
```

#### Returns
```json
{
  "success": true,
  "payment_id": "...",
  "debt_status": "aktif",
  "debt_paid_amount": 500000,
  "account_transaction_id": "..."
}
```

---

## DB design rules

### 1. Lock rows during balance mutation
Use:
```sql
select * from accounts where id = ... for update;
```

This prevents race conditions when two writes hit the same account.

### 2. Use one function = one transaction
A Postgres function executes inside a DB transaction. If an exception is raised, all changes roll back.

### 3. Validate ownership inside the function
Do not trust IDs from the client.

Always verify:
```sql
accounts.user_id = p_user_id
transactions.user_id = p_user_id
debts.user_id = p_user_id
```

### 4. Prefer `numeric` for money
Avoid float/double.

### 5. Explicit status transitions
For debt payment:
- `aktif` -> `lunas` only when paid amount >= debt amount

### 6. Normalize notes inside RPC
Example transfer notes:
- `Transfer ke BCA Utama`
- `Transfer dari Dompet Tunai`

---

## Security model recommendation

### Option A — preferred for app simplicity
Use `SECURITY DEFINER` functions with:
- explicit ownership checks
- explicit `search_path`
- revoke execute from public if needed
- grant execute only to authenticated role

#### Example pattern
```sql
security definer
set search_path = public
```

Then inside the function:
```sql
if p_user_id is null then
  raise exception 'Unauthorized';
end if;
```

If using Supabase auth strongly, you can also compare with `auth.uid()` if your schema stores auth UUIDs consistently.

### Option B
Use `SECURITY INVOKER` and rely fully on RLS.

This is safer conceptually but often more painful for multi-table writes.

---

## App integration plan

### Current client services
The workspace already has these service boundaries:

- `src/lib/transfer.ts` → `performTransfer(...)`
- quick add still needs extraction to a service in the real repo if not yet done

### Replace internals, not UI contract
When RPC is ready:

#### Before
```ts
await performTransfer({ ... })
```
where `performTransfer()` manually does CRUD.

#### After
Keep UI the same, change only service internals:
```ts
const { error, data } = await supabase.rpc("perform_transfer", {
  p_user_id: userId,
  p_from_account_id: fromAccountId,
  p_to_account_id: toAccountId,
  p_amount: amount,
  p_note: note,
})
```

Same for quick add:
```ts
await supabase.rpc("record_account_transaction", { ... })
```

Same for debt payment:
```ts
await supabase.rpc("record_debt_payment", { ... })
```

---

## Migration order

### Phase 1
Implement and test:
- `record_account_transaction`
- `perform_transfer`

### Phase 2
Refactor UI services to call RPC.

### Phase 3
Implement:
- `record_debt_payment` ✅ planned client service already exists in `src/lib/debts.ts`

### Phase 4
Optionally add:
- `soft_delete_account_with_export_marker` (DB-side deletion marker only)
- `restore_account`
- `set_account_as_default`

---

## Test checklist

### `perform_transfer`
- [ ] source account exists
- [ ] destination account exists
- [ ] both belong to user
- [ ] source != destination
- [ ] amount > 0
- [ ] insufficient balance throws error
- [ ] balances updated correctly
- [ ] 2 transaction rows inserted
- [ ] rollback if second insert fails
- [ ] concurrent requests do not overspend source

### `record_account_transaction`
- [ ] income increases balance
- [ ] expense decreases balance
- [ ] expense with insufficient balance throws
- [ ] transaction row inserted
- [ ] rollback if insert fails

### `record_debt_payment`
- [ ] debt exists and belongs to user
- [ ] amount > 0
- [ ] amount does not exceed remaining if that is your rule
- [ ] payment row inserted
- [ ] debt paid_amount updated
- [ ] debt status flips to `lunas` when appropriate
- [ ] optional account balance updated correctly
- [ ] optional account transaction inserted correctly

---

## Recommended next implementation after this plan

1. create SQL migration from the draft skeleton
2. implement `perform_transfer`
3. implement `record_account_transaction`
4. patch `src/lib/transfer.ts` to call RPC ✅
5. patch quick-add service/UI to call RPC ✅

---

## Summary

### Immediate win
Move these actions behind RPC first:
- transfer
- quick add income/expense

### Main benefit
- atomic writes
- less duplicated client logic
- safer balances
- cleaner components

### Architectural direction
UI -> service -> RPC -> DB transaction
