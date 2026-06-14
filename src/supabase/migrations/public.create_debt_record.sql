create or replace function public.create_debt_record(
  p_user_id uuid,
  p_contact_id uuid,
  p_type text,
  p_amount numeric,
  p_account_id uuid default null,
  p_description text default null,
  p_due_date date default null,
  p_interest_rate numeric default 0,
  p_interest_type text default 'flat',
  p_installment_count integer default 1,
  p_installment_amount numeric default 0,
  p_start_date date default null,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;

  v_principal bigint;
  v_contact_name text;
  v_description text;
  v_type text;
  v_interest_type text;
  v_interest_rate_unit text;
  v_interest_rate numeric;
  v_installment_count integer;
  v_start_date date;

  v_debt_id uuid;
  v_tx_id uuid;
  v_status text := 'aktif';

  v_balance bigint := 0;
  v_next_balance bigint := 0;
  v_tx_amount integer;

  v_total_interest bigint := 0;
  v_total_amount_due bigint := 0;

  v_period integer;
  v_due_date date;
  v_first_due_date date;
  v_final_due_date date;
  v_installment_status text;

  -- flat calculation (MONTHLY RATE)
  v_flat_monthly_rate numeric := 0;
  v_flat_monthly_interest bigint := 0;
  v_flat_monthly_principal bigint := 0;
  v_remaining_principal bigint := 0;

  -- effective/anuitas calculation (ANNUAL RATE -> MONTHLY)
  v_monthly_rate numeric := 0;
  v_annuity_payment bigint := 0;
  v_remaining_numeric numeric := 0;
  v_interest_due bigint := 0;
  v_principal_due bigint := 0;
  v_total_due bigint := 0;
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
  -- Validate input
  -- --------------------------------------------------------------------------
  v_type := coalesce(trim(p_type), '');
  if v_type not in ('hutang', 'piutang') then
    raise exception 'Invalid debt type';
  end if;

  v_interest_type := case
    when p_interest_type = 'efektif' then 'efektif'
    else 'flat'
  end;

  v_interest_rate_unit := case
    when v_interest_type = 'flat' then 'monthly'
    else 'annual'
  end;

  v_interest_rate := greatest(coalesce(p_interest_rate, 0), 0);
  v_installment_count := greatest(coalesce(p_installment_count, 1), 1);
  v_start_date := coalesce(p_start_date, timezone('UTC', p_created_at)::date, current_date);

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_principal := p_amount::bigint;

  if p_account_id is not null and v_principal > 2147483647 then
    raise exception 'Amount exceeds transactions.amount integer limit; migrate transactions.amount to bigint first';
  end if;

  -- --------------------------------------------------------------------------
  -- Validate contact
  -- --------------------------------------------------------------------------
  select c.name
    into v_contact_name
  from public.contacts c
  where c.id = p_contact_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');

  -- --------------------------------------------------------------------------
  -- Validate / lock account if selected
  -- --------------------------------------------------------------------------
  if p_account_id is not null then
    v_tx_amount := v_principal::integer;

    select balance
      into v_balance
    from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and deleted_at is null
    for update;

    if not found then
      raise exception 'Account not found';
    end if;

    v_balance := coalesce(v_balance, 0);

    if v_type = 'piutang' and v_balance < v_principal then
      raise exception 'Insufficient balance';
    end if;

    v_next_balance := case
      when v_type = 'piutang' then v_balance - v_principal
      else v_balance + v_principal
    end;
  end if;

  -- --------------------------------------------------------------------------
  -- Insert debt header first (temporary totals, updated after schedule generation)
  -- --------------------------------------------------------------------------
  insert into public.debts (
    user_id,
    contact_id,
    account_id,
    type,
    amount,
    paid_amount,
    paid_principal,
    paid_interest,
    total_interest,
    total_amount_due,
    description,
    due_date,
    status,
    interest_rate,
    interest_type,
    interest_rate_unit,
    installment_count,
    installment_amount,
    start_date,
    disbursed_at,
    settled_at
  ) values (
    v_user_id,
    p_contact_id,
    p_account_id,
    v_type,
    v_principal,
    0,
    0,
    0,
    0,
    v_principal,
    v_description,
    p_due_date,
    v_status,
    v_interest_rate,
    v_interest_type,
    v_interest_rate_unit,
    v_installment_count,
    0,
    v_start_date,
    p_created_at,
    null
  )
  returning id into v_debt_id;

  -- --------------------------------------------------------------------------
  -- Generate installments
  -- --------------------------------------------------------------------------
  if v_interest_type = 'flat' then
    -- Flat = monthly rate
    v_flat_monthly_rate := v_interest_rate / 100;
    v_flat_monthly_interest := round(v_principal * v_flat_monthly_rate);
    v_flat_monthly_principal := round(v_principal::numeric / v_installment_count);
    v_remaining_principal := v_principal;

    for v_period in 1..v_installment_count loop
      if v_installment_count = 1 and p_due_date is not null then
        v_due_date := p_due_date;
      else
        v_due_date := (v_start_date + make_interval(months => v_period))::date;
      end if;

      v_principal_due := case
        when v_period = v_installment_count then v_remaining_principal
        else least(v_flat_monthly_principal, v_remaining_principal)
      end;

      v_interest_due := v_flat_monthly_interest;
      v_total_due := v_principal_due + v_interest_due;

      v_remaining_principal := greatest(v_remaining_principal - v_principal_due, 0);
      v_total_interest := v_total_interest + v_interest_due;

      if v_due_date < current_date then
        v_installment_status := 'terlambat';
      elsif v_due_date = current_date then
        v_installment_status := 'jatuh_tempo';
      else
        v_installment_status := 'belum_jatuh_tempo';
      end if;

      if v_first_due_date is null then
        v_first_due_date := v_due_date;
      end if;
      v_final_due_date := v_due_date;

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
        v_debt_id,
        v_user_id,
        v_period,
        v_due_date,
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
    -- Efektif / anuitas = annual rate
    v_monthly_rate := v_interest_rate / 100 / 12;
    v_remaining_numeric := v_principal;

    if v_monthly_rate = 0 then
      v_annuity_payment := ceil(v_principal::numeric / v_installment_count);
    else
      v_annuity_payment := ceil(
        (
          v_principal::numeric
          * v_monthly_rate
          * power(1 + v_monthly_rate, v_installment_count)
        ) / (
          power(1 + v_monthly_rate, v_installment_count) - 1
        )
      );
    end if;

    for v_period in 1..v_installment_count loop
      if v_installment_count = 1 and p_due_date is not null then
        v_due_date := p_due_date;
      else
        v_due_date := (v_start_date + make_interval(months => v_period))::date;
      end if;

      v_interest_due := round(v_remaining_numeric * v_monthly_rate);
      v_principal_due := v_annuity_payment - v_interest_due;

      if v_period = v_installment_count or v_principal_due >= v_remaining_numeric then
        v_principal_due := round(v_remaining_numeric);
        v_interest_due := greatest(v_annuity_payment - v_principal_due, 0);
      end if;

      v_total_due := v_principal_due + v_interest_due;
      v_remaining_numeric := greatest(v_remaining_numeric - v_principal_due, 0);
      v_total_interest := v_total_interest + v_interest_due;

      if v_due_date < current_date then
        v_installment_status := 'terlambat';
      elsif v_due_date = current_date then
        v_installment_status := 'jatuh_tempo';
      else
        v_installment_status := 'belum_jatuh_tempo';
      end if;

      if v_first_due_date is null then
        v_first_due_date := v_due_date;
      end if;
      v_final_due_date := v_due_date;

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
        v_debt_id,
        v_user_id,
        v_period,
        v_due_date,
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

  v_total_amount_due := v_principal + v_total_interest;

  -- --------------------------------------------------------------------------
  -- Update debt header with final totals
  -- --------------------------------------------------------------------------
  update public.debts
  set
    total_interest = v_total_interest,
    total_amount_due = v_total_amount_due,
    installment_amount = case
      when v_installment_count > 0 then (
        select di.total_due
        from public.debt_installments di
        where di.debt_id = v_debt_id
        order by di.period_no asc
        limit 1
      )
      else 0
    end,
    due_date = coalesce(p_due_date, v_final_due_date)
  where id = v_debt_id;

  -- --------------------------------------------------------------------------
  -- Mutate account + insert origination transaction (principal only)
  -- --------------------------------------------------------------------------
  if p_account_id is not null then
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
      case when v_type = 'piutang' then 'expense' else 'income' end,
      v_tx_amount,
      case when v_type = 'piutang' then 'Piutang Pokok' else 'Hutang Pokok' end,
      coalesce(
        v_description,
        case
          when v_type = 'piutang' then 'Beri piutang - ' || v_contact_name
          else 'Terima hutang - ' || v_contact_name
        end
      ),
      timezone('UTC', p_created_at)
    )
    returning id into v_tx_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'debt_id', v_debt_id,
    'contact_id', p_contact_id,
    'status', v_status,
    'total_interest', v_total_interest,
    'total_amount_due', v_total_amount_due,
    'interest_type', v_interest_type,
    'interest_rate_unit', v_interest_rate_unit,
    'installment_count', v_installment_count,
    'first_due_date', v_first_due_date,
    'final_due_date', coalesce(p_due_date, v_final_due_date),
    'account_transaction_id', v_tx_id,
    'account_balance', case when p_account_id is not null then v_next_balance else null end
  );
end;
$$;