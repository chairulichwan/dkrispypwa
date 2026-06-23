-- Archive debt enhancement
-- Adds archived_at to debts and RPC archive_debt_record

alter table if exists public.debts
  add column if not exists archived_at timestamptz null;

create index if not exists debts_user_archived_at_idx
  on public.debts (user_id, archived_at);

create or replace function public.archive_debt_record(
  p_user_id uuid,
  p_debt_id uuid,
  p_archive boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_archived_at timestamptz;
begin
  if v_auth_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'User mismatch';
  end if;

  v_user_id := coalesce(p_user_id, v_auth_user_id);

  update public.debts
  set
    archived_at = case when p_archive then now() else null end,
    updated_at = now()
  where id = p_debt_id
    and user_id = v_user_id
  returning archived_at into v_archived_at;

  if not found then
    raise exception 'Debt not found';
  end if;

  return jsonb_build_object(
    'success', true,
    'debt_id', p_debt_id,
    'archived_at', v_archived_at
  );
end;
$function$;
