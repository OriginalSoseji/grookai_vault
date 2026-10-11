-- Private, dated complete-owner observations. No backfill or rollout activation.
begin;

create table if not exists public.portfolio_history_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.portfolio_history_control(singleton) values(true) on conflict do nothing;
create table if not exists public.portfolio_history_owners (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  next_sequence bigint not null default 1 check(next_sequence>0)
);
create table if not exists public.portfolio_history_points (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  sequence bigint not null check(sequence>0),
  captured_day date not null,
  captured_at timestamptz not null,
  observation jsonb not null,
  evidence jsonb not null,
  summary jsonb not null,
  primary key(owner_id,id),
  unique(owner_id,sequence),
  unique(owner_id,captured_day),
  check(jsonb_typeof(observation)='object' and jsonb_typeof(evidence)='array' and jsonb_typeof(summary)='object'),
  check(octet_length(observation::text)+octet_length(evidence::text)<=33554432)
);
create table if not exists public.portfolio_history_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request jsonb not null check(jsonb_typeof(request)='object' and octet_length(request::text)<=1024),
  status text not null check(status in ('captured','reused','failed','cancelled')),
  point_id uuid,
  error_code text,
  internal_error text,
  created_at timestamptz not null default clock_timestamp(),
  primary key(owner_id,request_id),
  foreign key(owner_id,point_id) references public.portfolio_history_points(owner_id,id) on delete cascade,
  check((status in ('captured','reused') and point_id is not null and error_code is null)
    or (status='failed' and point_id is null and error_code is not null)
    or (status='cancelled' and point_id is null and error_code is null))
);
alter table public.portfolio_history_control enable row level security;
alter table public.portfolio_history_owners enable row level security;
alter table public.portfolio_history_points enable row level security;
alter table public.portfolio_history_requests enable row level security;
revoke all on public.portfolio_history_control,public.portfolio_history_owners,
  public.portfolio_history_points,public.portfolio_history_requests from public,anon,authenticated,service_role;

create or replace function public.portfolio_history_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Saved portfolio history is immutable' using errcode='42501'; end $$;
create or replace trigger portfolio_history_points_immutable before update on public.portfolio_history_points
  for each row execute function public.portfolio_history_immutable_v1();
create or replace trigger portfolio_history_requests_immutable before update on public.portfolio_history_requests
  for each row execute function public.portfolio_history_immutable_v1();

