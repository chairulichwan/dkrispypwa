//src\lib\Installment.ts
export interface InstallmentRow {
  period: number
  date: string
  principal: number
  interest: number
  total: number
  remainingPrincipal: number
}

export interface InstallmentSummary {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  schedule: InstallmentRow[]
}

const toIsoDate = (date: Date) => date.toISOString().split("T")[0]

/**
 * Flat:
 * - ratePercent dibaca sebagai % per bulan
 * - bunga dihitung dari pokok awal yang tetap
 */
export function calcFlat(
  principal: number,
  ratePercent: number,
  count: number,
  startDate: Date
): InstallmentSummary {
  const safePrincipal = Math.max(0, Math.round(principal || 0))
  const safeCount = Math.max(1, Math.trunc(count || 1))
  const monthlyRate = Math.max(0, Number(ratePercent) || 0) / 100
  const monthlyInterest = Math.round(safePrincipal * monthlyRate)
  const monthlyPrincipal = Math.round(safePrincipal / safeCount)
  const monthlyPayment = monthlyPrincipal + monthlyInterest

  const schedule: InstallmentRow[] = []
  let remaining = safePrincipal

  for (let i = 1; i <= safeCount; i += 1) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)

    const principalPortion = i === safeCount ? remaining : Math.min(remaining, monthlyPrincipal)
    remaining -= principalPortion

    schedule.push({
      period: i,
      date: toIsoDate(date),
      principal: principalPortion,
      interest: monthlyInterest,
      total: principalPortion + monthlyInterest,
      remainingPrincipal: Math.max(0, remaining),
    })
  }

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0)
  const totalPayment = schedule.reduce((sum, row) => sum + row.total, 0)

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    schedule,
  }
}

/**
 * Efektif / anuitas:
 * - ratePercent dibaca sebagai % per tahun
 * - bunga bulanan dihitung dari sisa pokok
 */
export function calcEffective(
  principal: number,
  ratePercent: number,
  count: number,
  startDate: Date
): InstallmentSummary {
  const safePrincipal = Math.max(0, Math.round(principal || 0))
  const safeCount = Math.max(1, Math.trunc(count || 1))
  const monthlyRate = Math.max(0, Number(ratePercent) || 0) / 100 / 12

  let monthlyPayment: number
  if (monthlyRate === 0) {
    monthlyPayment = Math.ceil(safePrincipal / safeCount)
  } else {
    monthlyPayment = Math.ceil(
      (safePrincipal * monthlyRate * Math.pow(1 + monthlyRate, safeCount)) /
        (Math.pow(1 + monthlyRate, safeCount) - 1)
    )
  }

  const schedule: InstallmentRow[] = []
  let remaining = safePrincipal
  let totalInterest = 0
  let totalPayment = 0

  for (let i = 1; i <= safeCount; i += 1) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)

    let interest = Math.round(remaining * monthlyRate)
    let principalPortion = monthlyPayment - interest

    if (i === safeCount || principalPortion >= remaining) {
      principalPortion = remaining
      interest = monthlyRate === 0 ? 0 : Math.max(0, monthlyPayment - principalPortion)
      remaining = 0
    } else {
      remaining -= principalPortion
    }

    totalInterest += interest
    totalPayment += principalPortion + interest

    schedule.push({
      period: i,
      date: toIsoDate(date),
      principal: principalPortion,
      interest,
      total: principalPortion + interest,
      remainingPrincipal: Math.max(0, remaining),
    })
  }

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    schedule,
  }
}

export function calcInstallment(
  principal: number,
  ratePercent: number,
  count: number,
  interestType: "flat" | "efektif",
  startDate: Date
): InstallmentSummary {
  return interestType === "flat"
    ? calcFlat(principal, ratePercent, count, startDate)
    : calcEffective(principal, ratePercent, count, startDate)
}
