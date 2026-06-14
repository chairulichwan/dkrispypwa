//src/app/transactions/page.tsx

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Transactions() {
  const [type, setType] = useState('income')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')

  const addTransaction = async () => {
    await supabase.from('transactions').insert({
      type,
      category,
      amount: Number(amount)
    })

    setAmount('')
    setCategory('')
    alert('Berhasil disimpan')
  }

  return (
    <main className="p-4 min-h-screen bg-gray-100">

      <h1 className="text-xl font-bold mb-4">
        ➕ Input Transaksi
      </h1>

      <select
        className="w-full p-2 mb-2"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>

      <input
        className="w-full p-2 mb-2"
        placeholder="Category (QRIS, GoFood, Bahan)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <input
        className="w-full p-2 mb-2"
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={addTransaction}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Simpan
      </button>

    </main>
  )
}