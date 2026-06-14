-- ============================================================
-- Final SQL: Atomic financial RPCs for current schema
-- Date: 2026-06-06
--
-- Current confirmed schema:
-- - accounts.id uuid
-- - accounts.user_id uuid
-- - accounts.balance bigint
-- - debts.id uuid
-- - debts.user_id uuid
-- - debts.amount bigint
-- - debts.paid_amount bigint
-- - debt_payments.amount bigint
-- - transactions.id uuid
-- - transactions.user_id uuid
-- - transactions.amount integer   <-- important limitation
-- - transactions.created_at timestamp without time zone
--
-- Design choice in this SQL:
-- - RPC signatures use NUMERIC to keep PostgREST resolution simple
-- - amounts are internally normalized to BIGINT for account/debt math
-- - inserts into transactions.amount are guarded so they cannot overflow integer
--
-- If you later migrate public.transactions.amount to bigint,
-- you can remove the integer-overflow guards and switch signatures if desired.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Remove all old overloads first
-- ------------------------------------------------------------
drop function if exists public.perform_transfer(text, text, text, numeric, text, timestamptz);
drop function if exists public.perform_transfer(uuid, uuid, uuid, numeric, text, timestamptz);
drop function if exists public.perform_transfer(uuid, uuid, uuid, bigint, text, timestamptz);

drop function if exists public.record_account_transaction(text, text, text, numeric, text, text, timestamptz);
drop function if exists public.record_account_transaction(uuid, uuid, text, numeric, text, text, timestamptz);
drop function if exists public.record_account_transaction(uuid, uuid, text, bigint, text, text, timestamptz);

drop function if exists public.record_debt_payment(text, text, numeric, text, text, timestamptz, boolean);
drop function if exists public.record_debt_payment(uuid, uuid, numeric, uuid, text, timestamptz, boolean);
drop function if exists public.record_debt_payment(uuid, uuid, bigint, uuid, text, timestamptz, boolean);

