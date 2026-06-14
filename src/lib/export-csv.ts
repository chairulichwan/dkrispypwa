// src/lib/export-csv.ts
interface TransactionRow {
  created_at?: string | null
  type?: string | null
  amount: number
  category?: string | null
  note?: string | null
}

export function exportTransactionsCSV(transactions: TransactionRow[], accountName: string) {
  if (!transactions.length) return

  const headers = ["Tanggal", "Tipe", "Kategori", "Jumlah", "Catatan"]
  const rows = transactions.map((tx) => {
    const date = tx.created_at
      ? new Date(tx.created_at).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-"

    const safeNote = `"${(tx.note ?? "").replace(/"/g, '""')}"`

    return [
      date,
      tx.type ?? "-",
      tx.category ?? "-",
      String(tx.amount ?? 0),
      safeNote,
    ]
  })

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  const safeName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const dateStr = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `riwayat-${safeName}-${dateStr}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
