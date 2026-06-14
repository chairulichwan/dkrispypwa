//src/components/dashboard/HistoryPage.tsx

export default function HomePage() {
  return (
    <section className="space-y-5">

      {/* HERO WALLET CARD */}
      <div className="
        relative
        rounded-[28px]
        p-6
        bg-gradient-to-br
        from-cyan-500/20
        via-blue-600/20
        to-violet-600/20
        border border-white/10
        backdrop-blur-xl
        shadow-2xl
      ">

        <p className="text-white/60 text-xs">TOTAL BALANCE</p>

        <h1 className="text-4xl font-black mt-2">
          Rp 44.600.000
        </h1>

        <div className="flex gap-3 mt-5">

          <div className="
            flex-1
            bg-white/10
            rounded-2xl
            p-3
          ">
            <p className="text-xs text-white/60">INCOME</p>
            <p className="font-bold text-green-400">+ Rp 12.3M</p>
          </div>

          <div className="
            flex-1
            bg-white/10
            rounded-2xl
            p-3
          ">
            <p className="text-xs text-white/60">EXPENSE</p>
            <p className="font-bold text-red-400">- Rp 4.1M</p>
          </div>

        </div>

      </div>

      {/* QUICK ACTION */}
      <div className="grid grid-cols-2 gap-3">

        <button className="
          bg-white/10
          p-5
          rounded-2xl
          active:scale-95
          transition
        ">
          💸 Transfer
        </button>

        <button className="
          bg-white/10
          p-5
          rounded-2xl
          active:scale-95
          transition
        ">
          🏦 Top Up
        </button>

      </div>

    </section>
  )
}