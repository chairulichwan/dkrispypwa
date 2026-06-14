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
  const monthlyRate = ratePercent / 100
  const monthlyInterest = Math.round(principal * monthlyRate)
  const monthlyPrincipal = Math.round(principal / count)
  const monthlyPayment = monthlyPrincipal + monthlyInterest

  const schedule: InstallmentRow[] = []
  let remaining = principal

  for (let i = 1; i <= count; i += 1) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)

    const principalPortion = i === count ? remaining : monthlyPrincipal
    remaining -= principalPortion

    schedule.push({
      period: i,
      date: date.toISOString().split("T")[0],
      principal: principalPortion,
      interest: monthlyInterest,
      total: principalPortion + monthlyInterest,
      remainingPrincipal: Math.max(0, remaining),
    })
  }

  return {
    monthlyPayment,
    totalPayment: principal + monthlyInterest * count,
    totalInterest: monthlyInterest * count,
    schedule,
  }
}

/**
 * Efektif / Anuitas:
 * - ratePercent dibaca sebagai % per tahun
 * - bunga bulanan dihitung dari sisa pokok
 */
export function calcEffective(
  principal: number,
  ratePercent: number,
  count: number,
  startDate: Date
): InstallmentSummary {
  const monthlyRate = ratePercent / 100 / 12

  let monthlyPayment: number
  if (monthlyRate === 0) {
    monthlyPayment = Math.ceil(principal / count)
  } else {
    monthlyPayment = Math.ceil(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, count)) /
        (Math.pow(1 + monthlyRate, count) - 1)
    )
  }

  const schedule: InstallmentRow[] = []
  let remaining = principal
  let totalInterest = 0
  let totalPayment = 0

  for (let i = 1; i <= count; i += 1) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)

    let interest = Math.round(remaining * monthlyRate)
    let principalPortion = monthlyPayment - interest

    if (i === count || principalPortion >= remaining) {
      principalPortion = remaining
      interest = monthlyPayment - principalPortion
      remaining = 0
    } else {
      remaining -= principalPortion
    }

    totalInterest += interest
    totalPayment += principalPortion + interest

    schedule.push({
      period: i,
      date: date.toISOString().split("T")[0],
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