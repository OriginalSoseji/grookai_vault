alter table public.card_prints
  add column if not exists image_path text null;

comment on column public.card_prints.image_path is
  'Durable storage path for identity-backed canon images. Signed URLs are resolved at read time and must not be stored here.';