-- ============================================================
-- 1. perform_transfer
-- ============================================================
create or replace function public.perform_transfer(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
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
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_amount bigint;
  v_tx_amount integer;
  v_from_balance bigint;
  v_to_balance bigint;
  v_from_name text;
  v_to_name text;
  v_note_out text;
  v_note_in text;
  v_tx_out_id uuid;
  v_tx_in_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  if p_from_account_id is null or p_to_account_id is null then
    raise exception 'Account id is required';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Source and destination account cannot be the same';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;

  if v_amount > 2147483647 then
    raise exception 'Amount exceeds transactions.amount integer limit; migrate transactions.amount to bigint first';
  end if;

  v_tx_amount := v_amount::integer;

  select balance, name
    into v_from_balance, v_from_name
  from public.accounts
  where id = p_from_account_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Source account not found';
  end if;

  v_from_balance := coalesce(v_from_balance, 0);

  if v_from_balance < v_amount then
    raise exception 'Insufficient balance';
  end if;

  select balance, name
    into v_to_balance, v_to_name
  from public.accounts
  where id = p_to_account_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Destination account not found';
  end if;

  v_to_balance := coalesce(v_to_balance, 0);

  update public.accounts
  set balance = v_from_balance - v_amount,
      updated_at = now()
  where id = p_from_account_id;

  update public.accounts
  set balance = v_to_balance + v_amount,
      updated_at = now()
  where id = p_to_account_id;

  v_note_out := coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Transfer ke ' || v_to_name);
  v_note_in := coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Transfer dari ' || v_from_name);

  insert into public.transactions (
    user_id,
    account_id,
    counterparty_account_id,
    type,
    amount,
    category,
    note,
    created_at
  ) values (
    v_user_id,
    p_from_account_id,
    p_to_account_id,
    'transfer_out',
    v_tx_amount,
    'Transfer',
    v_note_out,
    timezone('UTC', p_created_at)
  )
  returning id into v_tx_out_id;

  insert into public.transactions (
    user_id,
    account_id,
    counterparty_account_id,
    type,
    amount,
    category,
    note,
    created_at
  ) values (
    v_user_id,
    p_to_account_id,
    p_from_account_id,
    'transfer_in',
    v_tx_amount,
    'Transfer',
    v_note_in,
    timezone('UTC', p_created_at + interval '1 millisecond')
  )
  returning id into v_tx_in_id;

  return jsonb_build_object(
    'success', true,
    'from_balance', v_from_balance - v_amount,
    'to_balance', v_to_balance + v_amount,
    'transfer_out_id', v_tx_out_id,
    'transfer_in_id', v_tx_in_id
  );
end;
$$;

revoke all on function public.perform_transfer(uuid, uuid, uuid, numeric, text, timestamptz) from public;
grant execute on function public.perform_transfer(uuid, uuid, uuid, numeric, text, timestamptz) to authenticated;
grant execute on function public.perform_transfer(uuid, uuid, uuid, numeric, text, timestamptz) to service_role;

comment on function public.perform_transfer(uuid, uuid, uuid, numeric, text, timestamptz)
  is 'Atomic account-to-account transfer with balance locking and mirrored transactions.';

-- ============================================================
-- 2. record_account_transaction
-- ============================================================
create or replace function public.record_account_transaction(
  p_user_id uuid,
  p_account_id uuid,
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
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_amount bigint;
  v_tx_amount integer;
  v_balance bigint;
  v_new_balance bigint;
  v_tx_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  if p_type not in ('income', 'expense') then
    raise exception 'Invalid transaction type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;

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
    raise exception 'Account not found';
  end if;

  v_balance := coalesce(v_balance, 0);

  if p_type = 'expense' and v_balance < v_amount then
    raise exception 'Insufficient balance';
  end if;

  v_new_balance := case
    when p_type = 'income' then v_balance + v_amount
    else v_balance - v_amount
  end;

  update public.accounts
  set balance = v_new_balance,
      updated_at = now()
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
    p_type,
    v_tx_amount,
    p_category,
    nullif(btrim(coalesce(p_note, '')), ''),
    timezone('UTC', p_created_at)
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance
  );
end;
$$;

revoke all on function public.record_account_transaction(uuid, uuid, text, numeric, text, text, timestamptz) from public;
grant execute on function public.record_account_transaction(uuid, uuid, text, numeric, text, text, timestamptz) to authenticated;
grant execute on function public.record_account_transaction(uuid, uuid, text, numeric, text, text, timestamptz) to service_role;

comment on function public.record_account_transaction(uuid, uuid, text, numeric, text, text, timestamptz)
  is 'Atomic income/expense transaction recorder with account balance locking.';

-- ============================================================
-- 3. record_debt_payment
-- ============================================================
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
  v_debt_amount bigint;
  v_paid_amount bigint;
  v_new_paid_amount bigint;
  v_remaining bigint;
  v_status text;
  v_contact_name text;
  v_payment_id uuid;
  v_tx_id uuid;
  v_balance bigint;
  v_new_balance bigint;
begin
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;

  select d.type, d.amount, d.paid_amount, c.name
    into v_debt_type, v_debt_amount, v_paid_amount, v_contact_name
  from public.debts d
  join public.contacts c on c.id = d.contact_id
  where d.id = p_debt_id
    and d.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  v_paid_amount := coalesce(v_paid_amount, 0);
  v_remaining := greatest(v_debt_amount - v_paid_amount, 0);

  if v_amount > v_remaining then
    raise exception 'Payment exceeds remaining debt amount';
  end if;

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
  end if;

  insert into public.debt_payments (
    debt_id,
    user_id,
    amount,
    note,
    paid_at
  ) values (
    p_debt_id,
    v_user_id,
    v_amount,
    nullif(btrim(coalesce(p_note, '')), ''),
    p_paid_at
  )
  returning id into v_payment_id;

  v_new_paid_amount := v_paid_amount + v_amount;
  v_status := case when v_new_paid_amount >= v_debt_amount then 'lunas' else 'aktif' end;

  update public.debts
  set paid_amount = v_new_paid_amount,
      status = v_status,
      updated_at = now()
  where id = p_debt_id;

  if p_create_account_tx and p_account_id is not null then
    v_new_balance := case
      when v_debt_type = 'piutang' then v_balance + v_amount
      else v_balance - v_amount
    end;

    update public.accounts
    set balance = v_new_balance,
        updated_at = now()
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
      case when v_debt_type = 'piutang' then 'Piutang' else 'Hutang' end,
      case
        when v_debt_type = 'piutang' then 'Bayar piutang - ' || v_contact_name
        else 'Bayar hutang - ' || v_contact_name
      end,
      timezone('UTC', p_paid_at)
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

revoke all on function public.record_debt_payment(uuid, uuid, numeric, uuid, text, timestamptz, boolean) from public;
grant execute on function public.record_debt_payment(uuid, uuid, numeric, uuid, text, timestamptz, boolean) to authenticated;
grant execute on function public.record_debt_payment(uuid, uuid, numeric, uuid, text, timestamptz, boolean) to service_role;

comment on function public.record_debt_payment(uuid, uuid, numeric, uuid, text, timestamptz, boolean)
  is 'Atomic debt payment recorder with optional linked account mutation and transaction row.';

commit;
