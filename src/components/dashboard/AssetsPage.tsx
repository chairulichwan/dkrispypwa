//src/components/dashboard/AssetsPage.tsx

'use client'

import {
  Wallet,
  Landmark,
  CreditCard,
  PiggyBank,
} from 'lucide-react'

export default function AssetsPage() {

  const wallets = [
    {
      name: 'Cash Wallet',
      balance: 'Rp 4.500.000',
      icon: Wallet,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Bank BCA',
      balance: 'Rp 12.800.000',
      icon: Landmark,
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      name: 'E-Wallet',
      balance: 'Rp 2.300.000',
      icon: CreditCard,
      color: 'from-emerald-500 to-green-500',
    },
    {
      name: 'Tabungan',
      balance: 'Rp 25.000.000',
      icon: PiggyBank,
      color: 'from-orange-500 to-amber-500',
    },
  ]

  return (
    <section className="space-y-4">

      {/* TOTAL */}
      <div className="
        rounded-3xl
        p-6
        text-white
        bg-gradient-to-br
        from-slate-900
        to-slate-700
        shadow-xl
      ">

        <p className="
          text-xs
          uppercase
          tracking-widest
          text-white/60
          font-bold
        ">
          Total Assets
        </p>

        <h1 className="
          text-3xl
          font-black
          mt-2
        ">
          Rp 44.600.000
        </h1>

      </div>

      {/* LIST WALLET */}
      <div className="space-y-3">

        {wallets.map((wallet, index) => {

          const Icon = wallet.icon

          return (
            <div
              key={index}
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
                  text-white
                  bg-gradient-to-br
                  ${wallet.color}
                `}>

                  <Icon size={24} />

                </div>

                <div>

                  <h3 className="
                    font-bold
                    text-slate-800
                  ">
                    {wallet.name}
                  </h3>

                  <p className="
                    text-sm
                    text-slate-400
                  ">
                    Active wallet
                  </p>

                </div>

              </div>

              <div className="text-right">

                <p className="
                  font-black
                  text-slate-800
                  text-lg
                ">
                  {wallet.balance}
                </p>

                <p className="
                  text-xs
                  text-emerald-500
                  font-semibold
                ">
                  +2.4%
                </p>

              </div>

            </div>
          )
        })}

      </div>

    </section>
  )
}