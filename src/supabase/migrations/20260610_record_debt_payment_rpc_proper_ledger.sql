create or replace function public.record_debt_payment(
  p_user_id uuid,
  p_debt_id uuid,
  p_amount numeric,
  p_account_id uuid default null,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_create_account_tx boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;

  v_amount bigint;
  v_tx_amount integer;

  v_debt_type text;
  v_interest_type text;
  v_interest_rate numeric;
  v_interest_rate_unit text;
  v_principal_amount bigint;
  v_total_interest bigint;
  v_total_amount_due bigint;
  v_paid_principal bigint;
  v_paid_interest bigint;
  v_paid_amount bigint;
  v_outstanding_amount bigint;

  v_contact_name text;
  v_payment_id uuid;
  v_tx_id uuid;

  v_balance bigint := 0;
  v_next_balance bigint := 0;

  v_payment_principal bigint := 0;
  v_payment_interest bigint := 0;
  v_remaining_payment bigint := 0;

  v_remaining_interest_due bigint := 0;
  v_remaining_principal_due bigint := 0;
  v_alloc_interest bigint := 0;
  v_alloc_principal bigint := 0;
  v_row_total_paid bigint := 0;
  v_installment_status text := 'belum_jatuh_tempo';

  v_new_paid_principal bigint := 0;
  v_new_paid_interest bigint := 0;
  v_new_paid_amount bigint := 0;
  v_new_status text := 'aktif';

  rec_installment record;
begin
  -- --------------------------------------------------------------------------
  -- Auth & ownership
  -- --------------------------------------------------------------------------
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  -- --------------------------------------------------------------------------
  -- Validate amount
  -- --------------------------------------------------------------------------
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;
  v_remaining_payment := v_amount;

  -- --------------------------------------------------------------------------
  -- Lock debt header
  -- --------------------------------------------------------------------------
  select
    d.type,
    coalesce(d.interest_type, 'flat'),
    coalesce(d.interest_rate, 0),
    coalesce(
      d.interest_rate_unit,
      case
        when d.interest_type = 'flat' then 'monthly'
        else 'annual'
      end
    ),
    d.amount,
    coalesce(d.total_interest, 0),
    coalesce(d.total_amount_due, d.amount + coalesce(d.total_interest, 0)),
    coalesce(d.paid_principal, 0),
    coalesce(d.paid_interest, 0),
    coalesce(d.paid_amount, 0),
    c.name
  into
    v_debt_type,
    v_interest_type,
    v_interest_rate,
    v_interest_rate_unit,
    v_principal_amount,
    v_total_interest,
    v_total_amount_due,
    v_paid_principal,
    v_paid_interest,
    v_paid_amount,
    v_contact_name
  from public.debts d
  join public.contacts c
    on c.id = d.contact_id
  where d.id = p_debt_id
    and d.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  v_outstanding_amount := greatest(v_total_amount_due - v_paid_amount, 0);

  if v_amount > v_outstanding_amount then
    raise exception 'Payment exceeds outstanding amount';
  end if;

  -- --------------------------------------------------------------------------
  -- Lock account if payment should mutate account
  -- --------------------------------------------------------------------------
  if p_create_account_tx and p_account_id is not null then
    if v_amount > 2147483647 then
      raise exception 'Amount exceeds transactions.amount integer limit; migrate transactions.amount to bigint first';
    end if;

    v_tx_amount := v_amount::integer;

    select balance
      into v_balance
    from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and deleted_at is null
    for update;

    if not found then
      raise exception 'Payment account not found';
    end if;

    v_balance := coalesce(v_balance, 0);

    if v_debt_type = 'hutang' and v_balance < v_amount then
      raise exception 'Insufficient balance';
    end if;

    v_next_balance := case
      when v_debt_type = 'piutang' then v_balance + v_amount
      else v_balance - v_amount
    end;
  end if;

  -- --------------------------------------------------------------------------
  -- Create payment header first
  -- IMPORTANT:
  -- provisional split to satisfy constraint:
  -- amount = principal_amount + interest_amount
  -- Will be corrected after allocation.
  -- --------------------------------------------------------------------------
  insert into public.debt_payments (
    debt_id,
    user_id,
    amount,
    principal_amount,
    interest_amount,
    account_id,
    note,
    paid_at,
    account_transaction_id
  ) values (
    p_debt_id,
    v_user_id,
    v_amount,
    v_amount,
    0,
    case when p_create_account_tx and p_account_id is not null then p_account_id else null end,
    nullif(btrim(coalesce(p_note, '')), ''),
    p_paid_at,
    null
  )
  returning id into v_payment_id;

  -- --------------------------------------------------------------------------
  -- Allocate payment to installments (oldest first, interest first)
  -- --------------------------------------------------------------------------
  for rec_installment in
    select
      di.id,
      di.period_no,
      di.due_date,
      coalesce(di.principal_due, 0) as principal_due,
      coalesce(di.interest_due, 0) as interest_due,
      coalesce(di.principal_paid, 0) as principal_paid,
      coalesce(di.interest_paid, 0) as interest_paid,
      coalesce(di.total_due, 0) as total_due,
      coalesce(di.total_paid, 0) as total_paid
    from public.debt_installments di
    where di.debt_id = p_debt_id
    order by di.period_no asc
    for update
  loop
    exit when v_remaining_payment <= 0;

    v_remaining_interest_due :=
      greatest(rec_installment.interest_due - rec_installment.interest_paid, 0);

    v_remaining_principal_due :=
      greatest(rec_installment.principal_due - rec_installment.principal_paid, 0);

    if v_remaining_interest_due = 0 and v_remaining_principal_due = 0 then
      continue;
    end if;

    v_alloc_interest := least(v_remaining_payment, v_remaining_interest_due);
    v_remaining_payment := v_remaining_payment - v_alloc_interest;

    v_alloc_principal := least(v_remaining_payment, v_remaining_principal_due);
    v_remaining_payment := v_remaining_payment - v_alloc_principal;

    if v_alloc_interest > 0 or v_alloc_principal > 0 then
      v_row_total_paid :=
        rec_installment.principal_paid
        + rec_installment.interest_paid
        + v_alloc_principal
        + v_alloc_interest;

      if v_row_total_paid >= rec_installment.total_due and rec_installment.total_due > 0 then
        v_installment_status := 'lunas';
      elsif v_row_total_paid > 0 then
        v_installment_status := 'terbayar_sebagian';
      elsif rec_installment.due_date < current_date then
        v_installment_status := 'terlambat';
      elsif rec_installment.due_date = current_date then
        v_installment_status := 'jatuh_tempo';
      else
        v_installment_status := 'belum_jatuh_tempo';
      end if;

      update public.debt_installments
      set
        principal_paid = principal_paid + v_alloc_principal,
        interest_paid = interest_paid + v_alloc_interest,
        total_paid = total_paid + v_alloc_principal + v_alloc_interest,
        status = v_installment_status,
        paid_at = case
          when v_installment_status = 'lunas' then coalesce(paid_at, p_paid_at)
          else paid_at
        end
      where id = rec_installment.id;

      insert into public.debt_payment_allocations (
        payment_id,
        debt_id,
        installment_id,
        principal_amount,
        interest_amount,
        total_amount
      ) values (
        v_payment_id,
        p_debt_id,
        rec_installment.id,
        v_alloc_principal,
        v_alloc_interest,
        v_alloc_principal + v_alloc_interest
      );

      v_payment_principal := v_payment_principal + v_alloc_principal;
      v_payment_interest := v_payment_interest + v_alloc_interest;
    end if;
  end loop;

  -- --------------------------------------------------------------------------
  -- Fallback allocation for legacy debts / rounding remainder
  -- --------------------------------------------------------------------------
  if v_remaining_payment > 0 then
    v_remaining_interest_due :=
      greatest(v_total_interest - v_paid_interest - v_payment_interest, 0);

    v_remaining_principal_due :=
      greatest(v_principal_amount - v_paid_principal - v_payment_principal, 0);

    v_alloc_interest := least(v_remaining_payment, v_remaining_interest_due);
    v_remaining_payment := v_remaining_payment - v_alloc_interest;

    v_alloc_principal := least(v_remaining_payment, v_remaining_principal_due);
    v_remaining_payment := v_remaining_payment - v_alloc_principal;

    if v_alloc_interest > 0 or v_alloc_principal > 0 then
      insert into public.debt_payment_allocations (
        payment_id,
        debt_id,
        installment_id,
        principal_amount,
        interest_amount,
        total_amount
      ) values (
        v_payment_id,
        p_debt_id,
        null,
        v_alloc_principal,
        v_alloc_interest,
        v_alloc_principal + v_alloc_interest
      );

      v_payment_principal := v_payment_principal + v_alloc_principal;
      v_payment_interest := v_payment_interest + v_alloc_interest;
    end if;
  end if;

  if v_remaining_payment <> 0 then
    raise exception 'Payment allocation failed';
  end if;

  -- --------------------------------------------------------------------------
  -- Update debt header summary
  -- --------------------------------------------------------------------------
  v_new_paid_principal := v_paid_principal + v_payment_principal;
  v_new_paid_interest := v_paid_interest + v_payment_interest;
  v_new_paid_amount := v_new_paid_principal + v_new_paid_interest;

  v_new_status := case
    when v_new_paid_amount >= v_total_amount_due then 'lunas'
    else 'aktif'
  end;

  update public.debts
  set
    paid_principal = v_new_paid_principal,
    paid_interest = v_new_paid_interest,
    paid_amount = v_new_paid_amount,
    status = v_new_status,
    settled_at = case
      when v_new_status = 'lunas' then coalesce(settled_at, p_paid_at)
      else null
    end
  where id = p_debt_id;

  update public.debt_installments
  set status = case
    when total_paid >= total_due and total_due > 0 then 'lunas'
    when total_paid > 0 and total_paid < total_due then 'terbayar_sebagian'
    when due_date < current_date then 'terlambat'
    when due_date = current_date then 'jatuh_tempo'
    else 'belum_jatuh_tempo'
  end
  where debt_id = p_debt_id
    and status <> 'lunas';

  -- --------------------------------------------------------------------------
  -- Mutate account & insert aggregated account transaction
  -- --------------------------------------------------------------------------
  if p_create_account_tx and p_account_id is not null then
    update public.accounts
    set balance = v_next_balance
    where id = p_account_id;

    insert into public.transactions (
      user_id,
      account_id,
      type,
      amount,
      category,
      note,
      created_at
    ) values (
      v_user_id,
      p_account_id,
      case when v_debt_type = 'piutang' then 'income' else 'expense' end,
      v_tx_amount,
      case
        when v_debt_type = 'piutang' then 'Pembayaran Piutang'
        else 'Pembayaran Hutang'
      end,
      coalesce(
        nullif(btrim(coalesce(p_note, '')), ''),
        case
          when v_debt_type = 'piutang' then
            'Terima pembayaran piutang - ' || v_contact_name
          else
            'Bayar hutang - ' || v_contact_name
        end
      )
      || ' | pokok: ' || v_payment_principal::text
      || ' | bunga: ' || v_payment_interest::text,
      timezone('UTC', p_paid_at)
    )
    returning id into v_tx_id;

    update public.debt_payments
    set account_transaction_id = v_tx_id
    where id = v_payment_id;
  end if;

  -- --------------------------------------------------------------------------
  -- Update payment split fields
  -- --------------------------------------------------------------------------
  update public.debt_payments
  set
    principal_amount = v_payment_principal,
    interest_amount = v_payment_interest,
    amount = v_payment_principal + v_payment_interest
  where id = v_payment_id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'debt_status', v_new_status,
    'debt_paid_amount', v_new_paid_amount,
    'paid_principal', v_payment_principal,
    'paid_interest', v_payment_interest,
    'outstanding_amount', greatest(v_total_amount_due - v_new_paid_amount, 0),
    'principal_amount', v_principal_amount,
    'total_interest', v_total_interest,
    'total_amount_due', v_total_amount_due,
    'interest_type', v_interest_type,
    'interest_rate', v_interest_rate,
    'interest_rate_unit', v_interest_rate_unit,
    'account_transaction_id', v_tx_id,
    'account_balance',
      case
        when p_create_account_tx and p_account_id is not null then v_next_balance
        else null
      end
  );
end;
$$;

revoke all on function public.record_debt_payment(
  uuid,
  uuid,
  numeric,
  uuid,
  text,
  timestamptz,
  boolean
) from public;

grant execute on function public.record_debt_payment(
  uuid,
  uuid,
  numeric,
  uuid,
  text,
  timestamptz,
  boolean
) to authenticated;

grant execute on function public.record_debt_payment(
  uuid,
  uuid,
  numeric,
  uuid,
  text,
  timestamptz,
  boolean
) to service_role;

comment on function public.record_debt_payment(
  uuid,
  uuid,
  numeric,
  uuid,
  text,
  timestamptz,
  boolean
) is
'Record debt payment with proper ledger allocation and hybrid interest metadata (flat=monthly, efektif=annual).';