begin;

-- CEL25C print_identity_key set-code alignment repair.
--
-- Purpose:
-- - keep the cel25c multi-origin repair scoped to the canonical Classic Collection
--   set code even though existing row-level set_code values are currently cel25 or null
-- - normalize print_identity_key for cel25c rows to the canonical set code literal
--   cel25c without mutating other sets
--
-- Scope:
-- - public.card_prints.print_identity_key
-- - set_id = 3be64773-d30e-48af-af8c-3563b57e5e4a only

do $$
begin
  if exists (
    select 1
    from public.sets s
    where s.id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
      and s.code = 'cel25c'
  ) then
    with projected as (
      select
        cp.id,
        lower(
          concat_ws(
            ':',
            'cel25c',
            cp.number_plain,
            lower(
              regexp_replace(
                trim(
                  both '-' from regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
                            'δ', ' delta ', 'g'
                          ),
                          '[★*]', ' star ', 'g'
                        ),
                        '\s+EX\b', '-ex', 'gi'
                      ),
                      '\s+GX\b', '-gx', 'gi'
                    ),
                    '[^a-zA-Z0-9]+',
                    '-',
                    'g'
                  )
                ),
                '-+',
                '-',
                'g'
              )
            ),
            nullif(lower(coalesce(cp.printed_identity_modifier, '')), '')
          )
        ) as next_print_identity_key
      from public.card_prints cp
      where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
    )
    update public.card_prints cp
    set print_identity_key = p.next_print_identity_key
    from projected p
    where cp.id = p.id
      and cp.print_identity_key is distinct from p.next_print_identity_key;
  else
    raise notice 'cel25c canonical set row not present; print_identity_key alignment skipped';
  end if;
end $$;

commit;
