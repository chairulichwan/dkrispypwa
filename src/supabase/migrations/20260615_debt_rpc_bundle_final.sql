-- Final consolidated debt RPC bundle
-- Includes:
-- 1) create_debt_record
-- 2) update_debt_record
-- 3) record_debt_payment
--
-- Business rules:
-- - flat    = monthly rate
-- - efektif = annual rate
-- - create piutang + account => account balance decreases by principal
-- - create hutang  + account => account balance increases by principal
-- - payment allocation => oldest installment first, interest first then principal
-- - unpaid debt => full edit allowed
-- - paid debt   => metadata-only edit allowed

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
set search_path to 'public'
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_effective_created_at timestamptz := coalesce(p_created_at, now());

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

  -- flat (MONTHLY RATE)
  v_flat_monthly_rate numeric := 0;
  v_flat_monthly_interest bigint := 0;
  v_flat_monthly_principal bigint := 0;
  v_remaining_principal bigint := 0;

  -- efektif/anuitas (ANNUAL RATE -> MONTHLY)
  v_monthly_rate numeric := 0;
  v_annuity_payment bigint := 0;
  v_remaining_numeric numeric := 0;
  v_interest_due bigint := 0;
  v_principal_due bigint := 0;
  v_total_due bigint := 0;
begin
  -- auth & ownership
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  -- validate input
  v_type := coalesce(trim(p_type), '');
  if v_type not in ('hutang', 'piutang') then
    raise exception 'Invalid debt type';
  end if;

  v_interest_type := case
    when p_interest_type = 'efektif' then 'efektif'
    else 'flat'
  end;

  -- hybrid rate:
  -- flat    = monthly
  -- efektif = annual
  v_interest_rate_unit := case
    when v_interest_type = 'flat' then 'monthly'
    else 'annual'
  end;

  v_interest_rate := greatest(coalesce(p_interest_rate, 0), 0);
  v_installment_count := greatest(coalesce(p_installment_count, 1), 1);
  v_start_date := coalesce(p_start_date, timezone('UTC', v_effective_created_at)::date, current_date);

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

  -- validate contact
  select c.name
    into v_contact_name
  from public.contacts c
  where c.id = p_contact_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');

  -- validate / lock account if selected
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

  -- insert debt header first
  insert into public.debts (
    user_id,
    contact_id,
    account_id,
    origination_transaction_id,
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
    null,
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
    v_effective_created_at,
    null
  )
  returning id into v_debt_id;

  -- generate installments
  if v_interest_type = 'flat' then
    -- flat = monthly rate
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
    -- efektif = annual rate
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
        v_interest_due := case
          when v_monthly_rate = 0 then 0
          else greatest(v_annuity_payment - v_principal_due, 0)
        end;
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

  -- update debt header with final totals
  update public.debts
  set
    total_interest = v_total_interest,
    total_amount_due = v_total_amount_due,
    installment_amount = coalesce((
      select di.total_due
      from public.debt_installments di
      where di.debt_id = v_debt_id
      order by di.period_no asc
      limit 1
    ), 0),
    due_date = p_due_date
  where id = v_debt_id;

  -- mutate account + insert origination transaction
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
      v_effective_created_at
    )
    returning id into v_tx_id;

    update public.debts
    set origination_transaction_id = v_tx_id
    where id = v_debt_id;
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
    'final_due_date', v_final_due_date,
    'origination_transaction_id', v_tx_id,
    'account_transaction_id', v_tx_id,
    'account_balance', case when p_account_id is not null then v_next_balance else null end
  );
end;
$function$;


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
set search_path to 'public'
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_now timestamptz := coalesce(p_updated_at, now());

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
  v_current_status text;
  v_current_disbursed_at timestamptz;

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
  v_new_tx_id uuid := null;

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
  v_effective_disbursed_at timestamptz;
