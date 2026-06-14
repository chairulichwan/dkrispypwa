create or replace function public.update_debt_record(
  p_user_id uuid,
  p_debt_id uuid,
  p_contact_id uuid default null,
  p_type text default null,
  p_amount numeric default null,
  p_account_id uuid default null,
  p_clear_account boolean default false,
  p_description text default null,
  p_due_date date default null,
  p_interest_rate numeric default null,
  p_interest_type text default null,
  p_installment_count integer default null,
  p_start_date date default null,
  p_updated_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;

  -- current debt header
  v_current_contact_id uuid;
  v_current_account_id uuid;
  v_current_type text;
  v_current_amount bigint;
  v_current_description text;
  v_current_due_date date;
  v_current_interest_rate numeric;
  v_current_interest_type text;
  v_current_interest_rate_unit text;
  v_current_installment_count integer;
  v_current_start_date date;
  v_current_total_interest bigint;
  v_current_total_amount_due bigint;
  v_current_paid_amount bigint;
  v_current_origination_transaction_id uuid;

  -- next debt header
  v_new_contact_id uuid;
  v_new_account_id uuid;
  v_new_type text;
  v_new_amount bigint;
  v_new_description text;
  v_new_due_date date;
  v_new_interest_rate numeric;
  v_new_interest_type text;
  v_new_interest_rate_unit text;
  v_new_installment_count integer;
  v_new_start_date date;

  -- account / tx
  v_old_account_balance bigint := 0;
  v_old_reverted_balance bigint := 0;
  v_new_account_balance bigint := 0;
  v_new_next_balance bigint := 0;
  v_new_tx_amount integer := 0;
  v_new_tx_id uuid;

  -- schedule
  v_period integer;
  v_schedule_due_date date;
  v_first_due_date date;
  v_final_due_date date;
  v_installment_status text := 'belum_jatuh_tempo';
  v_total_interest bigint := 0;
  v_total_amount_due bigint := 0;

  -- flat
  v_flat_monthly_rate numeric := 0;
  v_flat_monthly_interest bigint := 0;
  v_flat_monthly_principal bigint := 0;
  v_remaining_principal bigint := 0;

  -- efektif/anuitas
  v_monthly_rate numeric := 0;
  v_annuity_payment bigint := 0;
  v_remaining_numeric numeric := 0;
  v_interest_due bigint := 0;
  v_principal_due bigint := 0;
  v_total_due bigint := 0;

  -- misc
  v_contact_name text;
  v_financial_change boolean := false;
  v_has_payment_rows boolean := false;
begin
  -- --------------------------------------------------------------------------
  -- auth & ownership
  -- --------------------------------------------------------------------------
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  -- --------------------------------------------------------------------------
  -- lock debt
  -- --------------------------------------------------------------------------
  select
    d.contact_id,
    d.account_id,
    d.type,
    d.amount,
    d.description,
    d.due_date,
    coalesce(d.interest_rate, 0),
    coalesce(d.interest_type, 'flat'),
    coalesce(d.interest_rate_unit, case when d.interest_type = 'flat' then 'monthly' else 'annual' end),
    greatest(coalesce(d.installment_count, 1), 1),
    d.start_date,
    coalesce(d.total_interest, 0),
    coalesce(d.total_amount_due, d.amount + coalesce(d.total_interest, 0)),
    coalesce(d.paid_amount, 0),
    d.origination_transaction_id
  into
    v_current_contact_id,
    v_current_account_id,
    v_current_type,
    v_current_amount,
    v_current_description,
    v_current_due_date,
    v_current_interest_rate,
    v_current_interest_type,
    v_current_interest_rate_unit,
    v_current_installment_count,
    v_current_start_date,
    v_current_total_interest,
    v_current_total_amount_due,
    v_current_paid_amount,
    v_current_origination_transaction_id
  from public.debts d
  where d.id = p_debt_id
    and d.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  -- --------------------------------------------------------------------------
  -- derive next values
  -- --------------------------------------------------------------------------
  v_new_contact_id := coalesce(p_contact_id, v_current_contact_id);
  v_new_type := coalesce(p_type, v_current_type);

  if v_new_type not in ('hutang', 'piutang') then
    raise exception 'Invalid debt type';
  end if;

  if p_amount is null then
    v_new_amount := v_current_amount;
  else
    if p_amount <= 0 then
      raise exception 'Amount must be greater than zero';
    end if;

    if p_amount <> trunc(p_amount) then
      raise exception 'Amount must be a whole number';
    end if;

    v_new_amount := p_amount::bigint;
  end if;

  v_new_description := case
    when p_description is null then v_current_description
    else nullif(btrim(p_description), '')
  end;

  v_new_due_date := coalesce(p_due_date, v_current_due_date);
  v_new_interest_rate := coalesce(p_interest_rate, v_current_interest_rate);

  v_new_interest_type := case
    when p_interest_type is null then v_current_interest_type
    when p_interest_type = 'efektif' then 'efektif'
    else 'flat'
  end;

  v_new_interest_rate_unit := case
    when v_new_interest_type = 'flat' then 'monthly'
    else 'annual'
  end;

  v_new_installment_count := greatest(coalesce(p_installment_count, v_current_installment_count), 1);
  v_new_start_date := coalesce(p_start_date, v_current_start_date, timezone('UTC', p_updated_at)::date, current_date);

  v_new_account_id := case
    when p_clear_account then null
    when p_account_id is not null then p_account_id
    else v_current_account_id
  end;

  -- --------------------------------------------------------------------------
  -- validate new contact
  -- --------------------------------------------------------------------------
  select c.name
    into v_contact_name
  from public.contacts c
  where c.id = v_new_contact_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  -- --------------------------------------------------------------------------
  -- detect whether financial terms changed
  -- --------------------------------------------------------------------------
  v_financial_change :=
    v_new_type is distinct from v_current_type
    or v_new_amount is distinct from v_current_amount
    or v_new_account_id is distinct from v_current_account_id
    or v_new_interest_rate is distinct from v_current_interest_rate
    or v_new_interest_type is distinct from v_current_interest_type
    or v_new_installment_count is distinct from v_current_installment_count
    or v_new_start_date is distinct from v_current_start_date;

  -- --------------------------------------------------------------------------
  -- if debt already has payment, only metadata edit allowed
  -- --------------------------------------------------------------------------
  if v_current_paid_amount > 0 then
    if v_financial_change then
      raise exception 'Debt yang sudah memiliki pembayaran hanya bisa mengubah keterangan, kontak, dan jatuh tempo';
    end if;

    update public.debts
    set
      contact_id = v_new_contact_id,
      description = v_new_description,
      due_date = v_new_due_date,
      updated_at = now()
    where id = p_debt_id;

    return jsonb_build_object(
      'success', true,
      'debt_id', p_debt_id,
      'status', 'aktif',
      'mode', 'metadata_only'
    );
  end if;

  -- --------------------------------------------------------------------------
  -- safety: unpaid debt but old payment rows somehow exist = inconsistent
  -- --------------------------------------------------------------------------
  select exists (
    select 1
    from public.debt_payments dp
    where dp.debt_id = p_debt_id
  )
  into v_has_payment_rows;

  if v_has_payment_rows then
    raise exception 'Debt unpaid summary inconsistent: payment rows exist. Please repair ledger first';
  end if;

  -- --------------------------------------------------------------------------
  -- reverse old origination if needed
  -- --------------------------------------------------------------------------
  if v_current_account_id is not null then
    if v_current_origination_transaction_id is null then
      raise exception 'Debt lama tanpa origination transaction tidak bisa diedit penuh. Archive dan buat ulang debt';
    end if;

    select balance
      into v_old_account_balance
    from public.accounts
    where id = v_current_account_id
      and user_id = v_user_id
      and deleted_at is null
    for update;

    if not found then
      raise exception 'Current account not found';
    end if;

    v_old_account_balance := coalesce(v_old_account_balance, 0);

    v_old_reverted_balance := case
      when v_current_type = 'piutang' then v_old_account_balance + v_current_amount
      else v_old_account_balance - v_current_amount
    end;
  end if;

  -- --------------------------------------------------------------------------
  -- validate / lock new account
  -- --------------------------------------------------------------------------
  if v_new_account_id is not null then
    v_new_tx_amount := v_new_amount::integer;

    if v_new_amount > 2147483647 then
      raise exception 'Amount exceeds transactions.amount integer limit; migrate transactions.amount to bigint first';
    end if;

    if v_current_account_id is not null and v_new_account_id = v_current_account_id then
      v_new_account_balance := v_old_reverted_balance;
    else
      select balance
        into v_new_account_balance
      from public.accounts
      where id = v_new_account_id
        and user_id = v_user_id
        and deleted_at is null
      for update;

      if not found then
        raise exception 'Account not found';
      end if;

      v_new_account_balance := coalesce(v_new_account_balance, 0);
    end if;

    if v_new_type = 'piutang' and v_new_account_balance < v_new_amount then
      raise exception 'Insufficient balance';
    end if;

    v_new_next_balance := case
      when v_new_type = 'piutang' then v_new_account_balance - v_new_amount
      else v_new_account_balance + v_new_amount
    end;
  end if;

  -- --------------------------------------------------------------------------
  -- remove old origination transaction
  -- --------------------------------------------------------------------------
  if v_current_origination_transaction_id is not null then
    delete from public.transactions
    where id = v_current_origination_transaction_id
      and user_id = v_user_id;
  end if;

  -- --------------------------------------------------------------------------
  -- restore old account balance if account changed or removed
  -- --------------------------------------------------------------------------
  if v_current_account_id is not null then
    if v_new_account_id is null or v_new_account_id <> v_current_account_id then
      update public.accounts
      set balance = v_old_reverted_balance
      where id = v_current_account_id;
    end if;
  end if;

  -- --------------------------------------------------------------------------
  -- clear old installments / allocations (should be safe because unpaid)
  -- --------------------------------------------------------------------------
  delete from public.debt_payment_allocations
  where debt_id = p_debt_id;

  delete from public.debt_installments
  where debt_id = p_debt_id;

  -- --------------------------------------------------------------------------
  -- regenerate schedule with hybrid rate
  -- --------------------------------------------------------------------------
  if v_new_interest_type = 'flat' then
    -- flat = monthly
    v_flat_monthly_rate := v_new_interest_rate / 100;
    v_flat_monthly_interest := round(v_new_amount * v_flat_monthly_rate);
    v_flat_monthly_principal := round(v_new_amount::numeric / v_new_installment_count);
    v_remaining_principal := v_new_amount;

    for v_period in 1..v_new_installment_count loop
      if v_new_installment_count = 1 and v_new_due_date is not null then
        v_schedule_due_date := v_new_due_date;
      else
        v_schedule_due_date := (v_new_start_date + make_interval(months => v_period))::date;
      end if;

      v_principal_due := case
        when v_period = v_new_installment_count then v_remaining_principal
        else least(v_flat_monthly_principal, v_remaining_principal)
      end;

      v_interest_due := v_flat_monthly_interest;
      v_total_due := v_principal_due + v_interest_due;

      v_remaining_principal := greatest(v_remaining_principal - v_principal_due, 0);
      v_total_interest := v_total_interest + v_interest_due;

      if v_schedule_due_date < current_date then
        v_installment_status := 'terlambat';
      elsif v_schedule_due_date = current_date then
        v_installment_status := 'jatuh_tempo';
      else
        v_installment_status := 'belum_jatuh_tempo';
      end if;

      if v_first_due_date is null then
        v_first_due_date := v_schedule_due_date;
      end if;
      v_final_due_date := v_schedule_due_date;

      insert into public.debt_installments (
        debt_id,
        user_id,
        period_no,
        due_date,
        principal_due,
        interest_due,
        total_due,
        principal_paid,
        interest_paid,
        total_paid,
        status,
        paid_at
      ) values (
        p_debt_id,
        v_user_id,
        v_period,
        v_schedule_due_date,
        v_principal_due,
        v_interest_due,
        v_total_due,
        0,
        0,
        0,
        v_installment_status,
        null
      );
    end loop;

  else
    -- efektif = annual
    v_monthly_rate := v_new_interest_rate / 100 / 12;
    v_remaining_numeric := v_new_amount;

    if v_monthly_rate = 0 then
      v_annuity_payment := ceil(v_new_amount::numeric / v_new_installment_count);
    else
      v_annuity_payment := ceil(
        (
          v_new_amount::numeric
          * v_monthly_rate
          * power(1 + v_monthly_rate, v_new_installment_count)
        ) / (
          power(1 + v_monthly_rate, v_new_installment_count) - 1
        )
      );
    end if;

    for v_period in 1..v_new_installment_count loop
      if v_new_installment_count = 1 and v_new_due_date is not null then
        v_schedule_due_date := v_new_due_date;
      else
        v_schedule_due_date := (v_new_start_date + make_interval(months => v_period))::date;
      end if;

      v_interest_due := round(v_remaining_numeric * v_monthly_rate);
      v_principal_due := v_annuity_payment - v_interest_due;

      if v_period = v_new_installment_count or v_principal_due >= v_remaining_numeric then
        v_principal_due := round(v_remaining_numeric);
        v_interest_due := greatest(v_annuity_payment - v_principal_due, 0);
      end if;

      v_total_due := v_principal_due + v_interest_due;
      v_remaining_numeric := greatest(v_remaining_numeric - v_principal_due, 0);
      v_total_interest := v_total_interest + v_interest_due;

      if v_schedule_due_date < current_date then
        v_installment_status := 'terlambat';
      elsif v_schedule_due_date = current_date then
        v_installment_status := 'jatuh_tempo';
      else
        v_installment_status := 'belum_jatuh_tempo';
      end if;

      if v_first_due_date is null then
        v_first_due_date := v_schedule_due_date;
      end if;
      v_final_due_date := v_schedule_due_date;

      insert into public.debt_installments (
        debt_id,
        user_id,
        period_no,
        due_date,
        principal_due,
        interest_due,
        total_due,
        principal_paid,
        interest_paid,
        total_paid,
        status,
        paid_at
      ) values (
        p_debt_id,
        v_user_id,
        v_period,
        v_schedule_due_date,
        v_principal_due,
        v_interest_due,
        v_total_due,
        0,
        0,
        0,
        v_installment_status,
        null
      );
    end loop;
  end if;

  v_total_amount_due := v_new_amount + v_total_interest;

  -- --------------------------------------------------------------------------
  -- apply new account origination
  -- --------------------------------------------------------------------------
  if v_new_account_id is not null then
    if v_current_account_id is not null and v_new_account_id = v_current_account_id then
      update public.accounts
      set balance = v_new_next_balance
      where id = v_current_account_id;
    else
      update public.accounts
      set balance = v_new_next_balance
      where id = v_new_account_id;
    end if;

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
      v_new_account_id,
      case when v_new_type = 'piutang' then 'expense' else 'income' end,
      v_new_tx_amount,
      case when v_new_type = 'piutang' then 'Piutang Pokok' else 'Hutang Pokok' end,
      coalesce(
        v_new_description,
        case
          when v_new_type = 'piutang' then 'Beri piutang - ' || v_contact_name
          else 'Terima hutang - ' || v_contact_name
        end
      ),
      timezone('UTC', p_updated_at)
    )
    returning id into v_new_tx_id;
  end if;

  -- --------------------------------------------------------------------------
  -- update debt header final
  -- --------------------------------------------------------------------------
  update public.debts
  set
    contact_id = v_new_contact_id,
    account_id = v_new_account_id,
    type = v_new_type,
    amount = v_new_amount,
    paid_amount = 0,
    paid_principal = 0,
    paid_interest = 0,
    total_interest = v_total_interest,
    total_amount_due = v_total_amount_due,
    description = v_new_description,
    due_date = coalesce(v_new_due_date, v_final_due_date),
    status = 'aktif',
    interest_rate = v_new_interest_rate,
    interest_type = v_new_interest_type,
    interest_rate_unit = v_new_interest_rate_unit,
    installment_count = v_new_installment_count,
    installment_amount = case
      when v_new_installment_count > 0 then (
        select di.total_due
        from public.debt_installments di
        where di.debt_id = p_debt_id
        order by di.period_no asc
        limit 1
      )
      else 0
    end,
    start_date = v_new_start_date,
    disbursed_at = p_updated_at,
    settled_at = null,
    origination_transaction_id = v_new_tx_id,
    updated_at = now()
  where id = p_debt_id;

  return jsonb_build_object(
    'success', true,
    'debt_id', p_debt_id,
    'status', 'aktif',
    'mode', 'full_edit',
    'total_interest', v_total_interest,
    'total_amount_due', v_total_amount_due,
    'interest_type', v_new_interest_type,
    'interest_rate', v_new_interest_rate,
    'interest_rate_unit', v_new_interest_rate_unit,
    'installment_count', v_new_installment_count,
    'first_due_date', v_first_due_date,
    'final_due_date', coalesce(v_new_due_date, v_final_due_date),
    'origination_transaction_id', v_new_tx_id,
    'account_id', v_new_account_id,
    'account_balance', case when v_new_account_id is not null then v_new_next_balance else null end
  );
end;
$$;

revoke all on function public.update_debt_record(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  boolean,
  text,
  date,
  numeric,
  text,
  integer,
  date,
  timestamptz
) from public;

grant execute on function public.update_debt_record(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  boolean,
  text,
  date,
  numeric,
  text,
  integer,
  date,
  timestamptz
) to authenticated;

grant execute on function public.update_debt_record(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  boolean,
  text,
  date,
  numeric,
  text,
  integer,
  date,
  timestamptz
) to service_role;

comment on function public.update_debt_record(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  boolean,
  text,
  date,
  numeric,
  text,
  integer,
  date,
  timestamptz
) is
'Update debt record. Full edit allowed only when paid_amount = 0. After payment exists, metadata-only update is allowed.';