create or replace function public.portfolio_history_utc_v1(value timestamptz)
returns text language sql immutable set search_path='' as $$
  select to_char(value at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;
create or replace function public.portfolio_history_validate_request_v1(p jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare day_value date;
begin
  if not public.vendor_event_fields_valid_v1(p,array['version','requestId','day'])
    or p->'version' is distinct from '1'::jsonb or not public.vendor_event_uuid_valid_v1(p->'requestId')
    or jsonb_typeof(p->'day') is distinct from 'string' or coalesce(p->>'day','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or octet_length(p::text)>1024 then raise exception 'Invalid history request' using errcode='22023'; end if;
  begin day_value:=(p->>'day')::date;
  exception when others then raise exception 'Invalid history day' using errcode='22023'; end;
  if to_char(day_value,'YYYY-MM-DD')<>p->>'day' then raise exception 'Invalid history day' using errcode='22023'; end if;
end $$;

-- Internal exact-arithmetic projection, independently checked against the Node model.
create or replace function public.portfolio_history_summary_v1(p jsonb)
returns jsonb language sql immutable set search_path='' as $$
  with copies as materialized (
    select c,c->>'kind' kind,c->>'unpricedReason' reason,c->'reference'->>'currency' currency,
      (c->'reference'->>'amount')::numeric amount from jsonb_array_elements(p->'copies') c
  ), amounts as (select currency,sum(amount) amount from copies where amount is not null group by currency),
  kinds as (select kind,count(copies.kind) owned,count(amount) priced from unnest(array['raw','slab','sealed']) kind
    left join copies using(kind) group by kind),
  reasons as (select reason,count(*) n from copies where amount is null group by reason),
  currencies as (select currency,count(*) n from copies where amount is not null group by currency)
  select jsonb_build_object('snapshotId',p->'snapshotId','sequence',p->'sequence','capturedAt',p->'capturedAt',
    'state',case when count(*)=0 then 'empty' when count(amount)=0 then 'unpriced'
      when count(amount)=count(*) then 'priced' else 'partially_priced' end,
    'coverage',jsonb_build_object('owned',count(*),'priced',count(amount),'unpriced',count(*)-count(amount),
      'byKind',(select jsonb_object_agg(kind,jsonb_build_object('owned',owned,'priced',priced,'unpriced',owned-priced)) from kinds),
      'byReason',coalesce((select jsonb_object_agg(reason,n) from reasons),'{}'::jsonb),
      'byCurrency',coalesce((select jsonb_object_agg(currency,n) from currencies),'{}'::jsonb)),
    'totals',coalesce((select jsonb_object_agg(currency,jsonb_build_object('exact',trim_scale(amount)::text,'display',round(amount,2)::text)) from amounts),'{}'::jsonb))
  from copies;
$$;

-- One statement observes ownership and all governed pricing under one MVCC snapshot.
-- The bounded prefix is never saved when the independent complete count exceeds the ceiling.
create or replace function public.portfolio_history_observe_v1(actor uuid,point_id uuid,seq bigint)
returns jsonb language sql volatile security definer set search_path='' as $$
  with moment as materialized (select date_trunc('milliseconds',clock_timestamp()) captured_at),
  full_count as materialized (select count(*) n from public.vault_item_instances where user_id=actor and archived_at is null),
  owned as materialized (select i.* from public.vault_item_instances i where i.user_id=actor and i.archived_at is null order by i.id limit 20001),
  prices as materialized (
    select r.*,count(*) over(partition by r.card_printing_id) matches
    from public.get_market_pricing_read_model_v1(null,array(select distinct card_printing_id from owned
      where card_print_id is not null and card_printing_id is not null)) r
    where r.pricing_scope='card_printing'
  ), sealed as materialized (
    select e.*,count(*) over(partition by e.variant_id) matches from public.vault_sealed_current_evidence_v1 e
    where e.variant_id in (select sealed_product_variant_id from owned where sealed_product_variant_id is not null)
  ), evaluated as materialized (
    select i.*,moment.captured_at,
      case when i.sealed_product_variant_id is not null then 'sealed' when i.slab_cert_id is not null then 'slab' else 'raw' end kind,
      case
        when i.slab_cert_id is not null or i.is_graded then 'unsupported_slab'
        when i.sealed_product_variant_id is not null then
          case when i.seal_state<>'factory_sealed' then 'ineligible_seal_state'
            when i.package_condition<>'undamaged' then 'ineligible_package_condition'
            when s.matches>1 then 'invalid_reference'
            when s.market_price is null then 'no_qualified_price'
            when s.currency<>'USD' then 'unsupported_currency'
            when s.market_price::text in ('NaN','Infinity','-Infinity') or s.market_price<=0
              or length(s.market_price::text)>1024 or s.observed_on>(moment.captured_at at time zone 'UTC')::date
              or s.observed_on<(moment.captured_at at time zone 'UTC')::date-7 then 'invalid_reference' end
        when i.card_printing_id is null or cp.card_print_id is distinct from i.card_print_id then 'identity_unresolved'
        when p.matches>1 then 'invalid_reference'
        when p.status is distinct from 'available' then 'no_qualified_price'
        when p.currency is distinct from 'USD' then 'unsupported_currency'
        when p.card_print_id is distinct from i.card_print_id or p.card_printing_id is distinct from i.card_printing_id
          or p.source_name is distinct from 'tcgplayer' or p.source_label is distinct from 'TCGPlayer Market'
          or p.is_from_price is distinct from false or p.freshness is distinct from 'fresh'
          or p.market_close is null or p.market_close::text in ('NaN','Infinity','-Infinity') or p.market_close<=0
          or length(p.market_close::text)>1024 or p.provenance_id is null or ps.id is null
          or p.observed_at is null or p.published_at is null or p.observed_at>moment.captured_at
          or p.published_at>moment.captured_at or p.published_at<p.observed_at
          or p.observed_at<moment.captured_at-interval '36 hours' then 'invalid_reference'
      end reason,
      case when i.sealed_product_variant_id is not null then
        jsonb_build_object('amount',trim_scale(s.market_price)::text,'currency',s.currency,'provenanceId',s.qualification_id,
          'observedAt',s.observed_on::text,'publishedAt',null)
      else jsonb_build_object('amount',trim_scale(p.market_close)::text,'currency',p.currency,'provenanceId',p.provenance_id,
        'observedAt',public.portfolio_history_utc_v1(p.observed_at),'publishedAt',public.portfolio_history_utc_v1(p.published_at)) end reference,
      jsonb_build_object('version',1,'policy','portfolio_reference_v1','cardPrintId',i.card_print_id,'printingId',i.card_printing_id,
        'slabCertId',i.slab_cert_id,'sealedVariantId',i.sealed_product_variant_id,'condition',i.condition_label,
        'isGraded',i.is_graded,'grader',i.grade_company,'grade',i.grade_value,'gradeLabel',i.grade_label,
        'sealState',i.seal_state,'packageCondition',i.package_condition) basis,
      case when i.sealed_product_variant_id is not null then
        jsonb_build_object('priceReleaseId',s.price_release_id,'imageReleaseId',s.image_release_id,'qualificationId',s.qualification_id,'observedOn',s.observed_on)
      else jsonb_build_object('publicationSetId',ps.publication_set_id,'runId',ps.run_id,'policyVersion',ps.policy_version,
        'provenanceId',p.provenance_id,'observedAt',p.observed_at,'publishedAt',p.published_at) end source_evidence
    from owned i cross join moment left join public.card_printings cp on cp.id=i.card_printing_id
    left join prices p on p.card_printing_id=i.card_printing_id and p.matches=1
    left join public.market_price_publication_snapshots ps on ps.provenance_id=p.provenance_id
    left join sealed s on s.variant_id=i.sealed_product_variant_id and s.matches=1
  ), entries as materialized (
    select id,reason,basis,source_evidence,jsonb_build_object('copyId',id,'kind',kind,
      'basisKey',encode(extensions.digest(convert_to(basis::text,'UTF8'),'sha256'),'hex'),
      'reference',case when reason is null then reference else 'null'::jsonb end,'unpricedReason',reason) entry from evaluated
  )
  select jsonb_build_object('observation',jsonb_build_object('version',1,'scope','all_active_owned_copies','ownerId',actor,
    'snapshotId',point_id,'sequence',seq::text,'capturedAt',public.portfolio_history_utc_v1(moment.captured_at),'complete',true,
    'ownedCount',full_count.n,'copies',coalesce((select jsonb_agg(entry order by id) from entries),'[]'::jsonb)),
    'evidence',coalesce((select jsonb_agg(jsonb_build_object('copyId',id,'basis',basis,'source',source_evidence) order by id) from entries),'[]'::jsonb),
    'pricingAvailable',not exists(select 1 from owned where card_print_id is not null and card_printing_id is not null and not is_graded)
      or exists(select 1 from public.market_price_current_publication c join public.market_price_publication_sets s on s.id=c.publication_set_id and s.run_id=c.run_id
        join public.market_price_pipeline_runs r on r.id=c.run_id where c.singleton and s.publication_state='published'
          and r.reconciliation_state='reconciled' and r.state in ('published','verified')),
    'invalidReferences',(select count(*) from entries where reason='invalid_reference')
      +(select count(*) from prices where matches>1)+(select count(*) from sealed where matches>1))
  from moment cross join full_count;
$$;

create or replace function public.portfolio_history_outcome_v1(r public.portfolio_history_requests)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('version',1,'ownerId',r.owner_id,'request',r.request,'status',r.status,
    'pointId',r.point_id,'errorCode',r.error_code,'recordedAt',public.portfolio_history_utc_v1(r.created_at),
    'summary',(select summary from public.portfolio_history_points where owner_id=r.owner_id and id=r.point_id));
$$;
create or replace function public.portfolio_history_capabilities_v1()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('version',1,'enabled',coalesce((select enabled from public.portfolio_history_control where singleton),false),
    'day',(clock_timestamp() at time zone 'UTC')::date::text,'maximumCopies',20000,'cadence','first_visit_utc_day') where auth.uid() is not null;
$$;
create or replace function public.portfolio_history_recover_v1(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved public.portfolio_history_requests;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.portfolio_history_validate_request_v1(p_request);
  select * into saved from public.portfolio_history_requests where owner_id=actor and request_id=(p_request->>'requestId')::uuid;
  if not found then return null; end if;
  if saved.request is distinct from p_request then raise exception 'History request changed' using errcode='22023'; end if;
  return public.portfolio_history_outcome_v1(saved);
end $$;
create or replace function public.portfolio_history_capture_v1(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved public.portfolio_history_requests; outcome jsonb; seq bigint; point_id uuid;
  captured jsonb; observation jsonb; evidence jsonb; summary jsonb; v_capture_time timestamptz; day_value date;
  state text; failure text; internal_failure text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.portfolio_history_validate_request_v1(p_request);
  insert into public.portfolio_history_owners(owner_id) values(actor) on conflict do nothing;
  select next_sequence into seq from public.portfolio_history_owners where owner_id=actor for update;
  outcome:=public.portfolio_history_recover_v1(p_request); if outcome is not null then return outcome; end if;
  if not coalesce((select enabled from public.portfolio_history_control where singleton),false) then
    raise exception 'Portfolio recording unavailable' using errcode='55000'; end if;
  day_value:=(p_request->>'day')::date;
  if day_value<>(clock_timestamp() at time zone 'UTC')::date then failure:='day_expired';
  else
    select id into point_id from public.portfolio_history_points where owner_id=actor and captured_day=day_value;
    if found then state:='reused';
    else
      begin
        point_id:=gen_random_uuid(); captured:=public.portfolio_history_observe_v1(actor,point_id,seq);
        observation:=captured->'observation'; evidence:=captured->'evidence'; v_capture_time:=(observation->>'capturedAt')::timestamptz;
        if (v_capture_time at time zone 'UTC')::date<>day_value then failure:='day_expired';
        elsif seq=9223372036854775807 then failure:='capacity_reached';
        elsif (observation->>'ownedCount')::bigint>20000 then failure:='too_many_copies';
        elsif octet_length(observation::text)+octet_length(evidence::text)>33554432 then failure:='observation_too_large';
        elsif captured->'pricingAvailable' is distinct from 'true'::jsonb then failure:='pricing_unavailable';
        elsif (captured->>'invalidReferences')::bigint>0 then failure:='invalid_reference';
        elsif exists(select 1 from public.portfolio_history_points old_point where old_point.owner_id=actor and old_point.captured_at>v_capture_time) then failure:='clock_changed';
        else
          summary:=public.portfolio_history_summary_v1(observation);
          insert into public.portfolio_history_points(owner_id,id,sequence,captured_day,captured_at,observation,evidence,summary)
            values(actor,point_id,seq,day_value,v_capture_time,observation,evidence,summary);
          update public.portfolio_history_owners set next_sequence=seq+1 where owner_id=actor;
          state:='captured';
        end if;
      exception when others then failure:='capture_failed'; internal_failure:=left(SQLSTATE||':'||SQLERRM,1000); end;
    end if;
  end if;
  if failure is not null then state:='failed'; point_id:=null; end if;
  insert into public.portfolio_history_requests(owner_id,request_id,request,status,point_id,error_code,internal_error)
    values(actor,(p_request->>'requestId')::uuid,p_request,state,point_id,failure,internal_failure) returning * into saved;
  return public.portfolio_history_outcome_v1(saved);
end $$;
create or replace function public.portfolio_history_cancel_v1(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved public.portfolio_history_requests; outcome jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.portfolio_history_validate_request_v1(p_request);
  insert into public.portfolio_history_owners(owner_id) values(actor) on conflict do nothing;
  perform 1 from public.portfolio_history_owners where owner_id=actor for update;
  outcome:=public.portfolio_history_recover_v1(p_request); if outcome is not null then return outcome; end if;
  insert into public.portfolio_history_requests(owner_id,request_id,request,status)
    values(actor,(p_request->>'requestId')::uuid,p_request,'cancelled') returning * into saved;
  return public.portfolio_history_outcome_v1(saved);
end $$;

create or replace function public.portfolio_history_list_v1(p_before bigint default null,p_watermark bigint default null,p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); watermark bigint; result jsonb; last_sequence bigint;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 100 or (p_before is not null and p_before<=0)
    or (p_watermark is not null and p_watermark<0) then raise exception 'Invalid history page' using errcode='22023'; end if;
  select coalesce(max(sequence),0) into watermark from public.portfolio_history_points where owner_id=actor;
  if p_watermark>watermark then raise exception 'Invalid history watermark' using errcode='22023'; end if;
  watermark:=coalesce(p_watermark,watermark);
  select coalesce(jsonb_agg(summary order by sequence desc),'[]'::jsonb),min(sequence) into result,last_sequence
    from (select summary,sequence from public.portfolio_history_points where owner_id=actor and sequence<=watermark
      and (p_before is null or sequence<p_before) order by sequence desc limit p_limit) points;
  return jsonb_build_object('version',1,'ownerId',actor,'watermark',watermark::text,'points',result,
    'nextBefore',case when exists(select 1 from public.portfolio_history_points where owner_id=actor and sequence<last_sequence) then last_sequence::text end);
end $$;
create or replace function public.portfolio_history_export_v1(p_point_id uuid,p_after_copy uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); point public.portfolio_history_points; result jsonb; last_id text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_point_id is null or p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid history export' using errcode='22023'; end if;
  select * into point from public.portfolio_history_points where owner_id=actor and id=p_point_id;
  if not found then raise exception 'History observation unavailable' using errcode='22023'; end if;
  with selected as (select c,ordinality from jsonb_array_elements(point.observation->'copies') with ordinality c(c,ordinality)
    where p_after_copy is null or (c->>'copyId')::uuid>p_after_copy order by c->>'copyId' limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object('copy',c,'evidence',point.evidence->(ordinality::integer-1)) order by c->>'copyId'),'[]'::jsonb),
    max(c->>'copyId') into result,last_id from selected;
  return jsonb_build_object('version',1,'ownerId',actor,'point',point.summary,'rows',result,
    'nextAfterCopy',case when exists(select 1 from jsonb_array_elements(point.observation->'copies') c where c->>'copyId'>last_id) then last_id end);
end $$;

create or replace function public.portfolio_history_delta_values_v1(a numeric,b numeric,m numeric,n numeric,r numeric,c numeric,l numeric,v numeric)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('before',trim_scale(a)::text,'after',trim_scale(b)::text,'difference',trim_scale(b-a)::text,
    'components',jsonb_build_object('marketMovement',trim_scale(m)::text,'addedCopies',trim_scale(n)::text,
      'removedCopies',trim_scale(r)::text,'newPriceCoverage',trim_scale(c)::text,'lostPriceCoverage',trim_scale(l)::text,'basisChanges',trim_scale(v)::text),
    'display',jsonb_build_object('scale',2,'before',round(a,2)::text,'after',round(b,2)::text,'difference',(round(b,2)-round(a,2))::text,
      'components',jsonb_build_object('marketMovement',round(m,2)::text,'addedCopies',round(n,2)::text,'removedCopies',round(r,2)::text,
        'newPriceCoverage',round(c,2)::text,'lostPriceCoverage',round(l,2)::text,'basisChanges',round(v,2)::text),
      'roundingAdjustment',(round(b,2)-round(a,2)-round(m,2)-round(n,2)-round(r,2)-round(c,2)-round(l,2)-round(v,2))::text));
$$;
create or replace function public.portfolio_history_compare_values_v1(a jsonb,b jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
  if a->'version' is distinct from '1'::jsonb or b->'version' is distinct from '1'::jsonb
    or a->>'scope' is distinct from 'all_active_owned_copies' or b->>'scope' is distinct from 'all_active_owned_copies'
    or a->'ownerId' is distinct from b->'ownerId' or a->'snapshotId'=b->'snapshotId'
    or (a->>'sequence')::bigint>=(b->>'sequence')::bigint
    or (a->>'capturedAt')::timestamptz>(b->>'capturedAt')::timestamptz then
    raise exception 'Incompatible portfolio observations' using errcode='22023'; end if;
  with old_copies as materialized (select c from jsonb_array_elements(a->'copies') c),
  new_copies as materialized (select c from jsonb_array_elements(b->'copies') c),
  joined as materialized (
    select old.c old_copy,new.c new_copy,(old.c->'reference'->>'amount')::numeric old_amount,
      (new.c->'reference'->>'amount')::numeric new_amount,
      old.c->'reference'->>'currency' old_currency,new.c->'reference'->>'currency' new_currency
    from old_copies old full join new_copies new on old.c->>'copyId'=new.c->>'copyId'
  ), classified as materialized (
    select *,case when old_copy is null then 'addedCopies' when new_copy is null then 'removedCopies'
      when old_copy->'kind' is distinct from new_copy->'kind' or old_copy->'basisKey' is distinct from new_copy->'basisKey'
        or (old_amount is not null and new_amount is not null and old_currency<>new_currency) then 'basisChanges'
      when old_amount is not null and new_amount is not null then 'marketMovement'
      when old_amount is null and new_amount is not null then 'newPriceCoverage'
      when old_amount is not null and new_amount is null then 'lostPriceCoverage'
      else 'unchangedUnpricedCopies' end component from joined
  ), contributions as materialized (
    select old_currency currency,component,-old_amount amount,old_amount old_amount,0::numeric new_amount from classified where old_amount is not null
    union all select new_currency,component,new_amount,0::numeric,new_amount from classified where new_amount is not null
  ), buckets as (
    select currency,sum(old_amount) old_amount,sum(new_amount) new_amount,
      coalesce(sum(amount) filter(where component='marketMovement'),0) m,
      coalesce(sum(amount) filter(where component='addedCopies'),0) n,
      coalesce(sum(amount) filter(where component='removedCopies'),0) r,
      coalesce(sum(amount) filter(where component='newPriceCoverage'),0) c,
      coalesce(sum(amount) filter(where component='lostPriceCoverage'),0) l,
      coalesce(sum(amount) filter(where component='basisChanges'),0) v from contributions group by currency
  )
  select jsonb_build_object('version',1,'scope','all_active_owned_copies','before',public.portfolio_history_summary_v1(a),
    'after',public.portfolio_history_summary_v1(b),'counts',jsonb_build_object(
      'addedCopies',count(*) filter(where component='addedCopies'),'removedCopies',count(*) filter(where component='removedCopies'),
      'basisChangedCopies',count(*) filter(where component='basisChanges'),'newlyPricedCopies',count(*) filter(where component='newPriceCoverage'),
      'lostPricedCopies',count(*) filter(where component='lostPriceCoverage'),'comparablePricedCopies',count(*) filter(where component='marketMovement'),
      'unchangedUnpricedCopies',count(*) filter(where component='unchangedUnpricedCopies')),
    'currencies',coalesce((select jsonb_object_agg(currency,public.portfolio_history_delta_values_v1(old_amount,new_amount,m,n,r,c,l,v)) from buckets),'{}'::jsonb),
    'meaning','reference_value_change','isProfit',false,'isCashFlow',false) into result from classified;
  return result;
end $$;
create or replace function public.portfolio_history_compare_v1(p_before_id uuid,p_after_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); a jsonb; b jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_before_id is null or p_after_id is null or p_before_id=p_after_id then raise exception 'Invalid history selection' using errcode='22023'; end if;
  select observation into a from public.portfolio_history_points where owner_id=actor and id=p_before_id;
  select observation into b from public.portfolio_history_points where owner_id=actor and id=p_after_id;
  if a is null or b is null then raise exception 'History observation unavailable' using errcode='22023'; end if;
  return public.portfolio_history_compare_values_v1(a,b);
end $$;

-- Explicit ACLs also remove inherited default service-role privileges.
revoke all on function public.portfolio_history_immutable_v1(),public.portfolio_history_utc_v1(timestamptz),
  public.portfolio_history_validate_request_v1(jsonb),public.portfolio_history_summary_v1(jsonb),
  public.portfolio_history_observe_v1(uuid,uuid,bigint),public.portfolio_history_outcome_v1(public.portfolio_history_requests),
  public.portfolio_history_capabilities_v1(),public.portfolio_history_recover_v1(jsonb),public.portfolio_history_capture_v1(jsonb),
  public.portfolio_history_cancel_v1(jsonb),public.portfolio_history_list_v1(bigint,bigint,integer),
  public.portfolio_history_export_v1(uuid,uuid,integer),public.portfolio_history_compare_v1(uuid,uuid),
  public.portfolio_history_compare_values_v1(jsonb,jsonb),
  public.portfolio_history_delta_values_v1(numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric)
  from public,anon,authenticated,service_role;
grant execute on function public.portfolio_history_capabilities_v1(),public.portfolio_history_recover_v1(jsonb),
  public.portfolio_history_capture_v1(jsonb),public.portfolio_history_cancel_v1(jsonb),
  public.portfolio_history_list_v1(bigint,bigint,integer),public.portfolio_history_export_v1(uuid,uuid,integer),
  public.portfolio_history_compare_v1(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
