import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowUpRight, CalendarDays, Receipt, Wallet } from "lucide-react"

import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { formatRupiah, formatRupiahCompact } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
  }
}

export default async function ReportPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(ROUTES.login)
  }

  const monthRange = getMonthRange()

  const [{ data: accounts }, { data: monthTransactions }, { data: recentTransactions }, { data: debts }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, balance")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, type, amount, created_at")
        .eq("user_id", user.id)
        .gte("created_at", monthRange.start)
        .lte("created_at", monthRange.end),
      supabase
        .from("transactions")
        .select("id, type, category, amount, note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("debts")
        .select("id, type, amount, paid_amount, status, due_date")
        .eq("user_id", user.id),
    ])

  const totalBalance = (accounts ?? []).reduce((sum, account) => sum + (Number(account.balance) || 0), 0)

  const monthlyIncome = (monthTransactions ?? []).reduce((sum, tx) => {
    return tx.type === "income" ? sum + (Number(tx.amount) || 0) : sum
  }, 0)

  const monthlyExpense = (monthTransactions ?? []).reduce((sum, tx) => {
    return tx.type === "expense" ? sum + (Number(tx.amount) || 0) : sum
  }, 0)

  const netCashflow = monthlyIncome - monthlyExpense

  const activeDebts = (debts ?? []).filter((debt) => debt.status === "aktif")
  const outstandingHutang = activeDebts.reduce((sum, debt) => {
    if (debt.type !== "hutang") return sum
    return sum + Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paid_amount) || 0))
  }, 0)

  const outstandingPiutang = activeDebts.reduce((sum, debt) => {
    if (debt.type !== "piutang") return sum
    return sum + Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paid_amount) || 0))
  }, 0)

  const reportGeneratedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <main
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0B1120]/80 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-[#94A3B8]">
                <CalendarDays size={13} />
                Report {monthRange.label}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] sm:text-3xl">
                Laporan Keuangan
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
                Ringkasan cepat posisi saldo, arus kas bulan berjalan, dan status hutang/piutang.
                Halaman ini aman dipakai sebagai baseline sebelum fitur export/report penuh ditambahkan.
              </p>
            </div>

            <Link
              href={ROUTES.dashboard}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <section className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                  Total Saldo
                </span>
                <Wallet size={16} className="text-sky-400" />
              </div>
              <p className="text-xl font-black tracking-tight text-white">{formatRupiah(totalBalance)}</p>
              <p className="mt-2 text-xs text-[#64748B]">Akumulasi seluruh akun aktif</p>
            </section>

            <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">
                  Income Bulan Ini
                </span>
                <ArrowUpRight size={16} className="text-emerald-400" />
              </div>
              <p className="text-xl font-black tracking-tight text-white">{formatRupiah(monthlyIncome)}</p>
              <p className="mt-2 text-xs text-emerald-100/60">Transaksi income di {monthRange.label}</p>
            </section>

            <section className="rounded-2xl border border-rose-500/15 bg-rose-500/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-rose-200/80">
                  Expense Bulan Ini
                </span>
                <Receipt size={16} className="text-rose-400" />
              </div>
              <p className="text-xl font-black tracking-tight text-white">{formatRupiah(monthlyExpense)}</p>
              <p className="mt-2 text-xs text-rose-100/60">Transaksi expense di {monthRange.label}</p>
            </section>

            <section className="rounded-2xl border border-violet-500/15 bg-violet-500/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-violet-200/80">
                  Net Cashflow
                </span>
                <CalendarDays size={16} className="text-violet-400" />
              </div>
              <p className="text-xl font-black tracking-tight text-white">{formatRupiah(netCashflow)}</p>
              <p className="mt-2 text-xs text-violet-100/60">
                {netCashflow >= 0 ? "Surplus bulan berjalan" : "Defisit bulan berjalan"}
              </p>
            </section>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-white/[0.07] bg-[#0B1120]/80 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Transaksi Terbaru</h2>
                <p className="text-sm text-[#64748B]">8 aktivitas terakhir pengguna</p>
              </div>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
                {recentTransactions?.length ?? 0} item
              </span>
            </div>

            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((tx) => {
                  const amount = Number(tx.amount) || 0
                  const isIncome = tx.type === "income"
                  const isExpense = tx.type === "expense"
                  const dateLabel = tx.created_at
                    ? new Date(tx.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Tanpa tanggal"

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-[#111827] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {tx.note?.trim() || tx.category?.trim() || "Transaksi"}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {dateLabel} • {tx.type || "unknown"}
                        </p>
                      </div>

                      <p
                        className={[
                          "shrink-0 text-sm font-black tabular-nums",
                          isIncome
                            ? "text-emerald-400"
                            : isExpense
                              ? "text-rose-400"
                              : "text-sky-300",
                        ].join(" ")}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {formatRupiahCompact(amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-12 text-center">
                <p className="text-sm font-medium text-[#94A3B8]">Belum ada transaksi untuk ditampilkan.</p>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0B1120]/80 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <h2 className="text-lg font-bold tracking-tight text-white">Posisi Hutang & Piutang</h2>
              <p className="mt-1 text-sm text-[#64748B]">Hanya menghitung item aktif yang belum lunas.</p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-rose-500/15 bg-rose-500/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-200/80">
                    Outstanding Hutang
                  </p>
                  <p className="mt-2 text-xl font-black text-white">{formatRupiah(outstandingHutang)}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80">
                    Outstanding Piutang
                  </p>
                  <p className="mt-2 text-xl font-black text-white">{formatRupiah(outstandingPiutang)}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                    Item Aktif
                  </p>
                  <p className="mt-2 text-xl font-black text-white">{activeDebts.length} catatan</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.07] bg-[#0B1120]/80 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <h2 className="text-lg font-bold tracking-tight text-white">Catatan Report</h2>
              <ul className="mt-4 space-y-3 text-sm text-[#94A3B8]">
                <li>• Snapshot dibuat otomatis saat halaman dibuka pada {reportGeneratedAt}.</li>
                <li>• Versi ini fokus pada ringkasan cepat, belum export PDF/CSV final.</li>
                <li>• Nilai diambil dari akun aktif, transaksi terbaru, dan debt aktif user.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
