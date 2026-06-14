//src/components/dashboard/HomePage.tsx

'use client'

import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PiggyBank,
} from 'lucide-react'





export default function HomePage() {

  const transactions = [
    {
      id: 1,
      title: 'Gaji Bulanan',
      type: 'income',
      amount: '+Rp 8.000.000',
    },
    {
      id: 2,
      title: 'Belanja Shopee',
      type: 'expense',
      amount: '-Rp 450.000',
    },
    {
      id: 3,
      title: 'Netflix',
      type: 'expense',
      amount: '-Rp 65.000',
    },
  ]

  return (
    <section className="space-y-5">

      {/* HERO */}
      <div className="
        rounded-[32px]
        p-6
        text-white
        bg-gradient-to-br
        from-blue-600
        to-violet-600
        shadow-2xl
      ">

        <div className="
          flex
          items-center
          justify-between
        ">

          <div>

            <p className="
              text-white/70
              text-xs
              uppercase
              tracking-widest
              font-bold
            ">
              Total Balance
            </p>

            <h1 className="
              text-4xl
              font-black
              mt-2
            ">
              Rp 44.600.000
            </h1>

          </div>

          <div className="
            w-16
            h-16
            rounded-3xl
            bg-white/20
            flex
            items-center
            justify-center
            backdrop-blur-xl
          ">

            <Wallet size={30} />

          </div>

        </div>

        {/* CARD */}
        <div className="
          grid
          grid-cols-2
          gap-3
          mt-6
        ">

          <div className="
            bg-white/10
            rounded-2xl
            p-4
            backdrop-blur-lg
          ">

            <div className="
              flex
              items-center
              gap-2
              text-white/70
              text-sm
            ">
              <ArrowDownLeft size={16} />
              Income
            </div>

            <h3 className="
              text-xl
              font-bold
              mt-2
            ">
              Rp 10.5JT
            </h3>

          </div>

          <div className="
            bg-white/10
            rounded-2xl
            p-4
            backdrop-blur-lg
          ">

            <div className="
              flex
              items-center
              gap-2
              text-white/70
              text-sm
            ">
              <ArrowUpRight size={16} />
              Expense
            </div>

            <h3 className="
              text-xl
              font-bold
              mt-2
            ">
              Rp 3.2JT
            </h3>

          </div>

        </div>

      </div>

      {/* QUICK ACTION */}
      <div className="
        grid
        grid-cols-2
        gap-3
      ">

        <button className="
          bg-white
          rounded-3xl
          p-5
          shadow-sm
          border
          border-slate-100
          flex
          flex-col
          items-center
          justify-center
          gap-2
        ">

          <div className="
            w-14
            h-14
            rounded-2xl
            bg-blue-100
            text-blue-600
            flex
            items-center
            justify-center
          ">
            <Wallet size={26} />
          </div>

          <span className="
            font-bold
            text-slate-700
          ">
            Transfer
          </span>

        </button>

        <button className="
          bg-white
          rounded-3xl
          p-5
          shadow-sm
          border
          border-slate-100
          flex
          flex-col
          items-center
          justify-center
          gap-2
        ">

          <div className="
            w-14
            h-14
            rounded-2xl
            bg-emerald-100
            text-emerald-600
            flex
            items-center
            justify-center
          ">
            <PiggyBank size={26} />
          </div>

          <span className="
            font-bold
            text-slate-700
          ">
            Saving
          </span>

        </button>

      </div>

      {/* TRANSACTION */}
      <div>

        <div className="
          flex
          items-center
          justify-between
          mb-4
        ">

          <h2 className="
            text-lg
            font-black
            text-slate-800
          ">
            Recent Activity
          </h2>

          <button className="
            text-sm
            font-bold
            text-blue-600
          ">
            View All
          </button>

        </div>

        <div className="space-y-3">

          {transactions.map((item) => {

            const expense =
              item.type === 'expense'

            return (
              <div
                key={item.id}
                className="
                  bg-white
                  rounded-3xl
                  p-4
                  shadow-sm
                  border
                  border-slate-100
                  flex
                  items-center
                  justify-between
                "
              >

                <div className="
                  flex
                  items-center
                  gap-4
                ">

                  <div className={`
                    w-14
                    h-14
                    rounded-2xl
                    flex
                    items-center
                    justify-center
                    ${
                      expense
                        ? 'bg-rose-100 text-rose-500'
                        : 'bg-emerald-100 text-emerald-600'
                    }
                  `}>

                    {expense ? (
                      <ArrowUpRight size={24} />
                    ) : (
                      <ArrowDownLeft size={24} />
                    )}

                  </div>

                  <div>

                    <h3 className="
                      font-bold
                      text-slate-800
                    ">
                      {item.title}
                    </h3>

                    <p className="
                      text-sm
                      text-slate-400
                    ">
                      Today
                    </p>

                  </div>

                </div>

                <h3 className={`
                  text-lg
                  font-black
                  ${
                    expense
                      ? 'text-rose-500'
                      : 'text-emerald-600'
                  }
                `}>
                  {item.amount}
                </h3>

              </div>
            )
          })}

        </div>

      </div>

    </section>
  )
}