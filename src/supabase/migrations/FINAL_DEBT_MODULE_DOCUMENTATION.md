# Final Debt Module Documentation

Dokumentasi final untuk modul **Hutang / Piutang** pada aplikasi Next.js + Supabase.

---

## 1. Tujuan Modul

Modul ini dipakai untuk mengelola:
- pencatatan **piutang**
- pencatatan **hutang**
- cicilan / installment schedule
- pembayaran bertahap
- alokasi pembayaran ke cicilan
- mutasi akun terkait debt
- edit debt dengan guard ledger

Fokus utamanya adalah **ledger correctness** dan **UI mobile-friendly**.

---

## 2. Rule Bisnis Final

### 2.1 Tipe debt
- `piutang` = uang keluar / kita meminjamkan ke orang lain
- `hutang` = uang masuk / kita menerima pinjaman dari orang lain

### 2.2 Create debt + account mutation
#### Piutang + pilih akun
- saldo akun **berkurang** sebesar **pokok**
- dibuat transaksi akun:
  - `type = expense`
  - `category = Piutang Pokok`

#### Hutang + pilih akun
- saldo akun **bertambah** sebesar **pokok**
- dibuat transaksi akun:
  - `type = income`
  - `category = Hutang Pokok`

#### Tanpa akun
- debt tetap dibuat
- **tanpa mutasi saldo akun**
- `origination_transaction_id = null`

### 2.3 Hybrid rate final
- `flat` = **rate bulanan**
- `efektif` = **rate tahunan**

### 2.4 Perhitungan bunga
#### Flat
- bunga dihitung dari pokok awal tetap
- `monthlyRate = ratePercent / 100`

#### Efektif
- bunga dihitung dari sisa pokok
- `monthlyRate = ratePercent / 100 / 12`

### 2.5 Payment allocation rule
Pembayaran harus dialokasikan:
1. ke cicilan **tertua dulu**
2. dalam tiap cicilan: **bunga dulu**, lalu **pokok**

### 2.6 Edit debt rule
#### Belum dibayar (`paid_amount = 0`)
- boleh **full edit**
- boleh ubah:
  - tipe debt
  - kontak
  - akun
  - nominal
  - bunga
  - tenor
  - tanggal mulai
  - due date
  - deskripsi

#### Sudah dibayar (`paid_amount > 0`)
- hanya **metadata-only**
- boleh ubah:
  - kontak
  - due date
  - deskripsi
- tidak boleh ubah:
  - nominal
  - akun
  - tipe
  - bunga
  - tenor
  - start date

---

## 3. Arsitektur Data Final

### 3.1 Tabel utama
#### `debts`
Header / kontrak utama debt.

Field penting:
- `id`
- `user_id`
- `contact_id`
- `account_id`
- `type`
- `amount` = pokok
- `paid_amount`
- `paid_principal`
- `paid_interest`
- `total_interest`
- `total_amount_due`
- `interest_rate`
- `interest_type`
- `interest_rate_unit`
- `installment_count`
- `installment_amount`
- `start_date`
- `disbursed_at`
- `settled_at`
- `origination_transaction_id`

#### `debt_installments`
Ledger cicilan per periode.

Field penting:
- `debt_id`
- `period_no`
- `due_date`
- `principal_due`
- `interest_due`
- `total_due`
- `principal_paid`
- `interest_paid`
- `total_paid`
- `status`
- `paid_at`

#### `debt_payments`
Header event pembayaran.

Field penting:
- `debt_id`
- `amount`
- `principal_amount`
- `interest_amount`
- `account_id`
- `account_transaction_id`
- `note`
- `paid_at`

Constraint penting:
- `amount = principal_amount + interest_amount`

#### `debt_payment_allocations`
Rincian alokasi pembayaran ke installment.

Field penting:
- `payment_id`
- `debt_id`
- `installment_id`
- `principal_amount`
- `interest_amount`
- `total_amount`

---

## 4. RPC Final

### 4.1 `create_debt_record`
Tugas:
- validasi input
- validasi contact
- validasi akun
- mutasi akun bila dipilih
- buat debt header
- generate installment
- buat origination transaction
- simpan `origination_transaction_id`

Return penting:
- `success`
- `debt_id`
- `contact_id`
- `status`
- `total_interest`
- `total_amount_due`
- `interest_type`
- `interest_rate_unit`
- `account_transaction_id`
- `account_balance`
- `origination_transaction_id`

