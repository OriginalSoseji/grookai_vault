-- Guard against duplicate 'sv' codes like 'sv6' vs 'sv06'
-- Normalizes any leading 'sv0<digit>' to 'sv<digit>' for uniqueness
-- Example: 'sv06', 'sv06.5' -> normalized 'sv6', 'sv6.5'

create unique index if not exists uq_sets_code_norm
on public.sets ((regexp_replace(code, '^sv0([0-9].*)$', 'sv\1')));

