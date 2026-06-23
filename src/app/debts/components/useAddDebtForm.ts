//src\app\debts\components\useAddDebtForm.ts
"use client"

import { useEffect, useMemo, useState } from "react"

import { calcInstallment } from "@/lib/Installment"

export interface AddDebtContactItem {
  id: string
  name: string
  phone?: string | null
}

interface UseAddDebtFormProps {
  contacts: AddDebtContactItem[]
}

export type DebtType = "hutang" | "piutang"
export type InterestType = "flat" | "efektif"

const DEFAULT_INSTALLMENT_COUNT = "12"

const getTodayString = () => new Date().toISOString().split("T")[0]

const formatInputRupiah = (value: string) => {
  const numeric = value.replace(/\D/g, "")
  return numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : ""
}

const parseInputRupiah = (value: string) => Number(value.replace(/\D/g, "")) || 0

export function useAddDebtForm({ contacts }: UseAddDebtFormProps) {
  const defaultContactId = contacts[0]?.id ?? ""

  const [type, setType] = useState<DebtType>("piutang")
  const [contactId, setContactId] = useState(defaultContactId)
  const [newContactName, setNewContactName] = useState("")
  const [isNewContact, setIsNewContact] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [useInstallment, setUseInstallment] = useState(false)
  const [interestRate, setInterestRate] = useState("")
  const [interestType, setInterestType] = useState<InterestType>("flat")
  const [installmentCount, setInstallmentCount] = useState(DEFAULT_INSTALLMENT_COUNT)
  const [startDate, setStartDate] = useState(() => getTodayString())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isNewContact) return

    const contactStillExists = contacts.some((contact) => contact.id === contactId)
    if (!contactStillExists) {
      setContactId(defaultContactId)
    }
  }, [contactId, contacts, defaultContactId, isNewContact])

  const amountNumeric = useMemo(() => parseInputRupiah(amount), [amount])

  const isOverLimit = useMemo(() => amountNumeric > 999_999_999_999, [amountNumeric])

  const isDueDateInPast = useMemo(() => {
    if (!dueDate) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    return due < today
  }, [dueDate])

  const filteredContacts = useMemo(() => {
    const keyword = contactSearch.trim().toLowerCase()
    if (!keyword) return contacts

    return contacts.filter((contact) => {
      const name = contact.name.toLowerCase()
      const phone = contact.phone?.toLowerCase() ?? ""
      return name.includes(keyword) || phone.includes(keyword)
    })
  }, [contactSearch, contacts])

  const installmentPreview = useMemo(() => {
    if (!useInstallment || amountNumeric <= 0) return null

    const count = Math.min(360, Math.max(1, parseInt(installmentCount, 10) || 1))
    const rate = Math.min(100, Math.max(0, parseFloat(interestRate) || 0))

    const summary = calcInstallment(
      amountNumeric,
      rate,
      count,
      interestType,
      new Date(startDate || getTodayString())
    )

    return {
      count,
      rate,
      monthly: summary.monthlyPayment,
      totalInterest: summary.totalInterest,
      totalPayment: summary.totalPayment,
    }
  }, [amountNumeric, installmentCount, interestRate, interestType, startDate, useInstallment])

  const isDirty = useMemo(() => {
    return Boolean(
      amountNumeric > 0 ||
        description.trim().length > 0 ||
        dueDate.length > 0 ||
        accountId.length > 0 ||
        useInstallment ||
        interestRate.length > 0 ||
        installmentCount !== DEFAULT_INSTALLMENT_COUNT ||
        interestType !== "flat" ||
        type !== "piutang" ||
        (useInstallment && startDate !== getTodayString()) ||
        (isNewContact && newContactName.trim().length > 0) ||
        (!isNewContact && contactSearch.trim().length > 0)
    )
  }, [
    accountId,
    amountNumeric,
    contactSearch,
    description,
    dueDate,
    installmentCount,
    interestRate,
    interestType,
    isNewContact,
    newContactName,
    startDate,
    type,
    useInstallment,
  ])

  const isValid = useMemo(() => {
    if (amountNumeric <= 0 || isOverLimit) return false
    if (isDueDateInPast) return false

    if (isNewContact) {
      return newContactName.trim().length > 0
    }

    return Boolean(contactId)
  }, [amountNumeric, contactId, isDueDateInPast, isNewContact, isOverLimit, newContactName])

  const reset = () => {
    setType("piutang")
    setContactId(defaultContactId)
    setNewContactName("")
    setIsNewContact(false)
    setContactSearch("")
    setAccountId("")
    setAmount("")
    setDescription("")
    setDueDate("")
    setUseInstallment(false)
    setInterestRate("")
    setInterestType("flat")
    setInstallmentCount(DEFAULT_INSTALLMENT_COUNT)
    setStartDate(getTodayString())
    setLoading(false)
  }

  const handleAmountChange = (value: string) => {
    setAmount(formatInputRupiah(value))
  }

  const toggleIsNewContact = () => {
    setIsNewContact((prev) => {
      const next = !prev

      if (!next && !contactId && defaultContactId) {
        setContactId(defaultContactId)
      }

      return next
    })

    setContactSearch("")
    setNewContactName("")
  }

  return {
    type,
    setType,
    contactId,
    setContactId,
    newContactName,
    setNewContactName,
    isNewContact,
    contactSearch,
    setContactSearch,
    accountId,
    setAccountId,
    amount,
    description,
    setDescription,
    dueDate,
    setDueDate,
    useInstallment,
    setUseInstallment,
    interestRate,
    setInterestRate,
    interestType,
    setInterestType,
    installmentCount,
    setInstallmentCount,
    startDate,
    setStartDate,
    loading,
    setLoading,
    amountNumeric,
    isOverLimit,
    isDueDateInPast,
    isDirty,
    isValid,
    filteredContacts,
    installmentPreview,
    reset,
    handleAmountChange,
    toggleIsNewContact,
  }
}