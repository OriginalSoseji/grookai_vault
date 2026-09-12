-- Confirmed-only public read projection. No existing association is promoted.
-- Confirmation writes remain outside app-facing roles and this schema-only migration.
begin;
create table if not exists public.card_cameo_confirmations_v1 (
  cameo_id uuid primary key references public.card_print_cameos(id),
  source_row_hash text not null check (source_row_hash ~ '^[a-f0-9]{64}$'),
  reviewed_image_path text not null check (length(reviewed_image_path)>0),
  decision_artifact_sha256 text not null check (decision_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  appearance_role text not null check (appearance_role in ('scene_subject','depicted_subject','character_representation')),
  host_description text,
  display_note text not null check (length(display_note) between 1 and 200),
  active boolean not null default false,
  check (appearance_role='scene_subject' or (host_description is not null and length(btrim(host_description))>0))
);
alter table public.card_cameo_confirmations_v1 enable row level security;
revoke all on public.card_cameo_confirmations_v1 from public,anon,authenticated,service_role;
grant select on public.card_cameo_confirmations_v1 to service_role;

create or replace function public.get_public_card_cameos_v2(p_gv_id text default null,p_pokemon_ndex text default null,p_offset integer default 0)
returns table(gv_id text,card_name text,set_code text,set_name text,number text,
  cameo_subject_type text,cameo_subject_name text,pokemon_ndex text,notes_raw text,cameo_qualifiers text[],source_name text,appearance_role text)
language sql stable security definer set search_path=pg_catalog,public
as $$
  select cp.gv_id,cp.name,cp.set_code,s.name,cp.number,c.cameo_subject_type,c.cameo_subject_name,c.pokemon_ndex,
    a.display_note,array[a.appearance_role],c.source_name,a.appearance_role
  from public.card_cameo_confirmations_v1 a
  join public.card_print_cameos c on c.id=a.cameo_id and c.source_row_hash=a.source_row_hash
  join public.card_prints cp on cp.id=c.card_print_id and cp.image_path=a.reviewed_image_path
  join public.sets s on s.id=cp.set_id
  left join public.catalog_set_release_controls sc on sc.set_id=s.id
  where a.active and c.active and c.match_status='APPROVED_MATCH'
    and cp.gv_id is not null
    and ((p_gv_id is not null and p_pokemon_ndex is null and length(p_gv_id)<=100 and cp.gv_id=p_gv_id)
      or (p_gv_id is null and p_pokemon_ndex ~ '^[0-9]{1,5}$' and c.cameo_subject_type='pokemon' and c.pokemon_ndex=p_pokemon_ndex))
    and p_offset between 0 and 1000
    and coalesce(cp.data_quality_flags #>> '{app_visibility_v1,status}','visible')<>'suppressed'
    and (sc.set_id is null or sc.release_status='public')
    and not exists(select 1 from public.catalog_game_release_controls gc
      where lower(gc.game_code)=lower(s.game) and gc.release_status<>'public')
    and (lower(s.game)='pokemon' or exists(select 1 from public.catalog_game_release_controls gc
      where lower(gc.game_code)=lower(s.game) and gc.release_status='public'))
  order by s.name,cp.number,cp.gv_id,c.cameo_subject_type,c.cameo_subject_name,c.id
  limit 100 offset greatest(0,least(coalesce(p_offset,0),1000));
$$;
revoke all on function public.get_public_card_cameos_v2(text,text,integer) from public;
grant execute on function public.get_public_card_cameos_v2(text,text,integer) to anon,authenticated,service_role;
commit;
