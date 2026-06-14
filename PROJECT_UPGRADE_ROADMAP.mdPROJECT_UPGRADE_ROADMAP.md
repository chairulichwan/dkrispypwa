# Project Upgrade Roadmap

Status: pasca hardening debt flow, fokus utama berikutnya adalah merapikan typing live schema, RPC, dan konsistensi service layer.

---

## P0 — Critical / wajib beres dulu

## P0.1 Regenerate Supabase types dari schema live

### Files
- `src/lib/supabase/database.types.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

### Checklist
- [ ] Login Supabase CLI / set `SUPABASE_ACCESS_TOKEN`
- [ ] Generate ulang types live:
  ```bash
  npx supabase gen types typescript --project-id hhwrybyroqbleysrylhl --schema public > src/lib/supabase/database.types.ts
  ```
- [ ] Pastikan table berikut benar-benar ada di generated type:
  - [ ] `accounts`
  - [ ] `transactions`
  - [ ] `profiles`
  - [ ] `debts`
  - [ ] `debt_payments`
  - [ ] `contacts`
  - [ ] `assets`
  - [ ] `liabilities`
  - [ ] `monthly_financial_snapshots`
  - [ ] `cash_flow_predictions`
  - [ ] `alerts`
  - [ ] `budgets`
  - [ ] `categories`
- [ ] Pastikan bagian `Functions` ikut ter-generate untuk RPC analytics/financial
- [ ] Hapus cache:
  ```bash
  rmdir /s /q .next
  ```
- [ ] Jalankan:
  ```bash
  npm run typecheck
  ```

### Outcome
- Error `never` berkurang drastis
- Query `.from(...)` dan `.rpc(...)` mulai typed benar

---

## P0.2 Bereskan semua page/module yang masih bikin typecheck gagal

### Files prioritas dari error list
- `src/app/report/page.tsx`
- `src/app/actions/auth.ts`
- `src/app/add-account/AddAccountClient.tsx`
- `src/app/api/analytics/predictions/generate/route.ts`
- `src/app/profile/page.tsx`
- `src/app/profile/ProfileClient.tsx`
- `src/components/dashboard/analytics/components/AddAssetSheet.tsx`
- `src/hooks/useNetWorth.ts`
- `src/lib/supabase/analytics.ts`
- `src/lib/supabase/queries.ts`

### Checklist
- [ ] `src/app/report/page.tsx`
  - [ ] pastikan valid module
  - [ ] pastikan ada `export default`
- [ ] `src/app/actions/auth.ts`
  - [ ] hilangkan infer `profile = never`
  - [ ] pastikan query `profiles` typed benar
- [ ] `src/app/add-account/AddAccountClient.tsx`
  - [ ] pastikan insert `accounts` tidak infer `never[]`
- [ ] `src/app/api/analytics/predictions/generate/route.ts`
  - [ ] pastikan RPC `get_cash_flow_stats` typed benar
  - [ ] kalau Functions belum tergenerate, fallback sementara pakai `(supabase.rpc as any)(...)`
- [ ] `src/app/profile/page.tsx`
  - [ ] pastikan `accounts` select typed benar
- [ ] `src/app/profile/ProfileClient.tsx`
  - [ ] pastikan `profiles.update(...)` tidak infer `never`
- [ ] `src/components/dashboard/analytics/components/AddAssetSheet.tsx`
  - [ ] pastikan insert `assets` typed benar
- [ ] `src/hooks/useNetWorth.ts`
  - [ ] pastikan insert/update `assets` dan `liabilities` typed benar
- [ ] `src/lib/supabase/analytics.ts`
  - [ ] rapikan semua call RPC analytics
- [ ] `src/lib/supabase/queries.ts`
  - [ ] pastikan `accounts.update({ deleted_at: ... })` typed benar

### Outcome
- `npm run typecheck` tembus 0 error

---

## P0.3 Kunci financial mutation ke service/RPC

### Files
- `src/lib/transfer.ts`
- `src/lib/transactions.ts`
- `src/lib/debts.ts`
- `src/app/transfer/TransferClient.tsx`
- `src/components/QuickAddFAB.tsx`
- `src/app/debts/components/PaymentSheet.tsx`
- `src/app/debts/components/AddDebtSheet.tsx`
- `supabase/migrations/20260606_financial_rpcs_final.sql`

### Checklist
- [ ] `transfer` hanya lewat `perform_transfer`
- [ ] `income/expense` hanya lewat `record_account_transaction`
- [ ] `debt payment` hanya lewat `record_debt_payment`
- [ ] audit semua file dari pattern ini:
  ```txt
  .from("accounts").update(
  .from("transactions").insert(
  .from("debts").update(
  .from("debt_payments").insert(
  ```
- [ ] jika masih ada direct mutation di UI, pindahkan ke service
- [ ] deploy SQL final ke Supabase
- [ ] pastikan hanya numeric RPC yang aktif

### Outcome
- Mutasi uang atomic dan lebih aman dari race condition

---

## P1 — High priority / sesudah P0 selesai

## P1.1 Rapikan domain typing per modul

### Files baru/disatukan
- `src/app/debts/types.ts` ✅ sudah mulai
- `src/app/profile/types.ts`
- `src/app/analytics/types.ts`
- `src/app/dashboard/types.tsx`
- `src/lib/account.ts`

### Checklist
- [ ] debt type sudah jadi source of truth tunggal
- [ ] bikin profile type khusus untuk UI profile
- [ ] bikin analytics result type khusus
- [ ] pisahkan type DB row vs normalized UI row
- [ ] kurangi type yang dideklarasikan langsung di komponen besar

### Outcome
- Komponen lebih tipis, type lebih gampang dicari

---

## P1.2 Rapikan debt module sampai konsisten penuh

### Files
- `src/app/debts/page.tsx`
- `src/app/debts/DebtsClient.tsx`
- `src/app/debts/components/DebtCard.tsx`
- `src/app/debts/components/AddDebtSheet.tsx`
- `src/app/debts/components/PaymentSheet.tsx`
- `src/app/debts/components/useAddDebtForm.ts`
- `src/lib/debts.ts`

### Checklist
- [ ] `DebtsPage` hanya query + normalize + pass props
- [ ] `DebtsClient` hanya handle state UI/filter/selected debt
- [ ] `AddDebtSheet` tetap pakai `useAddDebtForm + createDebtRecord()`
- [ ] `PaymentSheet` tetap pakai `recordDebtPayment()`
- [ ] pertimbangkan tambah `updateDebtRecord()`
- [ ] pertimbangkan tambah `deleteDebtRecord()`
- [ ] tambahkan edit debt
- [ ] tambahkan delete debt
- [ ] review realtime debts subscription end-to-end

### Outcome
- Debt module jadi salah satu modul paling bersih di app

---

## P1.3 Rapikan report module jadi fitur beneran

### Files
- `src/app/report/page.tsx`
- `src/lib/export-csv.ts`
- `src/lib/supabase/queries.ts`
- opsional: `src/app/report/components/*`

### Checklist
- [ ] tambah filter tanggal range
- [ ] tambah summary income/expense per range
- [ ] tambah summary debt aktif
- [ ] tambah export CSV
- [ ] opsional export PDF
- [ ] sinkronkan metrik dengan analytics page

### Outcome
- `/report` bukan cuma placeholder, tapi usable

---

## P1.4 Finalisasi profile flow

### Files
- `src/app/profile/page.tsx`
- `src/app/profile/ProfileClient.tsx`
- `src/app/actions/auth.ts`
- `src/lib/supabase-admin.ts`

### Checklist
- [ ] query profile typed benar
- [ ] update avatar typed benar
- [ ] update profile fields typed benar
- [ ] username/phone/email flow aman
- [ ] error message ke user tetap jelas

### Outcome
- Profile bisa di-maintain tanpa type error dan tanpa inline logic berlebihan

---

## P2 — Medium priority / hardening & DX

## P2.1 Rapikan analytics RPC + service layer

### Files
- `src/app/api/analytics/predictions/generate/route.ts`
- `src/lib/supabase/analytics.ts`
- `src/lib/snapshot-generator.ts`
- `src/lib/alert-generator.ts`
- `src/hooks/usePremiumAnalyticsData.ts`

### Checklist
- [ ] typed semua call RPC analytics
- [ ] fallback `(supabase.rpc as any)(...)` hanya sementara kalau Functions belum lengkap
- [ ] samakan output RPC dengan type local
- [ ] review snapshot generator tetap tidak menulis `net_worth`
- [ ] review prediction generator agar tidak tergantung `never`

### Outcome
- analytics stabil dan type-safe

---

## P2.2 Rapikan assets / liabilities / net worth flow

### Files
- `src/components/dashboard/analytics/components/AddAssetSheet.tsx`
- `src/hooks/useNetWorth.ts`
- `src/lib/supabase/database.types.ts`

### Checklist
- [ ] insert `assets` typed benar
- [ ] update `assets` typed benar
- [ ] insert `liabilities` typed benar
- [ ] update `liabilities` typed benar
- [ ] review normalization `current_value/current_balance`
- [ ] review chart consumer pakai data normalize, bukan raw row langsung

### Outcome
- net worth feature siap dipakai tanpa `never`

---

## P2.3 Tambah scripts dan quality gates

### Files
- `package.json`
- opsional: `.github/workflows/*`

### Checklist
- [x] `typecheck` script sudah ada
- [ ] tambah script `build:check` kalau perlu
- [ ] jadikan minimal workflow CI:
  - [ ] `npm run typecheck`
  - [ ] `npm run lint`
  - [ ] `npm run build`
- [ ] pastikan PR tidak merge saat typecheck gagal

### Outcome
- error tidak numpuk diam-diam lagi

---

## P2.4 Audit case-sensitive import

### Files yang perlu dicari global
- semua `src/**/*.ts`
- semua `src/**/*.tsx`

### Checklist
- [ ] cari import salah case seperti:
  - [ ] `@/lib/Installment`
  - [ ] `./Installmentschedule`
  - [ ] `./Useadddebtform`
- [ ] samakan semua nama file dan import persis
- [ ] test build di environment clean

### Outcome
- aman deploy ke Linux/Vercel

---

## P3 — Polish / growth

## P3.1 Upgrade report & export UX

### Files
- `src/app/report/page.tsx`
- `src/lib/export-csv.ts`
- opsional `src/lib/export-pdf.ts`

### Checklist
- [ ] export CSV transaksi
- [ ] export CSV debt history
- [ ] export PDF report
- [ ] print-friendly layout

---

## P3.2 PWA hardening

### Files
- `src/app/layout.tsx`
- `public/manifest.json` (jika ada)
- konfigurasi `next-pwa`

### Checklist
- [ ] review manifest
- [ ] review icons
- [ ] tambah offline fallback page
- [ ] pastikan data sensitif tidak di-cache agresif

---

## P3.3 Error boundaries dan loading states

### Files potensial
- `src/app/dashboard/loading.tsx`
- `src/app/dashboard/error.tsx`
- `src/app/debts/loading.tsx`
- `src/app/debts/error.tsx`
- `src/app/analytics/loading.tsx`
- `src/app/analytics/error.tsx`
- `src/app/report/loading.tsx`
- `src/app/report/error.tsx`

### Checklist
- [ ] tambah loading state route penting
- [ ] tambah error boundary route penting
- [ ] tambah not-found bila perlu

---

## P3.4 Documentation final

### Files
- `DEPLOY_CHECKLIST.md`
- `RPC_PLAN.md`
- `FINAL_AUDIT_REPORT.md`
- `HANDOFF_SUMMARY.md`
- `NEXT_STEP_TODO_FINAL.md`

### Checklist
- [ ] update setelah generate types live sukses
- [ ] update signature RPC final
- [ ] update known limitations yang masih tersisa
- [ ] dokumentasikan flow mutasi final per modul

---

## Urutan kerja paling efisien

1. [ ] regenerate live `database.types.ts`
2. [ ] `npm run typecheck`
3. [ ] bereskan semua file yang masih error sampai 0
4. [ ] pastikan semua financial mutation lewat service/RPC
5. [ ] rapikan profile + analytics + assets/liabilities
6. [ ] tambah CI checks
7. [ ] polish report/PWA/error boundary

---

## Target akhir yang realistis

### Definition of done
- [ ] `npm run typecheck` = 0 error
- [ ] `npm run lint` lolos
- [ ] `npm run build` lolos
- [ ] transfer / quick add / debt payment lewat RPC
- [ ] profile / analytics / report tanpa `never`
- [ ] import case aman untuk deploy Linux
- [ ] docs final sinkron dengan kondisi codebase
