-- Seller asking-price policy only. Market evidence, identities and stock stay authoritative.
begin;
create schema grookai_vendor_pricing;
revoke all on schema grookai_vendor_pricing from public,anon,authenticated,service_role;

create table grookai_vendor_pricing.controls (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false, revision bigint not null default 0,
 lease_token uuid, lease_fence bigint not null default 0, lease_until timestamptz
);
insert into grookai_vendor_pricing.controls(singleton) values(true);
create table grookai_vendor_pricing.rules (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 60), revision bigint not null default 1 check(revision>0),
 definition jsonb not null, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(id,owner_id), unique(owner_id,name)
);
create table grookai_vendor_pricing.settings (
 owner_id uuid primary key references auth.users(id) on delete restrict,
 default_rule_id uuid, auto_for_new boolean not null default false, revision bigint not null default 0,
 foreign key(default_rule_id,owner_id) references grookai_vendor_pricing.rules(id,owner_id) on delete restrict,
 check(not auto_for_new or default_rule_id is not null)
);
create table grookai_vendor_pricing.copies (
 instance_id uuid primary key references public.vault_item_instances(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 mode text not null check(mode in ('manual','default','preset')), rule_id uuid,
 revision bigint not null default 1, state text not null default 'waiting' check(state in ('fixed','ready','waiting','stale','held','paused')),
 reason text, applied_rule_id uuid, applied_rule_revision bigint, applied_settings_revision bigint,
 checked_publication_id uuid, provenance_id uuid, reference_amount numeric, resolved_minor bigint,
 observed_at timestamptz, checked_at timestamptz, next_check_at timestamptz not null default clock_timestamp(),
 foreign key(rule_id,owner_id) references grookai_vendor_pricing.rules(id,owner_id) on delete restrict,
 check((mode='preset')=(rule_id is not null)), check(resolved_minor is null or resolved_minor between 1 and 9999999999)
);
create index vendor_pricing_due_v1 on grookai_vendor_pricing.copies(next_check_at,instance_id) where mode<>'manual';
create table grookai_vendor_pricing.events (
 id uuid primary key default gen_random_uuid(), owner_id uuid, instance_id uuid,
 kind text not null, data jsonb not null check(octet_length(data::text)<=16384),
 recorded_at timestamptz not null default clock_timestamp()
);
create table grookai_vendor_pricing.requests (
 owner_id uuid not null references auth.users(id) on delete restrict, id uuid not null,
 action text not null, payload_hash text not null, result jsonb,
 state text not null check(state in ('started','succeeded','failed')), created_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,id)
);
-- A private, consumed marker binds a single canonical asking write to this transaction.
create table grookai_vendor_pricing.write_intents (
 transaction_id bigint not null, instance_id uuid not null, amount numeric not null,
 primary key(transaction_id,instance_id)
);
create table grookai_vendor_pricing.worker_runs (
 id uuid primary key, started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 status text not null check(status in ('running','succeeded','failed','paused','busy','abandoned')),
 result jsonb not null default '{}'
);
do $$declare n text;begin
 foreach n in array array['controls','rules','settings','copies','events','requests','write_intents','worker_runs'] loop
  execute format('alter table grookai_vendor_pricing.%I enable row level security',n);
  execute format('revoke all on grookai_vendor_pricing.%I from public,anon,authenticated,service_role',n);
 end loop;
end$$;

create function grookai_vendor_pricing.immutable_event() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'vendor_pricing_history_immutable';end$$;
create trigger immutable_vendor_pricing_event before update or delete on grookai_vendor_pricing.events
 for each row execute function grookai_vendor_pricing.immutable_event();

