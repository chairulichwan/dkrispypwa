begin;

alter table public.debts
  add column if not exists origination_transaction_id uuid null references public.transactions(id);

comment on column public.debts.origination_transaction_id is
  'Transaction row created when debt principal is first disbursed/received via account. Needed for safe edit/reversal before any payment exists.';

create index if not exists debts_origination_transaction_id_idx
  on public.debts(origination_transaction_id);

commit;