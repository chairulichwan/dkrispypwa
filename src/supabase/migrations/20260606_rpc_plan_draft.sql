-- Draft RPC migration plan
-- Not applied automatically. Review against the real schema before use.

-- ============================================================
-- 1. perform_transfer
-- ============================================================
create or replace function public.perform_transfer(
  p_user_id text,
  p_from_account_id text,
  p_to_account_id text,
  p_amount numeric,
  p_note text default null,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_balance numeric;
  v_to_balance numeric;
  v_from_name text;
  v_to_name text;
  v_tx_out_id text;
  v_tx_in_id text;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_from_account_id is null or p_to_account_id is null then
    raise exception 'Account id is required';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Source and destination account cannot be the same';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  -- Lock source account
  select balance, name
    into v_from_balance, v_from_name
  from accounts
  where id = p_from_account_id
    and user_id = p_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Source account not found';
  end if;

  v_from_balance := coalesce(v_from_balance, 0);

  if v_from_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  -- Lock destination account
  select balance, name
    into v_to_balance, v_to_name
  from accounts
  where id = p_to_account_id
    and user_id = p_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Destination account not found';
  end if;

  v_to_balance := coalesce(v_to_balance, 0);

  update accounts
  set balance = v_from_balance - p_amount,
      updated_at = now()
  where id = p_from_account_id;

  update accounts
  set balance = v_to_balance + p_amount,
      updated_at = now()
  where id = p_to_account_id;

  insert into transactions (
    user_id,
    account_id,
    counterparty_account_id,
    type,
    amount,
    category,
    note,
    created_at
  ) values (
    p_user_id,
    p_from_account_id,
    p_to_account_id,
    'transfer_out',
    p_amount,
    'Transfer',
    coalesce(nullif(trim(p_note), ''), 'Transfer ke ' || v_to_name),
    p_created_at
  )
  returning id into v_tx_out_id;

  insert into transactions (
    user_id,
    account_id,
    counterparty_account_id,
    type,
    amount,
    category,
    note,
    created_at
  ) values (
    p_user_id,
    p_to_account_id,
    p_from_account_id,
    'transfer_in',
    p_amount,
    'Transfer',
    coalesce(nullif(trim(p_note), ''), 'Transfer dari ' || v_from_name),
    p_created_at + interval '1 millisecond'
  )
  returning id into v_tx_in_id;

  return jsonb_build_object(
    'success', true,
    'from_balance', v_from_balance - p_amount,
    'to_balance', v_to_balance + p_amount,
    'transfer_out_id', v_tx_out_id,
    'transfer_in_id', v_tx_in_id
  );
end;
$$;

-- grant execute on function public.perform_transfer(text, text, text, numeric, text, timestamptz) to authenticated;

-- ============================================================
-- 2. record_account_transaction
-- ============================================================
create or replace function public.record_account_transaction(
  p_user_id text,
  p_account_id text,
  p_type text,
  p_amount numeric,
  p_category text default null,
  p_note text default null,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
  v_tx_id text;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_type not in ('income', 'expense') then
    raise exception 'Invalid transaction type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select balance
    into v_balance
  from accounts
  where id = p_account_id
    and user_id = p_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  v_balance := coalesce(v_balance, 0);

  if p_type = 'expense' and v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  v_new_balance := case
    when p_type = 'income' then v_balance + p_amount
    else v_balance - p_amount
  end;

  update accounts
  set balance = v_new_balance,
      updated_at = now()
  where id = p_account_id;

  insert into transactions (
    user_id,
    account_id,
    type,
    amount,
    category,
    note,
    created_at
  ) values (
    p_user_id,
    p_account_id,
    p_type,
    p_amount,
    p_category,
    nullif(trim(p_note), ''),
    p_created_at
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance
  );
end;
$$;

-- grant execute on function public.record_account_transaction(text, text, text, numeric, text, text, timestamptz) to authenticated;

-- ============================================================
-- 3. record_debt_payment
-- ============================================================
create or replace function public.record_debt_payment(
  p_user_id text,
  p_debt_id text,
  p_amount numeric,
  p_account_id text default null,
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
  v_debt_type text;
  v_debt_amount numeric;
  v_paid_amount numeric;
  v_new_paid_amount numeric;
  v_status text;
  v_contact_name text;
  v_payment_id text;
  v_tx_id text;
  v_balance numeric;
  v_new_balance numeric;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select d.type, d.amount, d.paid_amount, c.name
    into v_debt_type, v_debt_amount, v_paid_amount, v_contact_name
  from debts d
  join contacts c on c.id = d.contact_id
  where d.id = p_debt_id
    and d.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  v_paid_amount := coalesce(v_paid_amount, 0);
  v_new_paid_amount := v_paid_amount + p_amount;
  v_status := case when v_new_paid_amount >= v_debt_amount then 'lunas' else 'aktif' end;

  insert into debt_payments (
    debt_id,
    user_id,
    amount,
    note,
    paid_at
  ) values (
    p_debt_id,
    p_user_id,
    p_amount,
    nullif(trim(p_note), ''),
    p_paid_at
  )
  returning id into v_payment_id;

  update debts
  set paid_amount = v_new_paid_amount,
      status = v_status,
      updated_at = now()
  where id = p_debt_id;

  if p_create_account_tx and p_account_id is not null then
    select balance
      into v_balance
    from accounts
    where id = p_account_id
      and user_id = p_user_id
      and deleted_at is null
    for update;

    if not found then
      raise exception 'Payment account not found';
    end if;

    v_balance := coalesce(v_balance, 0);

    if v_debt_type = 'hutang' and v_balance < p_amount then
      raise exception 'Insufficient balance';
    end if;

    v_new_balance := case
      when v_debt_type = 'piutang' then v_balance + p_amount
      else v_balance - p_amount
    end;

    update accounts
    set balance = v_new_balance,
        updated_at = now()
    where id = p_account_id;

    insert into transactions (
      user_id,
      account_id,
      type,
      amount,
      category,
      note,
      created_at
    ) values (
      p_user_id,
      p_account_id,
      case when v_debt_type = 'piutang' then 'income' else 'expense' end,
      p_amount,
      case when v_debt_type = 'piutang' then 'Piutang' else 'Hutang' end,
      case
        when v_debt_type = 'piutang' then 'Bayar piutang - ' || v_contact_name
        else 'Bayar hutang - ' || v_contact_name
      end,
      p_paid_at
    )
    returning id into v_tx_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'debt_status', v_status,
    'debt_paid_amount', v_new_paid_amount,
    'account_transaction_id', v_tx_id
  );
end;
$$;

-- grant execute on function public.record_debt_payment(text, text, numeric, text, text, timestamptz, boolean) to authenticated;