create function grookai_vendor_pricing.is_vendor(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((e->>'is_active')::boolean,false) and
 (e->>'tier' in ('vendor','founder_admin') or e->>'role' in ('vendor','founder') or coalesce((e->'features'->>'vendor_tools')::boolean,false))
 from (select public.grookai_effective_entitlement_v1(p_owner) e) x;
$$;

create function grookai_vendor_pricing.validate_rule(p_rule jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare b numeric; a numeric; step numeric; minimum numeric; maximum numeric; mode text;
begin
 if jsonb_typeof(p_rule) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_rule) k where k not in ('markupBps','flatMinor','rounding','stepMinor','minMinor','maxMinor')) then raise exception 'vendor_pricing_invalid_rule';end if;
 if jsonb_typeof(p_rule->'markupBps') is distinct from 'number' or jsonb_typeof(p_rule->'flatMinor') is distinct from 'number' or jsonb_typeof(p_rule->'stepMinor') is distinct from 'number' then raise exception 'vendor_pricing_invalid_rule';end if;
 if (p_rule ? 'minMinor' and jsonb_typeof(p_rule->'minMinor') not in ('number','null')) or (p_rule ? 'maxMinor' and jsonb_typeof(p_rule->'maxMinor') not in ('number','null')) then raise exception 'vendor_pricing_invalid_rule';end if;
 b:=(p_rule->>'markupBps')::numeric;a:=(p_rule->>'flatMinor')::numeric;step:=(p_rule->>'stepMinor')::numeric;mode:=p_rule->>'rounding';
 minimum:=nullif(p_rule->>'minMinor','')::numeric;maximum:=nullif(p_rule->>'maxMinor','')::numeric;
 if b<>trunc(b) or b not between -9999 and 100000 or a<>trunc(a) or a not between -9999999999 and 9999999999
  or step<>trunc(step) or step not between 1 and 1000000 or mode not in ('none','up','down','nearest') or mode is null
  or (minimum is not null and (minimum<>trunc(minimum) or minimum not between 1 and 9999999999))
  or (maximum is not null and (maximum<>trunc(maximum) or maximum not between 1 and 9999999999))
  or minimum>maximum then raise exception 'vendor_pricing_invalid_rule';end if;
end$$;

create function grookai_vendor_pricing.calculate(p_market numeric,p_rule jsonb) returns bigint
language plpgsql immutable set search_path='' as $$
declare b numeric; a numeric; step numeric; minimum numeric; maximum numeric; value numeric; mode text;
begin
 perform grookai_vendor_pricing.validate_rule(p_rule);
 b:=(p_rule->>'markupBps')::numeric;a:=(p_rule->>'flatMinor')::numeric;step:=(p_rule->>'stepMinor')::numeric;mode:=p_rule->>'rounding';
 minimum:=(p_rule->>'minMinor')::numeric;maximum:=(p_rule->>'maxMinor')::numeric;
 if p_market is null or p_market<=0 or p_market='NaN'::numeric or p_market>99999999.99 then raise exception 'vendor_pricing_no_exact_market';end if;
 value:=p_market*100*(10000+b)/10000+a;
 value:=case mode when 'up' then ceil(value/step)*step when 'down' then floor(value/step)*step when 'nearest' then round(value/step)*step else round(value) end;
 if minimum is not null then value:=greatest(minimum,value);end if;
 if maximum is not null then value:=least(maximum,value);end if;
 if value is null or value<=0 or value>9999999999 or value='NaN'::numeric then raise exception 'vendor_pricing_invalid_result';end if;
 return value::bigint;
end$$;

create function grookai_vendor_pricing.workspace(p_owner uuid,p_instance uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',(select enabled from grookai_vendor_pricing.controls where singleton),
 'settings',coalesce((select to_jsonb(s)-'owner_id' from grookai_vendor_pricing.settings s where owner_id=p_owner),jsonb_build_object('default_rule_id',null,'auto_for_new',false,'revision',0)),
 'rules',coalesce((select jsonb_agg(to_jsonb(r)-'owner_id' order by r.name,r.id) from grookai_vendor_pricing.rules r where r.owner_id=p_owner),'[]'::jsonb),
 'copy',(select to_jsonb(c)-'owner_id' from grookai_vendor_pricing.copies c join public.vault_item_instances v on v.id=c.instance_id and v.user_id=p_owner and v.archived_at is null where c.instance_id=p_instance and c.owner_id=p_owner));