begin
  -- auth & ownership
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  -- lock debt
  select
    d.contact_id,
    d.account_id,
    d.type,
    d.amount,
    d.description,
    d.due_date,
    coalesce(d.interest_rate, 0),
    coalesce(d.interest_type, 'flat'),
    coalesce(
      d.interest_rate_unit,
      case
        when d.interest_type = 'flat' then 'monthly'
        else 'annual'
      end
    ),
    greatest(coalesce(d.installment_count, 1), 1),
    d.start_date,
    coalesce(d.total_interest, 0),
    coalesce(d.total_amount_due, d.amount + coalesce(d.total_interest, 0)),
    coalesce(d.paid_amount, 0),
    d.origination_transaction_id,
    d.status,
    d.disbursed_at
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
    v_current_origination_transaction_id,
    v_current_status,
    v_current_disbursed_at
  from public.debts d
  where d.id = p_debt_id
    and d.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  -- derive next values
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

  -- null from frontend means clear value
  v_new_description := nullif(btrim(coalesce(p_description, '')), '');
  v_new_due_date := p_due_date;

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

  v_new_installment_count :=
    greatest(coalesce(p_installment_count, v_current_installment_count), 1);

  v_new_start_date :=
    coalesce(
      p_start_date,
      v_current_start_date,
      timezone('UTC', v_now)::date,
      current_date
    );

  v_new_account_id := case
    when p_clear_account then null
    when p_account_id is not null then p_account_id
    else v_current_account_id
  end;

  v_effective_disbursed_at := coalesce(v_current_disbursed_at, v_now);

  -- validate new contact
  select c.name
    into v_contact_name
  from public.contacts c
  where c.id = v_new_contact_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  -- detect whether financial terms changed
  v_financial_change :=
    v_new_type is distinct from v_current_type
    or v_new_amount is distinct from v_current_amount
    or v_new_account_id is distinct from v_current_account_id
    or v_new_interest_rate is distinct from v_current_interest_rate
    or v_new_interest_type is distinct from v_current_interest_type
    or v_new_installment_count is distinct from v_current_installment_count
    or v_new_start_date is distinct from v_current_start_date;

  -- paid debt => metadata-only
  if v_current_paid_amount > 0 then
    if v_financial_change then
      raise exception 'Debt yang sudah memiliki pembayaran hanya bisa mengubah keterangan, kontak, dan jatuh tempo';
    end if;

    update public.debts
    set
      contact_id = v_new_contact_id,
      description = v_new_description,
      due_date = v_new_due_date,
      updated_at = v_now
    where id = p_debt_id;

    return jsonb_build_object(
      'success', true,
      'debt_id', p_debt_id,
      'status', v_current_status,
      'mode', 'metadata_only',
      'total_interest', v_current_total_interest,
      'total_amount_due', v_current_total_amount_due,
      'interest_type', v_current_interest_type,
      'interest_rate', v_current_interest_rate,
      'interest_rate_unit', v_current_interest_rate_unit,
      'installment_count', v_current_installment_count,
      'first_due_date', (
        select min(di.due_date)
        from public.debt_installments di
        where di.debt_id = p_debt_id
      ),
      'final_due_date', (
        select max(di.due_date)
        from public.debt_installments di
        where di.debt_id = p_debt_id
      ),
      'account_id', v_current_account_id,
      'origination_transaction_id', v_current_origination_transaction_id
    );
  end if;

  -- unpaid debt but payment rows somehow exist => inconsistent ledger
  select exists (
    select 1
    from public.debt_payments dp
    where dp.debt_id = p_debt_id
  )
  into v_has_payment_rows;

  if v_has_payment_rows then
    raise exception 'Debt unpaid summary inconsistent: payment rows exist. Please repair ledger first';
  end if;

  -- reverse old origination if needed
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

  -- validate / lock new account
  if v_new_account_id is not null then
    if v_new_amount > 2147483647 then
      raise exception 'Amount exceeds transactions.amount integer limit; migrate transactions.amount to bigint first';
    end if;

    v_new_tx_amount := v_new_amount::integer;

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

  -- remove old origination transaction safely
  if v_current_origination_transaction_id is not null then
    update public.debts
    set origination_transaction_id = null
    where id = p_debt_id;

    delete from public.transactions
    where id = v_current_origination_transaction_id
      and user_id = v_user_id;
  end if;

  -- restore old account balance if account changed or removed
  if v_current_account_id is not null then
    if v_new_account_id is null or v_new_account_id <> v_current_account_id then
      update public.accounts
      set balance = v_old_reverted_balance
      where id = v_current_account_id;
    end if;
  end if;

  -- clear old installments / allocations (safe because unpaid)
  delete from public.debt_payment_allocations
  where debt_id = p_debt_id;

  delete from public.debt_installments
  where debt_id = p_debt_id;

  -- regenerate schedule with hybrid rate
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
        v_interest_due := case
          when v_monthly_rate = 0 then 0
          else greatest(v_annuity_payment - v_principal_due, 0)
        end;
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

  -- apply new account origination
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
      v_effective_disbursed_at
    )
    returning id into v_new_tx_id;
  end if;

  -- update debt header final
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
    due_date = v_new_due_date,
    status = 'aktif',
    interest_rate = v_new_interest_rate,
    interest_type = v_new_interest_type,
    interest_rate_unit = v_new_interest_rate_unit,
    installment_count = v_new_installment_count,
    installment_amount = (
      select di.total_due
      from public.debt_installments di
      where di.debt_id = p_debt_id
      order by di.period_no asc
      limit 1
    ),
    start_date = v_new_start_date,
    disbursed_at = v_effective_disbursed_at,
    settled_at = null,
    origination_transaction_id = v_new_tx_id,
    updated_at = v_now
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
    'final_due_date', v_final_due_date,
    'origination_transaction_id', v_new_tx_id,
    'account_id', v_new_account_id,
    'account_balance', case when v_new_account_id is not null then v_new_next_balance else null end
  );
end;
$function$;


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
set search_path to 'public'
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_effective_paid_at timestamptz := coalesce(p_paid_at, now());

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
  v_note_clean text;

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
  -- auth & ownership
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  -- validate amount
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;
  v_remaining_payment := v_amount;
  v_note_clean := nullif(btrim(coalesce(p_note, '')), '');

  -- lock debt header
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

  -- lock account if payment should mutate account
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

  -- create payment header first
  -- provisional split to satisfy check constraint:
  -- amount = principal_amount + interest_amount
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
    v_note_clean,
    v_effective_paid_at,
    null
  )
  returning id into v_payment_id;

  -- allocate payment to installments (oldest first, interest first)
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
          when v_installment_status = 'lunas' then coalesce(paid_at, v_effective_paid_at)
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

  -- fallback allocation for legacy debts / rounding remainder
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

  -- update debt header summary
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
      when v_new_status = 'lunas' then coalesce(settled_at, v_effective_paid_at)
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

  -- mutate account & insert aggregated account transaction
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
        v_note_clean,
        case
          when v_debt_type = 'piutang' then
            'Terima pembayaran piutang - ' || v_contact_name
          else
            'Bayar hutang - ' || v_contact_name
        end
      )
      || ' | pokok: ' || v_payment_principal::text
      || ' | bunga: ' || v_payment_interest::text,
      v_effective_paid_at
    )
    returning id into v_tx_id;

    update public.debt_payments
    set account_transaction_id = v_tx_id
    where id = v_payment_id;
  end if;

  -- update payment split fields
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
$function$;
