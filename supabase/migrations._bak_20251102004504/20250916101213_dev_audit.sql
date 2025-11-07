create table if not exists public.dev_audit(
  id bigserial primary key,
  ts timestamptz default now(),
  actor text,              -- e.g., "custom_gpt"
  endpoint text,           -- e.g., "/search_cards"
  payload jsonb,
  note text
);