$$;

create function grookai_vendor_pricing.quote(p_owner uuid,p_instance uuid,p_mode text,p_rule uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.vault_item_instances; r grookai_vendor_pricing.rules; s grookai_vendor_pricing.settings; m record; amount bigint;
begin
 select * into v from public.vault_item_instances where id=p_instance and user_id=p_owner and archived_at is null;
 if not found then raise exception 'vendor_pricing_copy_unavailable';end if;
 if p_mode not in ('default','preset') or p_mode is null or (p_mode='preset')<>(p_rule is not null) then raise exception 'vendor_pricing_invalid_mode';end if;
 select * into s from grookai_vendor_pricing.settings where owner_id=p_owner;
 select * into r from grookai_vendor_pricing.rules where id=case when p_mode='default' then s.default_rule_id else p_rule end and owner_id=p_owner;
 if not found then return jsonb_build_object('status','waiting','reason','Choose a pricing rule.');end if;
 if v.card_printing_id is null or v.slab_cert_id is not null then return jsonb_build_object('status','waiting','reason','No exact raw-card market reference. Enter your own price.');end if;
 select * into m from public.get_market_pricing_read_model_v1('{}'::uuid[],array[v.card_printing_id])
  where pricing_scope='card_printing' and card_print_id=v.card_print_id and card_printing_id=v.card_printing_id
   and status='available' and currency='USD' and source_name='tcgplayer' and freshness='fresh' and not is_from_price
   and market_close>0 and observed_at is not null and published_at is not null and provenance_id is not null;
 if not found then return jsonb_build_object('status','waiting','reason','No fresh exact market reference. Enter your own price or try later.');end if;
 amount:=grookai_vendor_pricing.calculate(m.market_close,r.definition);
 return jsonb_build_object('status','ready','amountMinor',amount,'currency','USD','marketAmount',m.market_close,'provenanceId',m.provenance_id,
 'observedAt',m.observed_at,'publishedAt',m.published_at,'ruleId',r.id,'ruleName',r.name,'ruleRevision',r.revision,'settingsRevision',coalesce(s.revision,0));
end$$;

create function grookai_vendor_pricing.square_pending(p_owner uuid,p_instance uuid,p_minor bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from grookai_square.connections c
  left join grookai_square.preferences pref on pref.connection_id=c.id
  left join grookai_square.targets t on t.connection_id=c.id and t.instance_id=p_instance and t.owner_id=p_owner
  where c.owner_id=p_owner and c.environment='production' and c.status='connected' and c.auto_sync
   and coalesce(t.selected,coalesce(pref.auto_enroll and pref.sell_on_square,false))
   and (t.item_id is null or t.last_synced_projection->'price'->>'amount' is distinct from p_minor::text
    or t.last_synced_projection->'price'->>'currency' is distinct from 'USD'));
$$;

create function grookai_vendor_pricing.capture_manual() returns trigger
language plpgsql security definer set search_path='' as $$
declare marked boolean;
begin
 delete from grookai_vendor_pricing.write_intents where transaction_id=txid_current() and instance_id=new.id
  and amount=new.asking_price_amount and new.asking_price_currency='USD' and new.pricing_mode='asking' returning true into marked;
 if coalesce(marked,false) then return new;end if;
 -- Establish a revision even for a legacy copy with no strategy row. Otherwise
 -- an automatic form opened at revision zero could overwrite a later manual save.
 insert into grookai_vendor_pricing.copies(instance_id,owner_id,mode,revision,state,resolved_minor)
 values(new.id,new.user_id,'manual',1,'fixed',case when new.asking_price_currency='USD' and new.asking_price_amount>0 and new.asking_price_amount<=99999999.99 then round(new.asking_price_amount*100)::bigint else null end)
 on conflict(instance_id) do update set owner_id=excluded.owner_id,mode='manual',rule_id=null,revision=grookai_vendor_pricing.copies.revision+1,state='fixed',reason=null,resolved_minor=excluded.resolved_minor;
 insert into grookai_vendor_pricing.events(owner_id,instance_id,kind,data) values(new.user_id,new.id,'manual_override',jsonb_build_object('amount',new.asking_price_amount,'currency',new.asking_price_currency));
 return new;
end$$;
create trigger capture_vendor_manual_price_v1 before update of asking_price_amount,asking_price_currency,pricing_mode on public.vault_item_instances
 for each row execute function grookai_vendor_pricing.capture_manual();

create function grookai_vendor_pricing.inherit_new() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.archived_at is null and new.asking_price_amount is null and (select enabled from grookai_vendor_pricing.controls where singleton)
  and exists(select 1 from grookai_vendor_pricing.settings where owner_id=new.user_id and auto_for_new and default_rule_id is not null)
  and grookai_vendor_pricing.is_vendor(new.user_id) then
  insert into grookai_vendor_pricing.copies(instance_id,owner_id,mode) values(new.id,new.user_id,'default');
 end if;
 return new;
end$$;
create trigger inherit_vendor_pricing_new_copy_v1 after insert on public.vault_item_instances for each row execute function grookai_vendor_pricing.inherit_new();

create function grookai_vendor_pricing.copy_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.user_id is distinct from new.user_id then
  update grookai_vendor_pricing.copies set owner_id=new.user_id,mode='manual',rule_id=null,revision=revision+1,state='fixed',reason=null,
   applied_rule_id=null,applied_rule_revision=null,applied_settings_revision=null,checked_publication_id=null,provenance_id=null,reference_amount=null,resolved_minor=null,observed_at=null,next_check_at=clock_timestamp()
   where instance_id=new.id;
 elsif new.archived_at is not null then
  update grookai_vendor_pricing.copies set state='paused',reason='Copy inactive.',next_check_at=clock_timestamp()+interval '1 day' where instance_id=new.id;
 else
  update grookai_vendor_pricing.copies set next_check_at=clock_timestamp() where instance_id=new.id and mode<>'manual';
 end if;
 return new;
end$$;
create trigger invalidate_vendor_pricing_copy_v1 after update of user_id,card_print_id,card_printing_id,slab_cert_id,condition_label,archived_at,intent on public.vault_item_instances
 for each row execute function grookai_vendor_pricing.copy_changed();

create function grookai_vendor_pricing.apply_quote(p_owner uuid,p_instance uuid,p_mode text,p_rule uuid,p_expected bigint,p_publish boolean,p_background boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.vault_item_instances; c grookai_vendor_pricing.copies; s grookai_vendor_pricing.settings; q jsonb; publication uuid; amount bigint; v_reason text;
begin
 if not (select enabled from grookai_vendor_pricing.controls where singleton) then raise exception 'vendor_pricing_paused';end if;
 if not coalesce(grookai_vendor_pricing.is_vendor(p_owner),false) then raise exception 'vendor_pricing_vendor_required';end if;
 select * into s from grookai_vendor_pricing.settings where owner_id=p_owner for share;
 perform 1 from grookai_vendor_pricing.rules where owner_id=p_owner and id=case when p_mode='default' then s.default_rule_id else p_rule end for share;
 select * into v from public.vault_item_instances where id=p_instance and user_id=p_owner and archived_at is null for update skip locked;
 if not found then return jsonb_build_object('status','busy');end if;
 select * into c from grookai_vendor_pricing.copies where instance_id=p_instance and owner_id=p_owner for update;
 if p_background and (c.instance_id is null or c.mode='manual' or v.intent<>'sell') then return jsonb_build_object('status','skipped');end if;
 if not p_background and coalesce(c.revision,0) is distinct from p_expected then raise exception 'vendor_pricing_copy_changed';end if;
 if p_background then p_mode:=c.mode;p_rule:=c.rule_id;end if;
 select publication_set_id into publication from public.market_price_current_publication where singleton for share;
 if exists(select 1 from public.vendor_stock_reservations where instance_id=v.id and state in ('held','payment_pending'))
  or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=v.id and released_at is null) then
  if not p_background then raise exception 'vendor_pricing_checkout_in_progress';end if;
  update grookai_vendor_pricing.copies set state='held',reason='Checkout in progress.',checked_at=clock_timestamp(),next_check_at=clock_timestamp()+interval '5 minutes' where instance_id=v.id;
  return jsonb_build_object('status','held');
 end if;
 q:=grookai_vendor_pricing.quote(p_owner,p_instance,p_mode,p_rule);
 if q->>'status'<>'ready' then
  if not p_background then raise exception 'vendor_pricing_no_exact_market';end if;
  v_reason:=q->>'reason';
  if c.state is distinct from 'stale' or c.reason is distinct from v_reason then insert into grookai_vendor_pricing.events(owner_id,instance_id,kind,data) values(p_owner,v.id,'reference_unavailable',q);end if;
  update grookai_vendor_pricing.copies set state=case when resolved_minor is null then 'waiting' else 'stale' end,reason=v_reason,checked_publication_id=publication,checked_at=clock_timestamp(),next_check_at=clock_timestamp()+interval '5 minutes' where instance_id=v.id;
  return jsonb_build_object('status','stale');
 end if;
 amount:=(q->>'amountMinor')::bigint;
 insert into grookai_vendor_pricing.copies(instance_id,owner_id,mode,rule_id,revision,state,reason,applied_rule_id,applied_rule_revision,applied_settings_revision,checked_publication_id,provenance_id,reference_amount,resolved_minor,observed_at,checked_at,next_check_at)
 values(v.id,p_owner,p_mode,p_rule,coalesce(c.revision,0)+case when p_background then 0 else 1 end,'ready',null,(q->>'ruleId')::uuid,(q->>'ruleRevision')::bigint,(q->>'settingsRevision')::bigint,publication,(q->>'provenanceId')::uuid,(q->>'marketAmount')::numeric,amount,(q->>'observedAt')::timestamptz,clock_timestamp(),clock_timestamp()+interval '5 minutes')
 on conflict(instance_id) do update set mode=excluded.mode,rule_id=excluded.rule_id,revision=excluded.revision,state='ready',reason=null,applied_rule_id=excluded.applied_rule_id,applied_rule_revision=excluded.applied_rule_revision,applied_settings_revision=excluded.applied_settings_revision,checked_publication_id=excluded.checked_publication_id,provenance_id=excluded.provenance_id,reference_amount=excluded.reference_amount,resolved_minor=excluded.resolved_minor,observed_at=excluded.observed_at,checked_at=excluded.checked_at,next_check_at=excluded.next_check_at;
 if v.asking_price_amount is distinct from amount::numeric/100 or v.asking_price_currency is distinct from 'USD' or v.pricing_mode is distinct from 'asking' or (p_publish and v.intent<>'sell') then
  insert into grookai_vendor_pricing.write_intents(transaction_id,instance_id,amount) values(txid_current(),v.id,amount::numeric/100);
  update public.vault_item_instances set pricing_mode='asking',asking_price_amount=amount::numeric/100,asking_price_currency='USD',intent=case when p_publish then 'sell' else intent end where id=v.id and user_id=p_owner and archived_at is null;
  if not found then raise exception 'vendor_pricing_copy_changed';end if;
 end if;
 if not p_background or c.provenance_id is distinct from (q->>'provenanceId')::uuid or c.applied_rule_revision is distinct from (q->>'ruleRevision')::bigint or c.applied_rule_id is distinct from (q->>'ruleId')::uuid or c.resolved_minor is distinct from amount then
  insert into grookai_vendor_pricing.events(owner_id,instance_id,kind,data) values(p_owner,v.id,'automatic_price',q||jsonb_build_object('copyRevision',coalesce(c.revision,0)+case when p_background then 0 else 1 end));
 end if;
 return q||jsonb_build_object('id',v.id,'gvviId',v.gv_vi_id,'revision',coalesce(c.revision,0)+case when p_background then 0 else 1 end,
 'changed',v.asking_price_amount is distinct from amount::numeric/100 or v.asking_price_currency is distinct from 'USD' or v.pricing_mode is distinct from 'asking' or (p_publish and v.intent<>'sell'),
 'needsSquareSync',grookai_vendor_pricing.square_pending(p_owner,v.id,amount),'ownerId',p_owner);
end$$;

create function public.vendor_pricing_v1(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); request_id uuid; hash text; prior grookai_vendor_pricing.requests; r grookai_vendor_pricing.rules; s grookai_vendor_pricing.settings; v_result jsonb; rule_id uuid; code text;
begin
 if actor is null then raise exception 'vendor_pricing_sign_in_required';end if;
 if not coalesce(grookai_vendor_pricing.is_vendor(actor),false) then raise exception 'vendor_pricing_vendor_required';end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>16384 then raise exception 'vendor_pricing_invalid_request';end if;
 if p_action='workspace' then return grookai_vendor_pricing.workspace(actor,nullif(p_data->>'instanceId','')::uuid);end if;
 if p_action='preview' then return grookai_vendor_pricing.quote(actor,(p_data->>'instanceId')::uuid,p_data->>'mode',nullif(p_data->>'ruleId','')::uuid);end if;
 if p_action='calculate' then return jsonb_build_object('amountMinor',grookai_vendor_pricing.calculate((p_data->>'marketAmount')::numeric,p_data->'definition'),'referenceOnly',true);end if;
 if p_action not in ('save_rule','save_settings','apply') then raise exception 'vendor_pricing_invalid_action';end if;
 request_id:=(p_data->>'requestId')::uuid;if request_id is null then raise exception 'vendor_pricing_request_id_required';end if;
 hash:=encode(extensions.digest(p_action||':'||(p_data-'requestId')::text,'sha256'),'hex');
 insert into grookai_vendor_pricing.requests(owner_id,id,action,payload_hash,state) values(actor,request_id,p_action,hash,'started') on conflict do nothing;
 select * into prior from grookai_vendor_pricing.requests where owner_id=actor and id=request_id for update;
 if prior.payload_hash<>hash or prior.action<>p_action then raise exception 'vendor_pricing_request_conflict';end if;
 if prior.state in ('succeeded','failed') then return prior.result;end if;
 begin
  if p_action='apply' then
   v_result:=grookai_vendor_pricing.apply_quote(actor,(p_data->>'instanceId')::uuid,p_data->>'mode',nullif(p_data->>'ruleId','')::uuid,(p_data->>'expectedRevision')::bigint,coalesce((p_data->>'publish')::boolean,false));
   if v_result->>'status'='busy' then raise exception 'vendor_pricing_copy_busy';end if;
  else
   insert into grookai_vendor_pricing.settings(owner_id) values(actor) on conflict do nothing;
   select * into s from grookai_vendor_pricing.settings where owner_id=actor for update;
   if p_action='save_rule' then
    perform grookai_vendor_pricing.validate_rule(p_data->'definition');
    rule_id:=nullif(p_data->>'ruleId','')::uuid;
    if rule_id is null then
     insert into grookai_vendor_pricing.rules(owner_id,name,definition) values(actor,btrim(p_data->>'name'),p_data->'definition') returning * into r;
    else
     select * into strict r from grookai_vendor_pricing.rules where id=rule_id and owner_id=actor for update;
     if r.revision is distinct from (p_data->>'expectedRevision')::bigint then raise exception 'vendor_pricing_rule_changed';end if;
     update grookai_vendor_pricing.rules set name=btrim(p_data->>'name'),definition=p_data->'definition',revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
    end if;
    update grookai_vendor_pricing.settings set revision=revision+1 where owner_id=actor;
    insert into grookai_vendor_pricing.events(owner_id,kind,data) values(actor,'rule_saved',to_jsonb(r)-'owner_id');
   else
    if s.revision is distinct from (p_data->>'expectedRevision')::bigint then raise exception 'vendor_pricing_settings_changed';end if;
    rule_id:=nullif(p_data->>'defaultRuleId','')::uuid;
    if rule_id is not null and not exists(select 1 from grookai_vendor_pricing.rules where id=rule_id and owner_id=actor) then raise exception 'vendor_pricing_rule_unavailable';end if;
    update grookai_vendor_pricing.settings set default_rule_id=rule_id,auto_for_new=coalesce((p_data->>'autoForNew')::boolean,false),revision=revision+1 where owner_id=actor;
    insert into grookai_vendor_pricing.events(owner_id,kind,data) values(actor,'settings_saved',jsonb_build_object('defaultRuleId',rule_id,'autoForNew',coalesce((p_data->>'autoForNew')::boolean,false),'revision',s.revision+1));
   end if;
   v_result:=grookai_vendor_pricing.workspace(actor)||jsonb_build_object('status','saved');
  end if;
  v_result:=v_result||jsonb_build_object('ok',true);
  update grookai_vendor_pricing.requests set state='succeeded',result=v_result where owner_id=actor and id=request_id;
 exception when others then
  code:=case when sqlerrm~'^vendor_pricing_[a-z_]+$' then sqlerrm else 'vendor_pricing_save_failed' end;
  v_result:=jsonb_build_object('ok',false,'error',code);
  update grookai_vendor_pricing.requests set state='failed',result=v_result where owner_id=actor and id=request_id;
  insert into grookai_vendor_pricing.events(owner_id,kind,data) values(actor,'request_failed',jsonb_build_object('requestId',request_id,'action',p_action,'error',code));
 end;
 return v_result;
end$$;

create function public.vendor_pricing_service_v1(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c grookai_vendor_pricing.copies; result jsonb; code text; current_publication uuid; ctrl grookai_vendor_pricing.controls; run uuid; prior_run grookai_vendor_pricing.worker_runs;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'vendor_pricing_service_only';end if;
 if p_action='control' then
  select * into ctrl from grookai_vendor_pricing.controls where singleton for update;
  if ctrl.revision is distinct from (p_data->>'expectedRevision')::bigint then raise exception 'vendor_pricing_control_changed';end if;
  update grookai_vendor_pricing.controls set enabled=(p_data->>'enabled')::boolean,revision=revision+1 where singleton returning * into ctrl;
  insert into grookai_vendor_pricing.events(kind,data) values('control_changed',jsonb_build_object('enabled',ctrl.enabled,'revision',ctrl.revision));return jsonb_build_object('enabled',ctrl.enabled,'revision',ctrl.revision);
 end if;
 if p_action='run_start' then
  run:=(p_data->>'runId')::uuid;if run is null then raise exception 'vendor_pricing_invalid_run';end if;
  select * into ctrl from grookai_vendor_pricing.controls where singleton for update;
  select * into prior_run from grookai_vendor_pricing.worker_runs where id=run;
  if found then return to_jsonb(prior_run)||jsonb_build_object('fence',case when ctrl.lease_token=run then ctrl.lease_fence else null end);end if;
  if not ctrl.enabled then
   insert into grookai_vendor_pricing.worker_runs(id,status,finished_at) values(run,'paused',clock_timestamp());return jsonb_build_object('status','paused');
  end if;
  if ctrl.lease_until>clock_timestamp() then
   insert into grookai_vendor_pricing.worker_runs(id,status,finished_at) values(run,'busy',clock_timestamp());return jsonb_build_object('status','busy');
  end if;
  update grookai_vendor_pricing.worker_runs set status='abandoned',finished_at=clock_timestamp(),result='{"error":"vendor_pricing_worker_interrupted"}' where status='running';
  update grookai_vendor_pricing.controls set lease_token=run,lease_fence=lease_fence+1,lease_until=clock_timestamp()+interval '300 seconds' where singleton returning * into ctrl;
  insert into grookai_vendor_pricing.worker_runs(id,status) values(run,'running');return jsonb_build_object('status','running','fence',ctrl.lease_fence);
 end if;
 if p_action='run_finish' then
  run:=(p_data->>'runId')::uuid;
  select * into ctrl from grookai_vendor_pricing.controls where singleton for update;
  if ctrl.lease_token is distinct from run or ctrl.lease_fence is distinct from (p_data->>'fence')::bigint then raise exception 'vendor_pricing_stale_run';end if;
  if coalesce(p_data->'result'->>'status','') not in ('succeeded','failed','paused') or octet_length((p_data->'result')::text)>4096 then raise exception 'vendor_pricing_invalid_result';end if;
  update grookai_vendor_pricing.worker_runs set status=p_data->'result'->>'status',result=p_data->'result',finished_at=clock_timestamp() where id=run and status='running';
  update grookai_vendor_pricing.controls set lease_token=null,lease_until=null where singleton;
  return jsonb_build_object('status','recorded');
 end if;
 select * into ctrl from grookai_vendor_pricing.controls where singleton for share;
 if ctrl.lease_token is distinct from nullif(p_data->>'runId','')::uuid or ctrl.lease_fence is distinct from (p_data->>'fence')::bigint or ctrl.lease_until is null or ctrl.lease_until<=clock_timestamp() then raise exception 'vendor_pricing_stale_run';end if;
 if not ctrl.enabled then return case when p_action='candidates' then '[]'::jsonb else '{"status":"paused"}'::jsonb end;end if;
 if p_action='candidates' then
  if not (select enabled from grookai_vendor_pricing.controls where singleton) then return '[]'::jsonb;end if;
  select publication_set_id into current_publication from public.market_price_current_publication where singleton;
  return coalesce((select jsonb_agg(x.instance_id) from (
   select cp.instance_id from grookai_vendor_pricing.copies cp join public.vault_item_instances v on v.id=cp.instance_id and v.user_id=cp.owner_id
    left join grookai_vendor_pricing.settings s on s.owner_id=cp.owner_id
    left join grookai_vendor_pricing.rules r on r.owner_id=cp.owner_id and r.id=case when cp.mode='default' then s.default_rule_id else cp.rule_id end
   where cp.mode<>'manual' and v.archived_at is null and v.intent='sell'
    and (cp.next_check_at<=clock_timestamp() or (cp.state='ready' and (cp.checked_publication_id is distinct from current_publication or cp.applied_rule_id is distinct from r.id or cp.applied_rule_revision is distinct from r.revision or (cp.mode='default' and cp.applied_settings_revision is distinct from s.revision) or grookai_vendor_pricing.square_pending(cp.owner_id,cp.instance_id,cp.resolved_minor))))
   order by cp.checked_at nulls first,cp.instance_id limit 50) x),'[]'::jsonb);
 end if;
 if p_action<>'reprice' then raise exception 'vendor_pricing_invalid_action';end if;
 select * into c from grookai_vendor_pricing.copies where instance_id=(p_data->>'instanceId')::uuid;
 if not found or c.mode='manual' then return jsonb_build_object('status','skipped');end if;
 begin
  result:=grookai_vendor_pricing.apply_quote(c.owner_id,c.instance_id,c.mode,c.rule_id,c.revision,false,true);
 exception when others then
  code:=case when sqlerrm~'^vendor_pricing_[a-z_]+$' then sqlerrm else 'vendor_pricing_update_failed' end;
  update grookai_vendor_pricing.copies set state='paused',reason=code,checked_at=clock_timestamp(),next_check_at=clock_timestamp()+interval '5 minutes' where instance_id=c.instance_id and mode<>'manual' and revision=c.revision;
  insert into grookai_vendor_pricing.events(owner_id,instance_id,kind,data) values(c.owner_id,c.instance_id,'reprice_failed',jsonb_build_object('error',code));
  result:=jsonb_build_object('status','failed','error',code);
 end;
 return result;
end$$;

revoke all on all functions in schema grookai_vendor_pricing from public,anon,authenticated,service_role;
revoke all on function public.vendor_pricing_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vendor_pricing_v1(text,jsonb) to authenticated;
revoke all on function public.vendor_pricing_service_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vendor_pricing_service_v1(text,jsonb) to service_role;
commit;
