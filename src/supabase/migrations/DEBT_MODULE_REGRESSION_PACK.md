# Debt Module Regression Pack

Regression pack ini dipakai setiap kali:
- mengubah UI debt module
- mengubah RPC debt
- mengubah schema debt
- mengubah logic installment / payment

Tujuan:
- memastikan modul debt tidak regress
- memastikan ledger tetap konsisten

---

# 1. Quick Smoke Regression

## 1.1 Create without account
- buat piutang tanpa akun
- expected:
  - debt dibuat
  - `account_id = null`
  - `origination_transaction_id = null`
  - saldo akun tidak berubah

## 1.2 Create with account (piutang)
- buat piutang dengan akun
- expected:
  - saldo akun turun sebesar pokok
  - transaction `expense / Piutang Pokok`
  - `origination_transaction_id` terisi

## 1.3 Create with account (hutang)
- buat hutang dengan akun
- expected:
  - saldo akun naik sebesar pokok
  - transaction `income / Hutang Pokok`

## 1.4 Insufficient balance guard
- pilih piutang
- pilih akun saldo kecil
- isi nominal lebih besar dari saldo
- expected:
  - warning muncul
  - tombol simpan disable

## 1.5 Flat installment create
- create debt flat
- expected:
  - `interest_type = flat`
  - `interest_rate_unit = monthly`
  - installment terbentuk

## 1.6 Efektif installment create
- create debt efektif
- expected:
  - `interest_type = efektif`
  - `interest_rate_unit = annual`
  - installment terbentuk

---

# 2. Edit Regression

## 2.1 Unpaid debt full edit
- ubah nominal
- ubah bunga
- ubah tenor
- ubah akun
- expected:
  - update sukses
  - installment regenerate
  - transaksi origination lama dibalik
  - transaksi origination baru dibuat

## 2.2 Paid debt metadata-only
- buka debt yang sudah punya payment
- expected:
  - nominal terkunci
  - akun terkunci
  - bunga terkunci
  - tenor terkunci
  - tipe terkunci
  - kontak/due date/deskripsi bisa diubah

## 2.3 Clear description
- clear description
- expected:
  - `description = null`

## 2.4 Clear due date
- clear due date
- expected:
  - `due_date = null`

---

# 3. Payment Regression

## 3.1 Partial payment without account
- expected:
  - payment header insert
  - allocation insert
  - debt summary update
  - tanpa mutasi akun

## 3.2 Partial payment with account (piutang)
- expected:
  - saldo akun naik
  - transaction `income / Pembayaran Piutang`

## 3.3 Partial payment with account (hutang)
- expected:
  - saldo akun turun
  - transaction `expense / Pembayaran Hutang`

## 3.4 Overpay protection
- expected:
  - warning UI
  - submit ditolak
  - tidak ada payment baru

## 3.5 Full settlement
- expected:
  - debt `status = lunas`
  - `settled_at` terisi
  - semua installment `status = lunas`

---

# 4. Allocation Regression

## 4.1 Oldest-first allocation
- payment masuk ke installment tertua lebih dulu

## 4.2 Interest-first allocation
- dalam installment, bunga dibayar dulu baru pokok

## 4.3 Payment allocation sheet
- klik payment di riwayat
- expected:
  - allocation detail muncul
  - principal split muncul
  - interest split muncul
  - installment target muncul

---

# 5. Legacy Data Regression

## 5.1 Debt without installments
Query:
```sql
select
  count(*) filter (
    where not exists (
      select 1
      from public.debt_installments di
      where di.debt_id = d.id
    )
  ) as debts_without_installments,
  count(*) as total_debts
from public.debts d;
```
Expected:
- `debts_without_installments = 0`

## 5.2 Payments without allocation
Query:
```sql
select
  d.id,
  count(distinct dp.id) as payment_rows,
  count(distinct dpa.id) as allocation_rows
from public.debts d
left join public.debt_payments dp on dp.debt_id = d.id
left join public.debt_payment_allocations dpa on dpa.debt_id = d.id
group by d.id
having count(distinct dp.id) > 0
   and count(distinct dpa.id) = 0;
```
Expected:
- 0 row

---

# 6. Core Consistency Queries

## 6.1 Debt header consistency
```sql
select
  d.id,
  d.amount,
  d.total_interest,
  d.total_amount_due,
  d.paid_principal,
  d.paid_interest,
  d.paid_amount
from public.debts d
where d.total_amount_due <> (d.amount + d.total_interest)
   or d.paid_amount <> (d.paid_principal + d.paid_interest)
order by d.created_at desc;
```
Expected:
- 0 row

## 6.2 Installment consistency
```sql
select
  di.id,
  di.debt_id,
  di.period_no,
  di.principal_due,
  di.interest_due,
  di.total_due,
  di.principal_paid,
  di.interest_paid,
  di.total_paid
from public.debt_installments di
where di.total_due <> (di.principal_due + di.interest_due)
   or di.total_paid <> (di.principal_paid + di.interest_paid)
order by di.created_at desc;
```
Expected:
- 0 row

