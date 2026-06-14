import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

export interface CreateDebtRecordInput {
  userId: string
  type: "hutang" | "piutang"
  amount: number
  contactId?: string | null
  newContactName?: string | null
  accountId?: string | null
  description?: string | null
  dueDate?: string | null
  useInstallment?: boolean
  interestRate?: number
  interestType?: "flat" | "efektif"
  installmentCount?: number
  installmentAmount?: number
  startDate?: string | null
}

export interface CreateDebtRecordResult {
  success: boolean
  debt_id?: string
  contact_id?: string
  status?: string
  total_interest?: number
  total_amount_due?: number
  interest_type?: "flat" | "efektif" | string | null
  interest_rate_unit?: "monthly" | "annual" | string | null
  account_transaction_id?: string | null
  account_balance?: number | null
  created_contact?: boolean
  used_rpc?: boolean
  origination_transaction_id?: string | null
}

export interface UpdateDebtRecordInput {
  userId: string
  debtId: string
  contactId?: string | null
  type?: "hutang" | "piutang" | null
  amount?: number | null
  accountId?: string | null
  clearAccount?: boolean
  description?: string | null
  dueDate?: string | null
  interestRate?: number | null
  interestType?: "flat" | "efektif" | null
  installmentCount?: number | null
  startDate?: string | null
}

export interface UpdateDebtRecordResult {
  success: boolean
  debt_id?: string
  status?: string
  mode?: "metadata_only" | "full_edit" | string
  total_interest?: number
  total_amount_due?: number
  interest_type?: "flat" | "efektif" | string | null
  interest_rate?: number | null
  interest_rate_unit?: "monthly" | "annual" | string | null
  installment_count?: number
  first_due_date?: string | null
  final_due_date?: string | null
  account_id?: string | null
  account_balance?: number | null
  origination_transaction_id?: string | null
}

export interface RecordDebtPaymentInput {
  userId: string
  debtId: string
  amount: number
  accountId?: string | null
  note?: string | null
  paidAt?: string
  createAccountTransaction?: boolean
}

export interface RecordDebtPaymentResult {
  success: boolean
  payment_id?: string
  debt_status?: string
  debt_paid_amount?: number
  paid_principal?: number
  paid_interest?: number
  outstanding_amount?: number
  principal_amount?: number
  total_interest?: number
  total_amount_due?: number
  interest_type?: "flat" | "efektif" | string | null
  interest_rate?: number | null
  interest_rate_unit?: "monthly" | "annual" | string | null
  account_transaction_id?: string | null
  account_balance?: number | null
}

type ContactLookupRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  "id" | "name"
>

type AccountLookupRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  "id" | "balance"
>

type RpcErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function normalizePositiveAmount(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} harus lebih dari 0`)
  }

  const normalized = Math.round(value)

  if (!Number.isSafeInteger(normalized)) {
    throw new Error(`${fieldName} terlalu besar`)
  }

  return normalized
}

function getRpcErrorInfo(error: unknown): RpcErrorLike {
  if (!error || typeof error !== "object") return {}

  return {
    code: "code" in error ? String((error as RpcErrorLike).code || "") : "",
    message:
      "message" in error ? String((error as RpcErrorLike).message || "") : "",
    details:
      "details" in error ? String((error as RpcErrorLike).details || "") : "",
    hint: "hint" in error ? String((error as RpcErrorLike).hint || "") : "",
  }
}

function isMissingRpcError(error: unknown, rpcName: string) {
  const { code, message } = getRpcErrorInfo(error)

  return (
    code === "PGRST202" ||
    message?.includes("Could not find the function") ||
    message?.includes(rpcName)
  )
}

function normalizeCreateDebtErrorMessage(error: unknown) {
  const { code, message, details, hint } = getRpcErrorInfo(error)
  const combined = [code, message, details, hint].filter(Boolean).join(" | ")

  if (
    combined.includes("Insufficient balance") ||
    combined.includes("Saldo akun tidak cukup") ||
    combined.includes("Dana akun tidak mencukupi")
  ) {
    return "Dana akun Anda tidak mencukupi"
  }

  if (
    combined.includes("Account not found") ||
    combined.includes("Akun tidak valid")
  ) {
    return "Akun yang dipilih tidak valid"
  }

  if (
    combined.includes("Contact not found") ||
    combined.includes("Kontak tidak valid")
  ) {
    return "Kontak yang dipilih tidak valid"
  }

  if (combined.includes("Amount exceeds transactions.amount integer limit")) {
    return "Nominal terlalu besar untuk dicatat ke transaksi akun"
  }

  if (combined.includes("Invalid debt type")) {
    return "Tipe debt tidak valid"
  }

  if (combined.includes("User mismatch") || combined.includes("Unauthorized")) {
    return "Sesi Anda tidak valid. Silakan login ulang"
  }

  return message || "Gagal membuat catatan debt"
}

function normalizeUpdateDebtErrorMessage(error: unknown) {
  const { code, message, details, hint } = getRpcErrorInfo(error)
  const combined = [code, message, details, hint].filter(Boolean).join(" | ")

  if (
    combined.includes("Insufficient balance") ||
    combined.includes("Dana akun tidak mencukupi") ||
    combined.includes("Saldo akun tidak cukup")
  ) {
    return "Dana akun Anda tidak mencukupi"
  }

  if (
    combined.includes("Debt yang sudah memiliki pembayaran hanya bisa mengubah") ||
    combined.includes("metadata_only")
  ) {
    return "Debt yang sudah memiliki pembayaran hanya bisa mengubah keterangan, kontak, dan jatuh tempo"
  }

  if (combined.includes("Debt not found")) {
    return "Catatan hutang/piutang tidak ditemukan"
  }

  if (
    combined.includes("Account not found") ||
    combined.includes("Akun tidak valid")
  ) {
    return "Akun yang dipilih tidak valid"
  }

  if (
    combined.includes("Contact not found") ||
    combined.includes("Kontak tidak valid")
  ) {
    return "Kontak yang dipilih tidak valid"
  }

  if (
    combined.includes("origination transaction") ||
    combined.includes("Debt lama tanpa origination transaction")
  ) {
    return "Debt lama ini belum bisa diedit penuh. Silakan arsipkan lalu buat ulang"
  }

  if (
    combined.includes("payment rows exist") ||
    combined.includes("ledger first")
  ) {
    return "Debt ini perlu diperbaiki dulu sebelum diedit"
  }

  if (combined.includes("Invalid debt type")) {
    return "Tipe debt tidak valid"
  }

  if (combined.includes("User mismatch") || combined.includes("Unauthorized")) {
    return "Sesi Anda tidak valid. Silakan login ulang"
  }

  return message || "Gagal mengubah debt"
}

function normalizeRecordDebtPaymentErrorMessage(error: unknown) {
  const { code, message, details, hint } = getRpcErrorInfo(error)
  const combined = [code, message, details, hint].filter(Boolean).join(" | ")

  if (
    combined.includes("Insufficient balance") ||
    combined.includes("Dana akun tidak mencukupi") ||
    combined.includes("Saldo akun tidak cukup")
  ) {
    return "Dana akun Anda tidak mencukupi"
  }

  if (
    combined.includes("Payment exceeds outstanding amount") ||
    combined.includes("Payment exceeds remaining debt amount")
  ) {
    return "Nominal melebihi sisa tagihan"
  }

  if (
    combined.includes("Payment account not found") ||
    combined.includes("Account not found")
  ) {
    return "Akun yang dipilih tidak valid"
  }

  if (combined.includes("Debt not found")) {
    return "Catatan hutang/piutang tidak ditemukan"
  }

  if (combined.includes("Payment allocation failed")) {
    return "Gagal mengalokasikan pembayaran ke jadwal cicilan"
  }

  if (combined.includes("User mismatch") || combined.includes("Unauthorized")) {
    return "Sesi Anda tidak valid. Silakan login ulang"
  }

  return message || "Gagal mencatat pembayaran"
}

/**
 * Debt creation service (RPC-only).
 */
export async function createDebtRecord({
  userId,
  type,
  amount,
  contactId = null,
  newContactName = null,
  accountId = null,
  description = null,
  dueDate = null,
  useInstallment = false,
  interestRate = 0,
  interestType = "flat",
  installmentCount = 1,
  installmentAmount = 0,
  startDate = null,
}: CreateDebtRecordInput): Promise<CreateDebtRecordResult> {
  const supabase = createClient()

  if (!userId) throw new Error("User tidak valid")
  if (type !== "hutang" && type !== "piutang") {
    throw new Error("Tipe debt tidak valid")
  }

  const normalizedAmount = normalizePositiveAmount(amount, "Nominal")
  const normalizedContactId = contactId?.trim() || null
  const normalizedNewContactName = newContactName?.trim() || null
  const normalizedAccountId = accountId?.trim() || null
  const normalizedDescription = description?.trim() || null
  const normalizedDueDate = dueDate || null
  const normalizedUseInstallment = Boolean(useInstallment)

  if (!normalizedContactId && !normalizedNewContactName) {
    throw new Error("Kontak wajib dipilih atau dibuat baru")
  }

  const safeInstallmentCount = normalizedUseInstallment
    ? Math.max(1, Math.trunc(installmentCount || 1))
    : 1

  const safeInterestRate =
    normalizedUseInstallment && Number.isFinite(interestRate)
      ? Number(interestRate)
      : 0

  const safeInstallmentAmount = normalizedUseInstallment
    ? Math.max(
        0,
        Math.round(Number.isFinite(installmentAmount) ? installmentAmount : 0)
      )
    : 0

  const safeStartDate = normalizedUseInstallment
    ? startDate || new Date().toISOString().split("T")[0]
    : null

  let finalContactId = normalizedContactId
  let createdContact = false

  if (normalizedNewContactName) {
    const { data: newContact, error: newContactError } = await supabase
      .from("contacts")
      .insert({ user_id: userId, name: normalizedNewContactName })
      .select("id, name")
      .single<ContactLookupRow>()

    if (newContactError || !newContact) {
      throw newContactError || new Error("Gagal membuat kontak")
    }

    finalContactId = newContact.id
    createdContact = true
  } else {
    if (!finalContactId) {
      throw new Error("Kontak tidak valid")
    }

    const { data: existingContact, error: contactError } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("user_id", userId)
      .eq("id", finalContactId)
      .maybeSingle<ContactLookupRow>()

    if (contactError) throw contactError
    if (!existingContact) throw new Error("Kontak tidak valid")
  }

  if (normalizedAccountId) {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("user_id", userId)
      .eq("id", normalizedAccountId)
      .is("deleted_at", null)
      .maybeSingle<AccountLookupRow>()

    if (accountError) throw accountError
    if (!account) throw new Error("Akun yang dipilih tidak valid")

    const currentBalance = Number(account.balance) || 0

    if (type === "piutang" && currentBalance < normalizedAmount) {
      throw new Error("Dana akun Anda tidak mencukupi")
    }

    if (normalizedAmount > 2147483647) {
      throw new Error("Nominal terlalu besar untuk dicatat ke transaksi akun")
    }
  }

  const rpcPayload = {
    p_user_id: userId,
    p_contact_id: finalContactId,
    p_type: type,
    p_amount: normalizedAmount,
    p_account_id: normalizedAccountId,
    p_description: normalizedDescription,
    p_due_date: normalizedDueDate,
    p_interest_rate: safeInterestRate,
    p_interest_type: normalizedUseInstallment ? interestType : "flat",
    p_installment_count: safeInstallmentCount,
    p_installment_amount: safeInstallmentAmount,
    p_start_date: safeStartDate,
    p_created_at: new Date().toISOString(),
  }

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "create_debt_record",
    rpcPayload
  )

  if (rpcError) {
    console.error("[createDebtRecord RPC error]", {
      code: rpcError.code,
      message: rpcError.message,
      details: (rpcError as RpcErrorLike).details,
      hint: (rpcError as RpcErrorLike).hint,
      payload: rpcPayload,
    })

    if (isMissingRpcError(rpcError, "create_debt_record")) {
      throw new Error(
        "RPC `create_debt_record` belum tersedia di Supabase. Deploy SQL proper-ledger version terlebih dahulu."
      )
    }

    throw new Error(normalizeCreateDebtErrorMessage(rpcError))
  }

  const result = (rpcData ?? { success: false }) as CreateDebtRecordResult

  return {
    ...result,
    created_contact: createdContact,
    used_rpc: true,
  }
}

/**
 * Debt update service (RPC-only).
 *
 * Rules:
 * - if paid_amount = 0 => full edit allowed
 * - if paid_amount > 0 => metadata-only edit allowed
 */
export async function updateDebtRecord({
  userId,
  debtId,
  contactId = null,
  type = null,
  amount = null,
  accountId = null,
  clearAccount = false,
  description = null,
  dueDate = null,
  interestRate = null,
  interestType = null,
  installmentCount = null,
  startDate = null,
}: UpdateDebtRecordInput): Promise<UpdateDebtRecordResult> {
  const supabase = createClient()

  if (!userId) throw new Error("User tidak valid")
  if (!debtId) throw new Error("Debt tidak valid")

  const normalizedDebtId = debtId.trim()
  const normalizedContactId = contactId?.trim() || null
  const normalizedAccountId = accountId?.trim() || null
  const normalizedDescription =
    description === null ? null : description.trim() || null
  const normalizedDueDate = dueDate || null
  const normalizedInterestRate =
    interestRate == null ? null : Number(interestRate)
  const normalizedInstallmentCount =
    installmentCount == null ? null : Math.max(1, Math.trunc(installmentCount))

  if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
    throw new Error("Nominal harus lebih dari 0")
  }

  if (
    normalizedInterestRate != null &&
    (!Number.isFinite(normalizedInterestRate) || normalizedInterestRate < 0)
  ) {
    throw new Error("Bunga tidak valid")
  }

  if (type != null && type !== "hutang" && type !== "piutang") {
    throw new Error("Tipe debt tidak valid")
  }

  if (interestType != null && interestType !== "flat" && interestType !== "efektif") {
    throw new Error("Jenis bunga tidak valid")
  }

  if (normalizedContactId) {
    const { data: existingContact, error: contactError } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("id", normalizedContactId)
      .maybeSingle()

    if (contactError) throw contactError
    if (!existingContact) throw new Error("Kontak yang dipilih tidak valid")
  }

  if (normalizedAccountId) {
    const { data: existingAccount, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("id", normalizedAccountId)
      .is("deleted_at", null)
      .maybeSingle()

    if (accountError) throw accountError
    if (!existingAccount) throw new Error("Akun yang dipilih tidak valid")
  }

  const rpcPayload = {
    p_user_id: userId,
    p_debt_id: normalizedDebtId,
    p_contact_id: normalizedContactId,
    p_type: type,
    p_amount: amount == null ? null : Math.round(amount),
    p_account_id: normalizedAccountId,
    p_clear_account: clearAccount,
    p_description: normalizedDescription,
    p_due_date: normalizedDueDate,
    p_interest_rate: normalizedInterestRate,
    p_interest_type: interestType,
    p_installment_count: normalizedInstallmentCount,
    p_start_date: startDate || null,
    p_updated_at: new Date().toISOString(),
  }

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "update_debt_record",
    rpcPayload
  )

  if (rpcError) {
    console.error("[updateDebtRecord RPC error]", {
      code: rpcError.code,
      message: rpcError.message,
      details: (rpcError as RpcErrorLike).details,
      hint: (rpcError as RpcErrorLike).hint,
      payload: rpcPayload,
    })

    if (isMissingRpcError(rpcError, "update_debt_record")) {
      throw new Error(
        "RPC `update_debt_record` belum tersedia di Supabase. Deploy SQL edit debt version terlebih dahulu."
      )
    }

    throw new Error(normalizeUpdateDebtErrorMessage(rpcError))
  }

  return (rpcData ?? { success: false }) as UpdateDebtRecordResult
}

/**
 * RPC-only debt payment service.
 *
 * Expects final proper-ledger `record_debt_payment` in Supabase.
 */
export async function recordDebtPayment({
  userId,
  debtId,
  amount,
  accountId = null,
  note = null,
  paidAt,
  createAccountTransaction = true,
}: RecordDebtPaymentInput): Promise<RecordDebtPaymentResult> {
  const supabase = createClient()

  if (!userId) throw new Error("User tidak valid")
  if (!debtId) throw new Error("Debt tidak valid")
  if (!amount || amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0")
  }

  const { data, error } = await (supabase.rpc as any)("record_debt_payment", {
    p_user_id: userId,
    p_debt_id: debtId,
    p_amount: amount,
    p_account_id: accountId,
    p_note: note?.trim() || null,
    p_paid_at: paidAt ?? new Date().toISOString(),
    p_create_account_tx: createAccountTransaction,
  })

  if (error) {
    console.error("[recordDebtPayment RPC error]", {
      code: error.code,
      message: error.message,
      details: (error as RpcErrorLike).details,
      hint: (error as RpcErrorLike).hint,
    })

    const message = String(error.message || "")
    const missingRpc =
      message.includes("Could not find the function") ||
      message.includes("record_debt_payment") ||
      error.code === "PGRST202"

    if (missingRpc) {
      throw new Error(
        "RPC `record_debt_payment` belum tersedia di Supabase. Deploy SQL proper-ledger version terlebih dahulu."
      )
    }

    throw new Error(normalizeRecordDebtPaymentErrorMessage(error))
  }

  return (data ?? { success: false }) as RecordDebtPaymentResult
}