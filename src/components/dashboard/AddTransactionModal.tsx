//src/components/dashboard/AddTransactionModal.tsx

'use client'

import { useState } from 'react'

import {
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddTransactionModal({
  open,
  onClose,
}: Props) {

  const [type, setType] =
    useState('Pengeluaran')

  const [amount, setAmount] =
    useState('')

  const [note, setNote] =
    useState('')

  const [category, setCategory] =
    useState('Shopping')

  const [wallet, setWallet] =
    useState('Cash Wallet')

  if (!open) return null

  const expense =
    type === 'Pengeluaran'

  return (
    <div className="
      fixed
      inset-0
      z-50
      flex
      items-end
      justify-center
      bg-black/40
      backdrop-blur-sm
      p-4
    ">

      {/* MODAL */}
      <div className="
        w-full
        max-w-md
        bg-white
        rounded-[32px]
        p-6
        animate-[slideUp_.25s_ease]
        shadow-2xl
      ">

        {/* HEADER */}
        <div className="
          flex
          items-center
          justify-between
          mb-6
        ">

          <div>

            <h1 className="
              text-2xl
              font-black
              text-slate-800
            ">
              Add Transaction
            </h1>

            <p className="
              text-slate-400
              text-sm
              mt-1
            ">
              Record your finance activity
            </p>

          </div>

          <button
            onClick={onClose}
            className="
              w-11
              h-11
              rounded-2xl
              bg-slate-100
              flex
              items-center
              justify-center
              text-slate-600
            "
          >
            <X size={22} />
          </button>

        </div>

        {/* TYPE */}
        <div className="
          grid
          grid-cols-2
          gap-3
          mb-5
        ">

          <button
            type="button"
            onClick={() =>
              setType('Pemasukan')
            }
            className={`
              rounded-2xl
              p-4
              border-2
              transition-all
              ${type === 'Pemasukan'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200'
              }
            `}
          >

            <div className="
              flex
              flex-col
              items-center
              gap-2
            ">

              <div className="
                w-12
                h-12
                rounded-2xl
                bg-emerald-100
                text-emerald-600
                flex
                items-center
                justify-center
              ">
                <ArrowDownLeft size={24} />
              </div>

              <span className="
                font-bold
                text-slate-700
              ">
                Income
              </span>

            </div>

          </button>

          <button
            type="button"
            onClick={() =>
              setType('Pengeluaran')
            }
            className={`
              rounded-2xl
              p-4
              border-2
              transition-all
              ${type === 'Pengeluaran'
                ? 'border-rose-500 bg-rose-50'
                : 'border-slate-200'
              }
            `}
          >

            <div className="
              flex
              flex-col
              items-center
              gap-2
            ">

              <div className="
                w-12
                h-12
                rounded-2xl
                bg-rose-100
                text-rose-500
                flex
                items-center
                justify-center
              ">
                <ArrowUpRight size={24} />
              </div>

              <span className="
                font-bold
                text-slate-700
              ">
                Expense
              </span>

            </div>

          </button>

        </div>

        {/* FORM */}
        <div className="space-y-4">

          {/* AMOUNT */}
          <div>

            <label className="
              text-sm
              font-bold
              text-slate-500
              mb-2
              block
            ">
              Amount
            </label>

            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              className="
                w-full
                h-14
                rounded-2xl
                border
                border-slate-200
                px-5
                text-2xl
                font-black
                outline-none
                focus:border-blue-500
              "
            />

          </div>

          {/* CATEGORY */}
          <div>

            <label className="
              text-sm
              font-bold
              text-slate-500
              mb-2
              block
            ">
              Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="
                w-full
                h-14
                rounded-2xl
                border
                border-slate-200
                px-4
                outline-none
                focus:border-blue-500
              "
            >

              <option>
                Shopping
              </option>

              <option>
                Food
              </option>

              <option>
                Transport
              </option>

              <option>
                Bills
              </option>

            </select>

          </div>

          {/* WALLET */}
          <div>

            <label className="
              text-sm
              font-bold
              text-slate-500
              mb-2
              block
            ">
              Wallet
            </label>

            <div className="
              h-14
              rounded-2xl
              border
              border-slate-200
              px-4
              flex
              items-center
              gap-3
            ">

              <div className="
                w-10
                h-10
                rounded-xl
                bg-blue-100
                text-blue-600
                flex
                items-center
                justify-center
              ">
                <Wallet size={20} />
              </div>

              <select
                value={wallet}
                onChange={(e) =>
                  setWallet(e.target.value)
                }
                className="
                  flex-1
                  bg-transparent
                  outline-none
                "
              >

                <option>
                  Cash Wallet
                </option>

                <option>
                  Bank BCA
                </option>

                <option>
                  E-Wallet
                </option>

              </select>

            </div>

          </div>

          {/* NOTE */}
          <div>

            <label className="
              text-sm
              font-bold
              text-slate-500
              mb-2
              block
            ">
              Note
            </label>

            <textarea
              placeholder="
Write transaction note...
              "
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              className="
                w-full
                h-28
                rounded-2xl
                border
                border-slate-200
                p-4
                outline-none
                resize-none
                focus:border-blue-500
              "
            />

          </div>

          {/* BUTTON */}
          <button
            className={`
              w-full
              h-14
              rounded-2xl
              text-white
              font-bold
              text-lg
              transition-all
              ${expense
                ? 'bg-rose-500'
                : 'bg-emerald-500'
              }
            `}
          >

            Save Transaction

          </button>

        </div>

      </div>

    </div>
  )
}