## 6.3 Payment header consistency
```sql
select
  dp.id,
  dp.debt_id,
  dp.amount,
  dp.principal_amount,
  dp.interest_amount
from public.debt_payments dp
where dp.amount <> (dp.principal_amount + dp.interest_amount)
order by dp.paid_at desc;
```
Expected:
- 0 row

## 6.4 Allocation vs payment consistency
```sql
select
  dp.id as payment_id,
  dp.debt_id,
  dp.amount,
  dp.principal_amount,
  dp.interest_amount,
  coalesce(sum(dpa.total_amount), 0) as allocation_total,
  coalesce(sum(dpa.principal_amount), 0) as allocation_principal,
  coalesce(sum(dpa.interest_amount), 0) as allocation_interest
from public.debt_payments dp
left join public.debt_payment_allocations dpa
  on dpa.payment_id = dp.id
group by dp.id, dp.debt_id, dp.amount, dp.principal_amount, dp.interest_amount
having dp.amount <> coalesce(sum(dpa.total_amount), 0)
    or dp.principal_amount <> coalesce(sum(dpa.principal_amount), 0)
    or dp.interest_amount <> coalesce(sum(dpa.interest_amount), 0)
order by dp.id;
```
Expected:
- 0 row

## 6.5 Debt summary vs installment summary
```sql
select
  d.id,
  d.amount,
  d.total_interest,
  d.total_amount_due,
  d.paid_principal,
  d.paid_interest,
  d.paid_amount,
  coalesce(sum(di.principal_due), 0) as installments_principal_due,
  coalesce(sum(di.interest_due), 0) as installments_interest_due,
  coalesce(sum(di.total_due), 0) as installments_total_due,
  coalesce(sum(di.principal_paid), 0) as installments_principal_paid,
  coalesce(sum(di.interest_paid), 0) as installments_interest_paid,
  coalesce(sum(di.total_paid), 0) as installments_total_paid
from public.debts d
left join public.debt_installments di on di.debt_id = d.id
group by d.id, d.amount, d.total_interest, d.total_amount_due, d.paid_principal, d.paid_interest, d.paid_amount
having d.amount <> coalesce(sum(di.principal_due), 0)
   or d.total_interest <> coalesce(sum(di.interest_due), 0)
   or d.total_amount_due <> coalesce(sum(di.total_due), 0)
   or d.paid_principal <> coalesce(sum(di.principal_paid), 0)
   or d.paid_interest <> coalesce(sum(di.interest_paid), 0)
   or d.paid_amount <> coalesce(sum(di.total_paid), 0)
order by d.id;
```
Expected:
- 0 row

## 6.6 Debt summary vs payment summary
```sql
select
  d.id,
  d.paid_amount,
  d.paid_principal,
  d.paid_interest,
  coalesce(sum(dp.amount), 0) as payment_total,
  coalesce(sum(dp.principal_amount), 0) as payment_principal_total,
  coalesce(sum(dp.interest_amount), 0) as payment_interest_total
from public.debts d
left join public.debt_payments dp on dp.debt_id = d.id
group by d.id, d.paid_amount, d.paid_principal, d.paid_interest
having d.paid_amount <> coalesce(sum(dp.amount), 0)
   or d.paid_principal <> coalesce(sum(dp.principal_amount), 0)
   or d.paid_interest <> coalesce(sum(dp.interest_amount), 0)
order by d.id;
```
Expected:
- 0 row

---

# 7. iOS / Mobile UX Regression

## 7.1 AddDebtSheet
- keyboard tidak bikin zoom rusak
- warning insufficient funds terlihat jelas
- sheet close smooth

## 7.2 EditDebtSheet
- metadata-only notice terlihat jelas
- field lock jelas
- save smooth

## 7.3 PaymentSheet
- tab switch smooth
- scroll tidak bentrok
- tombol edit aman
- tombol bayar semua aman

## 7.4 Allocation sheet
- open / close halus
- content scroll aman
- safe area bawah aman

---

# 8. Sign-off Rules

Modul dianggap aman setelah perubahan jika:
- quick smoke regression pass
- semua mismatch query = 0 row
- tidak ada debt tanpa installments
- tidak ada payment tanpa allocation
- UI mobile tetap usable

---

# 9. Recommended Regression Order

## Fast path
1. Create piutang + akun
2. Edit unpaid debt
3. Payment partial
4. Payment full settlement
5. Allocation sheet
6. Jalankan 6 consistency queries

## Full path
1. Semua smoke regression create
2. Semua smoke regression edit
3. Semua smoke regression payment
4. Legacy checks
5. Consistency queries
6. iOS UX pass

---

# 10. Current Baseline

Baseline terakhir yang sudah lolos:
- Create = PASS
- Edit = PASS
- Payment = PASS
- Allocation = PASS
- Account Mutation = PASS
- Hybrid Rate = PASS
- Legacy Data = PASS
- Ledger Consistency = PASS