### 4.2 `update_debt_record`
Tugas:
- deteksi mode `full_edit` vs `metadata_only`
- unpaid debt:
  - reverse origination lama
  - clear FK `origination_transaction_id`
  - hapus transaksi lama
  - regenerate installment
  - apply origination baru
- paid debt:
  - hanya update metadata

Return penting:
- `success`
- `debt_id`
- `status`
- `mode`
- `total_interest`
- `total_amount_due`
- `interest_type`
- `interest_rate`
- `interest_rate_unit`
- `installment_count`
- `first_due_date`
- `final_due_date`
- `account_id`
- `account_balance`
- `origination_transaction_id`

### 4.3 `record_debt_payment`
Tugas:
- validasi outstanding
- validasi akun pembayaran
- buat payment header provisional
- alokasi payment ke installment
- update installment
- update debt summary
- buat transaksi akun jika perlu
- update split final payment header

Return penting:
- `success`
- `payment_id`
- `debt_status`
- `debt_paid_amount`
- `paid_principal`
- `paid_interest`
- `outstanding_amount`
- `principal_amount`
- `total_interest`
- `total_amount_due`
- `interest_type`
- `interest_rate`
- `interest_rate_unit`
- `account_transaction_id`
- `account_balance`

---

## 5. Struktur Frontend Final

### 5.1 Halaman dan container
- `src/app/debts/page.tsx`
- `src/app/debts/DebtsClient.tsx`

### 5.2 Komponen utama
- `AddDebtSheet.tsx`
- `EditDebtSheet.tsx`
- `PaymentSheet.tsx`
- `PaymentAllocationSheet.tsx`
- `InstallmentSchedule.tsx`
- `DebtCard.tsx`
- `useAddDebtForm.ts`

### 5.3 Service
- `src/lib/debts.ts`
- `src/lib/installment.ts`

### 5.4 Types
- `src/app/debts/types.ts`

---

## 6. Perilaku UI/UX Final

### 6.1 Debt list
- nominal debt tampil **full rupiah**
- tidak compact (`1jt`, `500rb`, dll tidak dipakai di debt card utama)
- header tetap, list debt yang scroll

### 6.2 Add debt
- warning realtime kalau `piutang > saldo akun`
- tombol simpan disable kalau saldo tidak cukup
- preview cicilan tampil untuk mode cicilan

### 6.3 Edit debt
- tombol edit ada di `PaymentSheet`
- flow aman untuk iOS karena tidak ada nested tap target di debt card
- metadata-only mode tampil dengan notice jelas

### 6.4 Payment
- tombol bayar semua tersedia
- tab:
  - `Catat Bayar`
  - `Jadwal`
  - `Riwayat`

### 6.5 Allocation detail
- klik payment di tab riwayat
- buka `PaymentAllocationSheet`
- tampilkan split principal/bunga dan installment target

---

## 7. Status UAT Terakhir

### Lolos
- Create debt tanpa akun
- Create debt dengan akun
- Guard insufficient funds
- Create flat monthly
- Create efektif annual
- Edit unpaid debt
- Edit paid debt metadata-only
- Clear due date
- Clear description
- Payment partial
- Payment full settlement
- Allocation detail UI
- Mutasi akun saat payment
- Consistency audit ledger
- Legacy audit

### Hasil akhir
- **Create = PASS**
- **Edit = PASS**
- **Payment = PASS**
- **Allocation = PASS**
- **Account Mutation = PASS**
- **Hybrid Rate = PASS**
- **Legacy Data = PASS**
- **Ledger Consistency = PASS**

---

## 8. Known Decisions

1. Header `due_date` boleh `null`
2. Schedule installment tetap punya `due_date` sendiri
3. `description = null` dianggap clear value
4. `due_date = null` dianggap clear value
5. `flat` selalu `interest_rate_unit = monthly`
6. `efektif` selalu `interest_rate_unit = annual`
7. debt yang sudah punya payment tidak boleh ubah financial terms
8. origination lama harus di-clear dari FK sebelum transaksi lama dihapus

---

## 9. Next Enhancement Candidates

Bukan bug core, hanya enhancement:
- archive debt
- reminder jatuh tempo / overdue
- filter urgency
- export statement
- automated test suite
- regression dashboard queries

---

## 10. Definition of Done untuk Core Debt Module

Modul dianggap selesai secara core apabila:
- create debt benar
- edit debt benar
- payment benar
- allocation benar
- mutasi akun benar
- ledger konsisten
- legacy debt tidak ada yang orphan

Status saat ini:
## **DONE untuk core module**
