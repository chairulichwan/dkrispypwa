-- Create debt record RPC
-- Preferred behavior:
-- - create debt row
-- - if account is selected:
--   - piutang => reduce account balance + expense transaction
--   - hutang  => increase account balance + income transaction
-- - all in one DB transaction

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
  v_amount bigint;
  v_tx_amount integer;
  v_contact_name text;
  v_debt_id uuid;
  v_tx_id uuid;
  v_status text := 'aktif';
  v_balance bigint := 0;
  v_next_balance bigint := 0;
begin
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  if p_type not in ('hutang', 'piutang') then
    raise exception 'Invalid debt type';
  end if;

  if p_interest_type not in ('flat', 'efektif') then
    raise exception 'Invalid interest type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'Amount must be a whole number';
  end if;

  v_amount := p_amount::bigint;

  select name
    into v_contact_name
  from public.contacts
  where id = p_contact_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  if p_account_id is not null then
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

    if p_type = 'piutang' and v_balance < v_amount then
      raise exception 'Insufficient balance';
    end if;

    v_next_balance := case
      when p_type = 'piutang' then v_balance - v_amount
      else v_balance + v_amount
    end;
  end if;

  insert into public.debts (
    user_id,
    contact_id,
    account_id,
    type,
    amount,
    paid_amount,
    description,
    due_date,
    status,
    interest_rate,
    interest_type,
    installment_count,
    installment_amount,
    start_date
  ) values (
    v_user_id,
    p_contact_id,
    p_account_id,
    p_type,
    v_amount,
    0,
    nullif(btrim(coalesce(p_description, '')), ''),
    p_due_date,
    v_status,
    coalesce(p_interest_rate, 0),
    p_interest_type,
    greatest(coalesce(p_installment_count, 1), 1),
    greatest(coalesce(p_installment_amount, 0), 0)::bigint,
    p_start_date
  )
  returning id into v_debt_id;

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
      case when p_type = 'piutang' then 'expense' else 'income' end,
      v_tx_amount,
      case when p_type = 'piutang' then 'Piutang' else 'Hutang' end,
      coalesce(
        nullif(btrim(coalesce(p_description, '')), ''),
        case
          when p_type = 'piutang' then 'Beri piutang - ' || v_contact_name
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
    'account_transaction_id', v_tx_id,
    'account_balance', case when p_account_id is not null then v_next_balance else null end
  );
end;
$$;

revoke all on function public.create_debt_record(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  text,
  date,
  numeric,
  text,
  integer,
  numeric,
  date,
  timestamptz
) from public;

grant execute on function public.create_debt_record(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  text,
  date,
  numeric,
  text,
  integer,
  numeric,
  date,
  timestamptz
) to authenticated;

grant execute on function public.create_debt_record(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  text,
  date,
  numeric,
  text,
  integer,
  numeric,
  date,
  timestamptz
) to service_role;
