begin;

alter table public.debts
  add column if not exists interest_rate_unit text;

-- Backfill berdasarkan rule hybrid sekarang:
-- flat     => monthly
-- efektif  => annual
update public.debts
set interest_rate_unit = case
  when interest_type = 'flat' then 'monthly'
  when interest_type = 'efektif' then 'annual'
  else coalesce(interest_rate_unit, 'annual')
end
where interest_rate_unit is null;

alter table public.debts
  alter column interest_rate_unit set default 'annual';

update public.debts
set interest_rate_unit = coalesce(interest_rate_unit, 'annual');

alter table public.debts
  alter column interest_rate_unit set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'debts_interest_rate_unit_check'
  ) then
    alter table public.debts
      add constraint debts_interest_rate_unit_check
      check (interest_rate_unit in ('monthly', 'annual'));
  end if;
end $$;

comment on column public.debts.interest_rate_unit is
  'Unit bunga debt: monthly untuk flat bulanan, annual untuk efektif/anuitas tahunan.';

create index if not exists debts_interest_rate_unit_idx
  on public.debts(interest_rate_unit);

commit;