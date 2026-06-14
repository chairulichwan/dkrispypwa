// src/components/export-csv.ts

interface TransactionRow {
  created_at: string
  type: string
  amount: number
  category?: string | null
  note?: string | null
}

/**
 * Export riwayat transaksi ke file CSV yang kompatibel dengan Excel/Google Sheets.
 * Menggunakan BOM UTF-8 agar karakter Indonesia (é, ñ, dll) tampil benar di Excel.
 */
export function exportTransactionsCSV(
  transactions: TransactionRow[],
  accountName: string
): void {
  if (transactions.length === 0) return

  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan']

  const rows = transactions.map((tx) => {
    const date = new Date(tx.created_at).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // Escape double quotes dalam catatan agar CSV tidak rusak
    const safeNote = `"${(tx.note ?? '').replace(/"/g, '""')}"`
    return [date, tx.type, tx.category ?? '-', tx.amount.toString(), safeNote]
  })

  // \uFEFF = UTF-8 BOM untuk kompatibilitas Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  const safeName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const dateStr = new Date().toISOString().slice(0, 10)
  link.download = `riwayat-${safeName}-${dateStr}.csv`

  // Append → click → remove (lebih reliable di mobile browser)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}