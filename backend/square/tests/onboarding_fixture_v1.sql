-- Only the new, unlinked local integration lab. Auth users are created through
-- local GoTrue first. No production data or replacement read-model functions.
begin;
create schema square_onboarding_test_fixture;
revoke all on schema square_onboarding_test_fixture from public,anon,authenticated,service_role;
create table square_onboarding_test_fixture.copies(owner_id uuid,instance_id uuid,gvvi text,printing_id uuid,parent_id uuid);
do $$declare actor uuid; parent uuid; printing uuid; legacy uuid; copy uuid; counter integer:=0;begin
 select id into strict parent from public.card_prints order by id limit 1;
 insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(parent,'normal','GV-PK-LOCAL-SQUARE-ONBOARDING-NORMAL') returning id into printing;
 foreach actor in array array['__OWNER__'::uuid,'__OTHER__'::uuid] loop
  insert into public.user_entitlements(user_id,tier,role,features) values(actor,'vendor','vendor','{"vendor_tools":true}');
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
   values(actor,'square-fixture-'||left(actor::text,8),'Local Square fixture',true,true)
   on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true;
  for i in 1..case when actor='__OWNER__'::uuid then 3 else 1 end loop
   legacy:=gen_random_uuid();copy:=gen_random_uuid();counter:=counter+1;
   insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,actor,id,name,gv_id,1 from public.card_prints where id=parent;
   insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,condition_label)
    values(copy,actor,parent,printing,legacy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(counter::text,6,'0'),'hold','NM');
   insert into square_onboarding_test_fixture.copies values(actor,copy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(counter::text,6,'0'),printing,parent);
  end loop;
 end loop;
end$$;

commit;
