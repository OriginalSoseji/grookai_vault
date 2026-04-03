alter table public.sets
add column if not exists identity_domain_default text;

comment on column public.sets.identity_domain_default
is 'Declared default identity domain for the set-level legacy baseline and later proof-based domain governance.';

alter table public.card_prints
add column if not exists identity_domain text;

comment on column public.card_prints.identity_domain
is 'Materialized identity domain for the parent card_print row. Legacy rows use the founder-declared baseline; future rows must follow proof-based classification.';

create index if not exists idx_card_prints_identity_domain
on public.card_prints(identity_domain);
