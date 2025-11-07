-- Index to keep set/language counts snappy
create index if not exists card_prints_set_lang_idx
  on public.card_prints(set_code)
  where lang = 'en';

