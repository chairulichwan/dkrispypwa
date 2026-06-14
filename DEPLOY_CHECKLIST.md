# Deploy Checklist: Supabase RPC Rollout

Date: 2026-06-06

This checklist is the practical rollout guide for activating the RPC-ready client services already prepared in the workspace.

Related files:
- `RPC_PLAN.md`
- `supabase/migrations/20260606_rpc_plan_draft.sql`
- `src/lib/transfer.ts`
- `src/lib/transactions.ts`

---

## 0. Pre-deploy preparation

- [ ] Confirm you have access to the correct Supabase project
- [ ] Confirm schema branch / environment target:
  - [ ] local dev
  - [ ] staging
  - [ ] production
- [ ] Back up or export current schema if needed
- [ ] Confirm real column types in database:
  - [ ] `accounts.id`
  - [ ] `accounts.user_id`
  - [ ] `transactions.id`
  - [ ] `transactions.user_id`
  - [ ] `debts.id`
  - [ ] `debt_payments.id`
- [ ] Verify whether IDs are `uuid` or `text`
- [ ] Verify actual allowed values for:
  - [ ] `transactions.type`
  - [ ] `debts.status`
- [ ] Verify all referenced columns really exist:
  - [ ] `accounts.deleted_at`
  - [ ] `accounts.updated_at`
  - [ ] `transactions.counterparty_account_id`
  - [ ] `debts.paid_amount`
  - [ ] `debts.status`
  - [ ] `debt_payments.paid_at`

---

## 1. Review and adapt SQL draft

Open:
- `supabase/migrations/20260606_rpc_plan_draft.sql`

Before running it:

- [ ] Change function parameter types from `text` to `uuid` if your DB uses UUID IDs
- [ ] Confirm `transactions.type` accepts:
  - [ ] `transfer_out`
  - [ ] `transfer_in`
  - [ ] `income`
  - [ ] `expense`
- [ ] If the DB enum does **not** allow those values:
  - [ ] create migration to extend enum
  - [ ] or adapt RPC to match actual enum strategy
- [ ] Confirm note/category columns are nullable and match inserts
- [ ] Confirm `contacts.name` exists for debt payment function
- [ ] Confirm `accounts.balance` is numeric-compatible

---

## 2. Deploy to local / staging first

Recommended order:

### Transfer RPC
- [ ] Deploy `perform_transfer(...)`
- [ ] Run SQL manually in Supabase SQL editor or migration tool
- [ ] Confirm function appears under Database -> Functions

### Quick transaction RPC
- [ ] Deploy `record_account_transaction(...)`
- [ ] Confirm function appears

### Optional next
- [ ] Deploy `record_debt_payment(...)`

---

## 3. Permissions and security

For each deployed RPC:

- [ ] Set explicit `search_path = public`
- [ ] Use `security definer` only if ownership checks are inside the function
- [ ] Confirm function validates user ownership internally
- [ ] Revoke broad execute if needed
- [ ] Grant execute only to `authenticated`

Recommended checks:

- [ ] Anonymous user cannot call sensitive RPCs successfully
- [ ] Authenticated user cannot mutate another user's account IDs
- [ ] Deleted accounts are rejected where expected

---

## 4. Client service activation check

### Transfer service
File:
- `src/lib/transfer.ts`

Checklist:
- [ ] Confirm service calls `supabase.rpc("perform_transfer", ...)`
- [ ] Confirm parameter names match deployed SQL exactly
- [ ] Confirm RPC returns success payload without parsing issues
- [ ] Confirm error handling shows useful UI message when RPC missing

### Quick transaction service
File:
- `src/lib/transactions.ts`

Checklist:
- [ ] Confirm service calls `supabase.rpc("record_account_transaction", ...)`
- [ ] Confirm parameter names match deployed SQL exactly
- [ ] Confirm income/expense category and note pass through correctly

---

## 5. UI smoke tests after deploy

### Transfer flow
- [ ] Open `/transfer`
- [ ] Select source and destination accounts
- [ ] Transfer valid amount
- [ ] Confirm source balance decreases correctly
- [ ] Confirm destination balance increases correctly
- [ ] Confirm success toast appears
- [ ] Confirm redirect back to dashboard works
- [ ] Confirm both transfer rows exist in `transactions`

### Transfer validation tests
- [ ] Transfer with same source/destination account -> rejected
- [ ] Transfer with zero amount -> rejected
- [ ] Transfer above balance -> rejected
- [ ] Transfer with deleted account -> rejected

### Quick add income
- [ ] Record income from FAB
- [ ] Confirm account balance increases
- [ ] Confirm `transactions` row inserted

### Quick add expense
- [ ] Record expense from FAB
- [ ] Confirm account balance decreases
- [ ] Confirm `transactions` row inserted

### Quick add validation
- [ ] Expense above balance -> rejected
- [ ] Invalid account -> rejected
- [ ] Missing RPC -> shows clear setup error message

---

## 6. Data integrity verification

Run manual DB checks after test transactions.

### Transfer integrity
- [ ] Source account final balance is correct
- [ ] Destination account final balance is correct
- [ ] Exactly 2 transaction rows inserted
- [ ] `transfer_out.account_id = source`
- [ ] `transfer_in.account_id = destination`
- [ ] `counterparty_account_id` is set correctly both ways

### Quick transaction integrity
- [ ] Balance change equals transaction amount
- [ ] Only one transaction row inserted
- [ ] Category and note saved as expected

---

## 7. Concurrency tests

These are very important.

### Transfer concurrency
- [ ] Fire two transfers quickly from the same source account
- [ ] Confirm no overspending occurs
- [ ] Confirm row locking works as expected

### Expense concurrency
- [ ] Fire two expense writes quickly on same account
- [ ] Confirm balance does not go below allowed state due to race condition

---

## 8. Observability / debugging

- [ ] Add temporary logging around client service errors
- [ ] Capture Supabase function error messages during staging
- [ ] Record exact RPC payload used in failing cases
- [ ] Save SQL editor test snippets for future debugging

Useful SQL sanity checks:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'perform_transfer',
    'record_account_transaction',
    'record_debt_payment'
  );
```

---

## 9. Rollback plan

If deploy causes issues:

- [ ] Revert client service changes only if necessary
- [ ] Or keep services and temporarily disable UI entry points
- [ ] Drop broken RPC version if badly misconfigured
- [ ] Re-deploy previous migration revision
- [ ] Restore from backup if schema drift occurred

Suggested rollback order:
1. disable affected UI action
2. inspect function errors
3. patch SQL
4. re-test staging
5. redeploy production

---

## 10. Production release checklist

- [ ] All staging tests passed
- [ ] Concurrency tests passed
- [ ] Ownership checks passed
- [ ] `authenticated` execute permission verified
- [ ] Client services point to correct RPC names
- [ ] DB types regenerated from live schema
- [ ] TypeScript passes after regenerated types
- [ ] Production migration applied
- [ ] Post-release smoke tests completed

---

## 11. Recommended immediate next task after deploy

After transfer and quick-add RPC are live:

- [ ] extract debt payment flow to service
- [ ] switch debt payment to `record_debt_payment(...)`
- [ ] remove any remaining direct multi-step financial mutations from client components

---

## 12. Short version

### Deploy first
- [ ] `perform_transfer`
- [ ] `record_account_transaction`

### Then verify
- [ ] transfer works
- [ ] quick add works
- [ ] balances match transactions
- [ ] no race condition overspend

### Then continue
- [ ] debt payment RPC
- [ ] regenerate DB types
- [ ] remove remaining client-side multi-step writes
