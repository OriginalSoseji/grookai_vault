-- Adds qty to vault_items, server-side increment function, and a richer v_vault_items
-- plus v_recently_added. Definitions are resilient to missing upstream tables.

-- 1) qty column on vault_items
alter table public.vault_items
  add column if not exists qty integer not null default 1;

-- 2) Server-side increment function (by item id)
create or replace function public.vault_inc_qty(p_item_id uuid, p_inc integer)
returns integer
language plpgsql
security definer
as $$
declare v_new integer;
begin
  update public.vault_items
    set qty = greatest(0, qty + coalesce(p_inc, 0))
  where id = p_item_id
  returning qty into v_new;
  return v_new;
end $$;
grant execute on function public.vault_inc_qty(uuid, integer) to authenticated;

-- 3) Rich v_vault_items view and v_recently_added
do $$
begin
  -- Drop if exists to avoid conflicts
  if exists (select 1 from pg_views where schemaname='public' and viewname='v_recently_added') then
    execute 'drop view public.v_recently_added';
  end if;
  if exists (select 1 from pg_views where schemaname='public' and viewname='v_vault_items') then
    execute 'drop view public.v_vault_items';
  end if;

  -- Determine availability of card prints and best prices
  if exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('v','m') and c.relname='v_card_prints') then
    if exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('v','m') and c.relname='v_best_prices_all') then
      -- Use v_card_prints + v_best_prices_all
      execute $$
        create view public.v_vault_items as
        select
          vi.id,
          vi.user_id,
          (vcp.id)::uuid as card_id,
          vi.qty,
          vi.created_at,
          vcp.name as name,
          vcp.number as number,
          vcp.set_code as set_code,
          vcp.variant_key as variant,
          vcp.tcgplayer_id as tcgplayer_id,
          null::text as game,
          coalesce(vcp.image_url, vcp.image_best) as image_url,
          coalesce(
            case when vi.is_graded and vbp.grad_market is not null then vbp.grad_market end,
            case when vi.condition_label is not null and vbp.cond_market is not null then vbp.cond_market end,
            vbp.base_market
          ) as market_price,
          coalesce(
            case when vi.is_graded and vbp.grad_source is not null then vbp.grad_source end,
            case when vi.condition_label is not null and vbp.cond_source is not null then vbp.cond_source end,
            vbp.base_source
          ) as price_source,
          coalesce(
            case when vi.is_graded and vbp.grad_ts is not null then vbp.grad_ts end,
            case when vi.condition_label is not null and vbp.cond_ts is not null then vbp.cond_ts end,
            vbp.base_ts
          ) as price_ts,
          (greatest(1, vi.qty)::numeric * coalesce(
            case when vi.is_graded and vbp.grad_market is not null then vbp.grad_market end,
            case when vi.condition_label is not null and vbp.cond_market is not null then vbp.cond_market end,
            vbp.base_market
          )) as total
        from public.vault_items vi
        left join public.v_card_prints vcp
          on (vcp.id::text = vi.card_id)
        left join public.v_best_prices_all vbp
          on (vbp.card_id::text = vi.card_id)
      $$;
    else
      -- Use v_card_prints only (no prices available)
      execute $$
        create view public.v_vault_items as
        select
          vi.id,
          vi.user_id,
          (vcp.id)::uuid as card_id,
          vi.qty,
          vi.created_at,
          vcp.name as name,
          vcp.number as number,
          vcp.set_code as set_code,
          vcp.variant_key as variant,
          vcp.tcgplayer_id as tcgplayer_id,
          null::text as game,
          coalesce(vcp.image_url, vcp.image_best) as image_url,
          null::numeric as market_price,
          null::text as price_source,
          null::timestamptz as price_ts,
          null::numeric as total
        from public.vault_items vi
        left join public.v_card_prints vcp
          on (vcp.id::text = vi.card_id)
      $$;
    end if;
  elsif exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r' and c.relname='card_prints') then
    if exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('v','m') and c.relname='v_best_prices_all') then
      -- Use card_prints + v_best_prices_all
      execute $$
        create view public.v_vault_items as
        select
          vi.id,
          vi.user_id,
          (cp.id)::uuid as card_id,
          vi.qty,
          vi.created_at,
          cp.name as name,
          cp.number as number,
          cp.set_code as set_code,
          cp.variant_key as variant,
          cp.tcgplayer_id as tcgplayer_id,
          null::text as game,
          coalesce(cp.image_url, cp.image_alt_url) as image_url,
          coalesce(
            case when vi.is_graded and vbp.grad_market is not null then vbp.grad_market end,
            case when vi.condition_label is not null and vbp.cond_market is not null then vbp.cond_market end,
            vbp.base_market
          ) as market_price,
          coalesce(
            case when vi.is_graded and vbp.grad_source is not null then vbp.grad_source end,
            case when vi.condition_label is not null and vbp.cond_source is not null then vbp.cond_source end,
            vbp.base_source
          ) as price_source,
          coalesce(
            case when vi.is_graded and vbp.grad_ts is not null then vbp.grad_ts end,
            case when vi.condition_label is not null and vbp.cond_ts is not null then vbp.cond_ts end,
            vbp.base_ts
          ) as price_ts,
          (greatest(1, vi.qty)::numeric * coalesce(
            case when vi.is_graded and vbp.grad_market is not null then vbp.grad_market end,
            case when vi.condition_label is not null and vbp.cond_market is not null then vbp.cond_market end,
            vbp.base_market
          )) as total
        from public.vault_items vi
        left join public.card_prints cp
          on (cp.id::text = vi.card_id)
        left join public.v_best_prices_all vbp
          on (vbp.card_id::text = vi.card_id)
      $$;
    else
      -- Use card_prints only (no prices available)
      execute $$
        create view public.v_vault_items as
        select
          vi.id,
          vi.user_id,
          (cp.id)::uuid as card_id,
          vi.qty,
          vi.created_at,
          cp.name as name,
          cp.number as number,
          cp.set_code as set_code,
          cp.variant_key as variant,
          cp.tcgplayer_id as tcgplayer_id,
          null::text as game,
          coalesce(cp.image_url, cp.image_alt_url) as image_url,
          null::numeric as market_price,
          null::text as price_source,
          null::timestamptz as price_ts,
          null::numeric as total
        from public.vault_items vi
        left join public.card_prints cp
          on (cp.id::text = vi.card_id)
      $$;
    end if;
  else
    -- Fallback: minimal view from vault_items only
    execute $$
      create view public.v_vault_items as
      select
        vi.id,
        vi.user_id,
        null::uuid as card_id,
        vi.qty,
        vi.created_at,
        null::text as name,
        null::text as number,
        null::text as set_code,
        null::text as variant,
        null::text as tcgplayer_id,
        null::text as game,
        null::text as image_url,
        null::numeric as market_price,
        null::text as price_source,
        null::timestamptz as price_ts,
        null::numeric as total
      from public.vault_items vi
    $$;
  end if;

  -- Recently added (top N)
  execute 'create or replace view public.v_recently_added as
           select * from public.v_vault_items order by created_at desc limit 100';
end
$$;

