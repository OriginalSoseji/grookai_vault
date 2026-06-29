-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_REMAINING_DRAIN_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 for every currently eligible low_signal_monitor row.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '6a818fd9-ba5d-4ec8-9ae7-1163a873b3f5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":1,"target_disposition_id":"6a818fd9-ba5d-4ec8-9ae7-1163a873b3f5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6b631d54-b79e-4b8a-ad63-b7972baa527f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":2,"target_disposition_id":"6b631d54-b79e-4b8a-ad63-b7972baa527f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6bef4e34-776c-4887-ad69-734f0c888ce4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":3,"target_disposition_id":"6bef4e34-776c-4887-ad69-734f0c888ce4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c95d461-0961-45c4-a6b1-bc6862e35877'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":4,"target_disposition_id":"6c95d461-0961-45c4-a6b1-bc6862e35877","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c9fa436-fbb4-4af7-b5d0-38c57024df4f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":5,"target_disposition_id":"6c9fa436-fbb4-4af7-b5d0-38c57024df4f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6cfeb89a-51be-4f4e-bc7e-35487b765566'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":6,"target_disposition_id":"6cfeb89a-51be-4f4e-bc7e-35487b765566","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6d33b35c-80b8-4c27-b266-1fcb00148083'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":7,"target_disposition_id":"6d33b35c-80b8-4c27-b266-1fcb00148083","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6da2b879-7ef3-4692-9626-59211ec5b097'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":8,"target_disposition_id":"6da2b879-7ef3-4692-9626-59211ec5b097","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6db24e29-fbb6-484d-9212-372a934390bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":9,"target_disposition_id":"6db24e29-fbb6-484d-9212-372a934390bb","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6ea28200-40ef-485e-aae5-755fc6d2579e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":10,"target_disposition_id":"6ea28200-40ef-485e-aae5-755fc6d2579e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6ea34525-3a37-4a81-98f2-6a954f76205c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":11,"target_disposition_id":"6ea34525-3a37-4a81-98f2-6a954f76205c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f19d319-1cde-4007-b2fa-46c3765cdade'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":12,"target_disposition_id":"6f19d319-1cde-4007-b2fa-46c3765cdade","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f3b6fbf-fc27-4f97-87cc-70d6b3d11060'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":13,"target_disposition_id":"6f3b6fbf-fc27-4f97-87cc-70d6b3d11060","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '70c5e254-7971-49fb-b01b-8e28331c8fe6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":14,"target_disposition_id":"70c5e254-7971-49fb-b01b-8e28331c8fe6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7129e2d3-715f-4baa-968b-3ef392d68299'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":15,"target_disposition_id":"7129e2d3-715f-4baa-968b-3ef392d68299","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '716ae20b-73f1-47d4-876a-a176d8019be5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":16,"target_disposition_id":"716ae20b-73f1-47d4-876a-a176d8019be5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '724c02d1-d46a-4c1e-bb00-c65eab371528'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":17,"target_disposition_id":"724c02d1-d46a-4c1e-bb00-c65eab371528","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7297df34-00e7-4b0a-b389-008e7f762782'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":18,"target_disposition_id":"7297df34-00e7-4b0a-b389-008e7f762782","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7333020d-57a7-45d3-8089-1419ce2c6477'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":19,"target_disposition_id":"7333020d-57a7-45d3-8089-1419ce2c6477","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '741d65c9-593b-4595-bdfa-c4b0cfb7fe8b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":20,"target_disposition_id":"741d65c9-593b-4595-bdfa-c4b0cfb7fe8b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '742c61ed-5b3e-4857-bd39-fa0a9a60a57f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":21,"target_disposition_id":"742c61ed-5b3e-4857-bd39-fa0a9a60a57f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '74d72ff4-9c11-4e1b-9298-d809bffcf98e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":22,"target_disposition_id":"74d72ff4-9c11-4e1b-9298-d809bffcf98e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75061718-ee23-4f9b-8d2c-05d297af0fc4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":23,"target_disposition_id":"75061718-ee23-4f9b-8d2c-05d297af0fc4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75f3f658-0cca-4fb3-8aea-ebe24a275b8a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":24,"target_disposition_id":"75f3f658-0cca-4fb3-8aea-ebe24a275b8a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '76f49992-70b6-48b1-a3e6-1520a06f15d3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":25,"target_disposition_id":"76f49992-70b6-48b1-a3e6-1520a06f15d3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '771feefe-0578-44d2-846b-db939a8a124e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":26,"target_disposition_id":"771feefe-0578-44d2-846b-db939a8a124e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '777941b5-85ff-414c-9cb8-3fdd2dd07e52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":27,"target_disposition_id":"777941b5-85ff-414c-9cb8-3fdd2dd07e52","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7780f888-2c3b-4803-854b-b31bdf1b6dc0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":28,"target_disposition_id":"7780f888-2c3b-4803-854b-b31bdf1b6dc0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '778f0d8a-4c97-4ad8-87f8-d32a9e7616dc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":29,"target_disposition_id":"778f0d8a-4c97-4ad8-87f8-d32a9e7616dc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78a5742d-0a19-4d5b-bb4b-8ef8111c06be'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":30,"target_disposition_id":"78a5742d-0a19-4d5b-bb4b-8ef8111c06be","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78c6e389-62f5-4d7f-95a5-4e2645c15c9a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":31,"target_disposition_id":"78c6e389-62f5-4d7f-95a5-4e2645c15c9a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7940da10-930a-49a7-9995-15ddb306f445'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":32,"target_disposition_id":"7940da10-930a-49a7-9995-15ddb306f445","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '797143ad-4061-4bfb-8537-f874535772ba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":33,"target_disposition_id":"797143ad-4061-4bfb-8537-f874535772ba","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b3b6e29-97fa-461d-8477-52b710c632f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":34,"target_disposition_id":"7b3b6e29-97fa-461d-8477-52b710c632f3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b5543c5-5fce-4ac3-a931-69c250a99485'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":35,"target_disposition_id":"7b5543c5-5fce-4ac3-a931-69c250a99485","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b7657a9-3b7d-4f30-a05c-dc24c0cc8e94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":36,"target_disposition_id":"7b7657a9-3b7d-4f30-a05c-dc24c0cc8e94","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7cb9d2aa-36e8-41bd-a0bf-f2ffd63acefd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":37,"target_disposition_id":"7cb9d2aa-36e8-41bd-a0bf-f2ffd63acefd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d29aa44-539e-41d3-a7cb-0a1a09fdae6c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":38,"target_disposition_id":"7d29aa44-539e-41d3-a7cb-0a1a09fdae6c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d346c2a-da67-43fa-8a1a-7eebdc4fb056'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":39,"target_disposition_id":"7d346c2a-da67-43fa-8a1a-7eebdc4fb056","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d418d5b-0bf0-482b-bbe6-d28e65dcac86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":40,"target_disposition_id":"7d418d5b-0bf0-482b-bbe6-d28e65dcac86","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e03a4bf-2d02-4930-bf49-61a4a85b6f0f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":41,"target_disposition_id":"7e03a4bf-2d02-4930-bf49-61a4a85b6f0f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e81a797-d4d5-4f1f-a1b7-25cd27813410'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":42,"target_disposition_id":"7e81a797-d4d5-4f1f-a1b7-25cd27813410","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e9c1b49-8d13-4ad1-8d26-04204611b8aa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":43,"target_disposition_id":"7e9c1b49-8d13-4ad1-8d26-04204611b8aa","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '80b310b0-c6e5-4a38-9f63-39bd020efa1c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":44,"target_disposition_id":"80b310b0-c6e5-4a38-9f63-39bd020efa1c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '81069cd1-5e32-4e5b-ae05-17ebbdaaf787'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":45,"target_disposition_id":"81069cd1-5e32-4e5b-ae05-17ebbdaaf787","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '822e528c-637a-4932-bbf9-9eab8175267c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":46,"target_disposition_id":"822e528c-637a-4932-bbf9-9eab8175267c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '824828d6-7de1-41a7-93c1-a241c427134e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":47,"target_disposition_id":"824828d6-7de1-41a7-93c1-a241c427134e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83088a7b-96aa-4d45-b387-470b61baa4ec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":48,"target_disposition_id":"83088a7b-96aa-4d45-b387-470b61baa4ec","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83626169-12ae-4562-9851-c5f672b089bd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":49,"target_disposition_id":"83626169-12ae-4562-9851-c5f672b089bd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '844acfdd-bb84-4738-a2fa-2aa73abd7805'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":50,"target_disposition_id":"844acfdd-bb84-4738-a2fa-2aa73abd7805","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '84905371-41be-4715-b7ab-f702ae3c98db'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":51,"target_disposition_id":"84905371-41be-4715-b7ab-f702ae3c98db","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '854901a9-1a4c-4d2b-8292-0e77ceaac984'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":52,"target_disposition_id":"854901a9-1a4c-4d2b-8292-0e77ceaac984","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8657ff41-a1ca-40b0-bc1e-ddeb499c6481'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":53,"target_disposition_id":"8657ff41-a1ca-40b0-bc1e-ddeb499c6481","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87a86e0e-6d37-4ec4-aaef-85773b4ac67b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":54,"target_disposition_id":"87a86e0e-6d37-4ec4-aaef-85773b4ac67b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '881eebe1-975c-4e1b-bc09-1436dbde931c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":55,"target_disposition_id":"881eebe1-975c-4e1b-bc09-1436dbde931c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '899ad16b-2658-40ea-a6dc-627b0a89c931'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":56,"target_disposition_id":"899ad16b-2658-40ea-a6dc-627b0a89c931","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8a666f38-6ff5-42ae-a1da-277dc988d5f2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":57,"target_disposition_id":"8a666f38-6ff5-42ae-a1da-277dc988d5f2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8ab8b023-c60e-496b-872e-4df9abdd4a75'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":58,"target_disposition_id":"8ab8b023-c60e-496b-872e-4df9abdd4a75","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c5febca-1f77-48d1-a660-259c2fd5b3a1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":59,"target_disposition_id":"8c5febca-1f77-48d1-a660-259c2fd5b3a1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c760cc2-f35c-4b76-89e7-0eac7352eaa8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":60,"target_disposition_id":"8c760cc2-f35c-4b76-89e7-0eac7352eaa8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d3bab13-ea31-4316-a660-28b650236a4a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":61,"target_disposition_id":"8d3bab13-ea31-4316-a660-28b650236a4a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d4fd3e3-2057-4ad7-bf65-36901b8ee7c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":62,"target_disposition_id":"8d4fd3e3-2057-4ad7-bf65-36901b8ee7c0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8e1a572c-51fa-4b96-b166-af38f4b35958'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":63,"target_disposition_id":"8e1a572c-51fa-4b96-b166-af38f4b35958","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8e5e1357-10dc-43d8-9339-9bc35a6855b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":64,"target_disposition_id":"8e5e1357-10dc-43d8-9339-9bc35a6855b3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8f15605a-35eb-4b44-9143-8c222ecca34c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":65,"target_disposition_id":"8f15605a-35eb-4b44-9143-8c222ecca34c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8f61b3d0-c686-4436-a230-dc29f75c54f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":66,"target_disposition_id":"8f61b3d0-c686-4436-a230-dc29f75c54f3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '905c0f84-5da5-44de-bc3c-7f60dc9ff8c2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":67,"target_disposition_id":"905c0f84-5da5-44de-bc3c-7f60dc9ff8c2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '90894eb6-8211-4c88-8f71-b2b002f29515'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":68,"target_disposition_id":"90894eb6-8211-4c88-8f71-b2b002f29515","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '91484d97-a5f8-4e9e-bd68-12324cc4f559'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":69,"target_disposition_id":"91484d97-a5f8-4e9e-bd68-12324cc4f559","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9178e5af-7e2d-420e-b57f-c89447f85b7b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":70,"target_disposition_id":"9178e5af-7e2d-420e-b57f-c89447f85b7b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93050f84-2fa4-4db9-94dd-1cde78908352'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":71,"target_disposition_id":"93050f84-2fa4-4db9-94dd-1cde78908352","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '932663b6-3bec-4843-9f74-853d759fcb0c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":72,"target_disposition_id":"932663b6-3bec-4843-9f74-853d759fcb0c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93d559da-daac-44bd-862c-5d5b1abaeafd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":73,"target_disposition_id":"93d559da-daac-44bd-862c-5d5b1abaeafd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93f55868-bb67-4ca1-9704-bb9751920453'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":74,"target_disposition_id":"93f55868-bb67-4ca1-9704-bb9751920453","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '944da5f4-c507-4787-9f5c-9f0b469983dd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":75,"target_disposition_id":"944da5f4-c507-4787-9f5c-9f0b469983dd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '94ed2ab7-2b0c-4ac4-b554-339e67200e52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":76,"target_disposition_id":"94ed2ab7-2b0c-4ac4-b554-339e67200e52","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95425d92-80dc-4274-811e-5718b6bd66a5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":77,"target_disposition_id":"95425d92-80dc-4274-811e-5718b6bd66a5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95c8deb7-d7eb-4579-8f45-6954ba13b4c6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":78,"target_disposition_id":"95c8deb7-d7eb-4579-8f45-6954ba13b4c6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95d7b5c5-90ec-4e47-b212-acd6ce63f1c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":79,"target_disposition_id":"95d7b5c5-90ec-4e47-b212-acd6ce63f1c0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '96346dce-e2d4-482e-949d-7f076b485444'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":80,"target_disposition_id":"96346dce-e2d4-482e-949d-7f076b485444","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9643a978-3b1c-455a-973c-c2a2f5ad435e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":81,"target_disposition_id":"9643a978-3b1c-455a-973c-c2a2f5ad435e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '964e77b5-ca4e-4d74-aca6-a3dca4dd52d2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":82,"target_disposition_id":"964e77b5-ca4e-4d74-aca6-a3dca4dd52d2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9734216b-0608-4581-9f39-964c79b55640'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":83,"target_disposition_id":"9734216b-0608-4581-9f39-964c79b55640","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '98d236ae-f61e-4a57-9cc7-c2293cf057c1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":84,"target_disposition_id":"98d236ae-f61e-4a57-9cc7-c2293cf057c1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99129407-3390-48c0-af14-2661b8524d1d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":85,"target_disposition_id":"99129407-3390-48c0-af14-2661b8524d1d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99b57542-bd0e-4af3-8f26-4115d3e555ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":86,"target_disposition_id":"99b57542-bd0e-4af3-8f26-4115d3e555ac","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99cfcdd1-7a1c-4e30-86c9-6aad513e1e55'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":87,"target_disposition_id":"99cfcdd1-7a1c-4e30-86c9-6aad513e1e55","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9a9df345-5dff-4287-8f3b-de1cf90b3148'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":88,"target_disposition_id":"9a9df345-5dff-4287-8f3b-de1cf90b3148","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c7dd069-4aa1-4a5a-88dd-1002af2405c7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":89,"target_disposition_id":"9c7dd069-4aa1-4a5a-88dd-1002af2405c7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c9e12f0-321e-4d1c-b926-e8b9f8dd1d8f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":90,"target_disposition_id":"9c9e12f0-321e-4d1c-b926-e8b9f8dd1d8f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c9ea6a7-956a-45e2-8684-17bb13eb5d25'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":91,"target_disposition_id":"9c9ea6a7-956a-45e2-8684-17bb13eb5d25","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9cefb262-a0a0-4207-84d0-dac381b29136'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":92,"target_disposition_id":"9cefb262-a0a0-4207-84d0-dac381b29136","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9d064f4a-b7a4-43dc-a7ae-666516016ff9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":93,"target_disposition_id":"9d064f4a-b7a4-43dc-a7ae-666516016ff9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e566b47-b128-4829-be12-12db17cf6a6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":94,"target_disposition_id":"9e566b47-b128-4829-be12-12db17cf6a6e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9f8f46c0-8bd8-40b0-9db4-ad2385e627eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":95,"target_disposition_id":"9f8f46c0-8bd8-40b0-9db4-ad2385e627eb","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fca4e94-2e40-4cea-866d-e1d92f0522e9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":96,"target_disposition_id":"9fca4e94-2e40-4cea-866d-e1d92f0522e9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fdd3749-41e2-463a-a5f0-b10532868b96'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":97,"target_disposition_id":"9fdd3749-41e2-463a-a5f0-b10532868b96","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a1a745da-839f-4063-b862-8f3cee6f2bf1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":98,"target_disposition_id":"a1a745da-839f-4063-b862-8f3cee6f2bf1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a293b1f7-5082-4905-b9ee-186070e43684'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":99,"target_disposition_id":"a293b1f7-5082-4905-b9ee-186070e43684","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a32dcac7-76d4-497d-a425-c095858891e1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":100,"target_disposition_id":"a32dcac7-76d4-497d-a425-c095858891e1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a3663f66-1ab1-44b2-b529-b07ce8ceb6e2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":101,"target_disposition_id":"a3663f66-1ab1-44b2-b529-b07ce8ceb6e2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a38c9f36-2a58-4d02-8329-848e8e9dd725'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":102,"target_disposition_id":"a38c9f36-2a58-4d02-8329-848e8e9dd725","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a48fa302-f44a-4ab4-bfbd-75dbeac9f377'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":103,"target_disposition_id":"a48fa302-f44a-4ab4-bfbd-75dbeac9f377","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a638656a-f310-4e90-ba27-2da376606b55'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":104,"target_disposition_id":"a638656a-f310-4e90-ba27-2da376606b55","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a7c265aa-2647-476c-af6b-8424d9f1c647'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":105,"target_disposition_id":"a7c265aa-2647-476c-af6b-8424d9f1c647","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a818ff29-0f21-4dd2-bab2-a0fc26b707e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":106,"target_disposition_id":"a818ff29-0f21-4dd2-bab2-a0fc26b707e7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a8983cd2-055a-4950-b9b1-805a23aacc7e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":107,"target_disposition_id":"a8983cd2-055a-4950-b9b1-805a23aacc7e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a89bbbc7-37ff-4ffd-ac6f-0285c391d019'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":108,"target_disposition_id":"a89bbbc7-37ff-4ffd-ac6f-0285c391d019","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a93bb5a1-be0a-44f7-a9ce-8c17e17bf1f1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":109,"target_disposition_id":"a93bb5a1-be0a-44f7-a9ce-8c17e17bf1f1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aa6e8091-e823-4a93-ba9e-3cc8a2bd858b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":110,"target_disposition_id":"aa6e8091-e823-4a93-ba9e-3cc8a2bd858b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'abca88e9-7f0f-47d3-a3a9-b1f9600cfb7a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":111,"target_disposition_id":"abca88e9-7f0f-47d3-a3a9-b1f9600cfb7a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ad9f52ea-8dcf-4507-a234-8706f0aeb9ce'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":112,"target_disposition_id":"ad9f52ea-8dcf-4507-a234-8706f0aeb9ce","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ada1a73e-46f9-41d4-94e8-2228f7b2ef66'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":113,"target_disposition_id":"ada1a73e-46f9-41d4-94e8-2228f7b2ef66","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'addf0dcc-8db8-4212-b14c-d652b66c177c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":114,"target_disposition_id":"addf0dcc-8db8-4212-b14c-d652b66c177c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ae3b05c3-063f-4ef7-9642-628f799c5c9c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":115,"target_disposition_id":"ae3b05c3-063f-4ef7-9642-628f799c5c9c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aeeaaa2d-973a-4e10-9407-9b6cc5309103'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":116,"target_disposition_id":"aeeaaa2d-973a-4e10-9407-9b6cc5309103","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'af166c11-346f-443c-9382-2c7a94e06a19'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":117,"target_disposition_id":"af166c11-346f-443c-9382-2c7a94e06a19","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b13af443-21dc-441d-a193-f3ca92502a12'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":118,"target_disposition_id":"b13af443-21dc-441d-a193-f3ca92502a12","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b229f8e4-8ec3-4624-8c21-0ef8a2f0cdee'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":119,"target_disposition_id":"b229f8e4-8ec3-4624-8c21-0ef8a2f0cdee","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b24aa67f-ae2a-4d17-b44c-3ee8a5328d98'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":120,"target_disposition_id":"b24aa67f-ae2a-4d17-b44c-3ee8a5328d98","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b54c7939-3355-46d3-9b0e-2ae4fad5c5a5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":121,"target_disposition_id":"b54c7939-3355-46d3-9b0e-2ae4fad5c5a5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b6a09187-5930-4803-a802-dff5550894be'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":122,"target_disposition_id":"b6a09187-5930-4803-a802-dff5550894be","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b7d991d9-c7a8-49dd-972f-928905a87cc1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":123,"target_disposition_id":"b7d991d9-c7a8-49dd-972f-928905a87cc1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b972e80d-ec0c-4980-b85b-c02152946783'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":124,"target_disposition_id":"b972e80d-ec0c-4980-b85b-c02152946783","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b9e05047-1689-4130-828d-e3c899b5214d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":125,"target_disposition_id":"b9e05047-1689-4130-828d-e3c899b5214d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bbea1a46-e28c-4228-8475-e1abf54a009a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":126,"target_disposition_id":"bbea1a46-e28c-4228-8475-e1abf54a009a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bc0feb76-f544-4a19-8ff8-099cc8896bff'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":127,"target_disposition_id":"bc0feb76-f544-4a19-8ff8-099cc8896bff","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bcd2fb5d-7d5c-4b2f-a489-0c0f409a1468'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":128,"target_disposition_id":"bcd2fb5d-7d5c-4b2f-a489-0c0f409a1468","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bcd9283d-6076-4370-91ed-194eae2224b7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":129,"target_disposition_id":"bcd9283d-6076-4370-91ed-194eae2224b7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'be207fa3-74a0-4459-8bcf-6e6b7e5c0c46'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":130,"target_disposition_id":"be207fa3-74a0-4459-8bcf-6e6b7e5c0c46","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bed608db-553e-4f21-b789-3cdf9896e973'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":131,"target_disposition_id":"bed608db-553e-4f21-b789-3cdf9896e973","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bf9b5a8c-0c2c-4d54-bce9-15a8a74f6077'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":132,"target_disposition_id":"bf9b5a8c-0c2c-4d54-bce9-15a8a74f6077","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0a7384b-81c8-4ba5-8051-f0934a9bfb6f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":133,"target_disposition_id":"c0a7384b-81c8-4ba5-8051-f0934a9bfb6f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0ee2cec-ed85-4090-910e-7e9c805aed05'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":134,"target_disposition_id":"c0ee2cec-ed85-4090-910e-7e9c805aed05","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0f7a609-8a32-4ddd-918a-35b9c07cbc5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":135,"target_disposition_id":"c0f7a609-8a32-4ddd-918a-35b9c07cbc5b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2381df8-e0ee-43d4-b955-1e31b5cde46c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":136,"target_disposition_id":"c2381df8-e0ee-43d4-b955-1e31b5cde46c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2dd7297-e72b-4434-8848-4cb891c1fa63'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":137,"target_disposition_id":"c2dd7297-e72b-4434-8848-4cb891c1fa63","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c4065fbe-9ce3-43f2-a9c8-2d5c17719c54'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":138,"target_disposition_id":"c4065fbe-9ce3-43f2-a9c8-2d5c17719c54","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c41ee7ca-66d0-4cb8-988b-19d1f4af18c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":139,"target_disposition_id":"c41ee7ca-66d0-4cb8-988b-19d1f4af18c8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c468d8fe-16b6-4df1-a80c-42b1914c98ce'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":140,"target_disposition_id":"c468d8fe-16b6-4df1-a80c-42b1914c98ce","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c4894c6b-df88-41ce-a26a-91fc27632242'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":141,"target_disposition_id":"c4894c6b-df88-41ce-a26a-91fc27632242","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c6eb4e79-ccef-4b4e-b5a7-c3799ea53b08'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":142,"target_disposition_id":"c6eb4e79-ccef-4b4e-b5a7-c3799ea53b08","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c72945be-15a0-4546-bc5c-a89bb2e33790'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":143,"target_disposition_id":"c72945be-15a0-4546-bc5c-a89bb2e33790","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c838a7c7-82a5-42e4-9477-208463037778'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":144,"target_disposition_id":"c838a7c7-82a5-42e4-9477-208463037778","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c8b7dac5-f73b-4ffc-9df6-5c1db18febed'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":145,"target_disposition_id":"c8b7dac5-f73b-4ffc-9df6-5c1db18febed","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c9be5ed3-9e24-489e-84ee-3381632242d0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":146,"target_disposition_id":"c9be5ed3-9e24-489e-84ee-3381632242d0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c9df6b1f-2967-4631-aa61-19d523e7fd25'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":147,"target_disposition_id":"c9df6b1f-2967-4631-aa61-19d523e7fd25","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c9e0dd55-35ff-49e4-a4c4-961c10104ded'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":148,"target_disposition_id":"c9e0dd55-35ff-49e4-a4c4-961c10104ded","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ca3aceb7-5039-47c2-ab32-65c61c3069bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":149,"target_disposition_id":"ca3aceb7-5039-47c2-ab32-65c61c3069bc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cae80313-939a-450a-afeb-6c6c4579eefc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":150,"target_disposition_id":"cae80313-939a-450a-afeb-6c6c4579eefc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ccc63e93-2e81-4429-b2da-104bde7e34e6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":151,"target_disposition_id":"ccc63e93-2e81-4429-b2da-104bde7e34e6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ccdddb2c-1f0e-43c9-8b21-6f3521fcf1f2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":152,"target_disposition_id":"ccdddb2c-1f0e-43c9-8b21-6f3521fcf1f2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cd0e3389-bfdf-4ae5-aac3-0563a24a6bb3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":153,"target_disposition_id":"cd0e3389-bfdf-4ae5-aac3-0563a24a6bb3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ce010ed7-43f2-4579-b18b-5546f0cb006b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":154,"target_disposition_id":"ce010ed7-43f2-4579-b18b-5546f0cb006b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cf7f3c88-03df-489b-bf77-9e674b333a10'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":155,"target_disposition_id":"cf7f3c88-03df-489b-bf77-9e674b333a10","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cf90e0c1-0f26-4a9c-bf61-7d8efe5d308b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":156,"target_disposition_id":"cf90e0c1-0f26-4a9c-bf61-7d8efe5d308b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd23daf04-f570-4ac5-b00a-27c1ccfa150d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":157,"target_disposition_id":"d23daf04-f570-4ac5-b00a-27c1ccfa150d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd2e25e6f-586b-4712-bd6f-c416d2efd431'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":158,"target_disposition_id":"d2e25e6f-586b-4712-bd6f-c416d2efd431","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd39d0c78-9be6-4b76-956e-ab862c131822'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":159,"target_disposition_id":"d39d0c78-9be6-4b76-956e-ab862c131822","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd3a433a9-543c-45a0-9ee2-17a7ae9ca998'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":160,"target_disposition_id":"d3a433a9-543c-45a0-9ee2-17a7ae9ca998","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd3e50ab0-3309-4a9d-9e00-dde4f1eafce0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":161,"target_disposition_id":"d3e50ab0-3309-4a9d-9e00-dde4f1eafce0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd67d3aa6-89cd-43e6-9893-3c3ea2cfc04f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":162,"target_disposition_id":"d67d3aa6-89cd-43e6-9893-3c3ea2cfc04f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd7038087-15b2-40b7-baca-397e74c9cd38'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":163,"target_disposition_id":"d7038087-15b2-40b7-baca-397e74c9cd38","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd7279cd1-a850-4b57-9443-5e55e51dec20'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":164,"target_disposition_id":"d7279cd1-a850-4b57-9443-5e55e51dec20","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8e060c4-1162-4eab-b1dc-79bfe77241cd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":165,"target_disposition_id":"d8e060c4-1162-4eab-b1dc-79bfe77241cd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8f5dd85-ac16-415e-a0b3-2430196065ee'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":166,"target_disposition_id":"d8f5dd85-ac16-415e-a0b3-2430196065ee","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd912c2ee-2d94-41b7-a4b9-aa31e104e7d1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":167,"target_disposition_id":"d912c2ee-2d94-41b7-a4b9-aa31e104e7d1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9c9823c-452e-4c33-ab90-b0b281267bb4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":168,"target_disposition_id":"d9c9823c-452e-4c33-ab90-b0b281267bb4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9d7a456-3e7f-4548-8c3f-5190cf6a0a72'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":169,"target_disposition_id":"d9d7a456-3e7f-4548-8c3f-5190cf6a0a72","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'daed2b78-84f5-449c-b7d3-ff208536183d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":170,"target_disposition_id":"daed2b78-84f5-449c-b7d3-ff208536183d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dbbfb8b4-fc58-4650-bf5e-639907b7fbd3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":171,"target_disposition_id":"dbbfb8b4-fc58-4650-bf5e-639907b7fbd3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dbcb399e-424b-4c17-afd9-0302d6efca5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":172,"target_disposition_id":"dbcb399e-424b-4c17-afd9-0302d6efca5b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd1a2ba0-c859-44af-aaad-356c13e7e2e0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":173,"target_disposition_id":"dd1a2ba0-c859-44af-aaad-356c13e7e2e0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd4965f1-143d-41d5-9184-c52bcf2a021b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":174,"target_disposition_id":"dd4965f1-143d-41d5-9184-c52bcf2a021b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd815796-69e6-405d-86f0-cb5a0d52f2bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":175,"target_disposition_id":"dd815796-69e6-405d-86f0-cb5a0d52f2bc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'de361018-a604-4122-b57e-b46894d97b5d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":176,"target_disposition_id":"de361018-a604-4122-b57e-b46894d97b5d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'df8b89d4-05e8-4087-8b5a-30d8fbc0e906'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":177,"target_disposition_id":"df8b89d4-05e8-4087-8b5a-30d8fbc0e906","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dfd8a4c0-7457-403b-aa80-6a8a3585da05'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":178,"target_disposition_id":"dfd8a4c0-7457-403b-aa80-6a8a3585da05","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e08a45c5-0ada-4431-96ed-8df21dd600a1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":179,"target_disposition_id":"e08a45c5-0ada-4431-96ed-8df21dd600a1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e21b53c2-8029-465b-b106-39de55780730'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":180,"target_disposition_id":"e21b53c2-8029-465b-b106-39de55780730","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e4651b0b-d445-4395-95ef-422062b855ff'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":181,"target_disposition_id":"e4651b0b-d445-4395-95ef-422062b855ff","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e470f532-0803-41a3-b933-6909e84e5c58'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":182,"target_disposition_id":"e470f532-0803-41a3-b933-6909e84e5c58","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e48ed79e-ce3f-4842-b228-fd51aba222c1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":183,"target_disposition_id":"e48ed79e-ce3f-4842-b228-fd51aba222c1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e4e5292c-b02e-4e42-8bc9-320fe9c03df3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":184,"target_disposition_id":"e4e5292c-b02e-4e42-8bc9-320fe9c03df3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e71e68b9-4a5b-4456-aa5c-6a1785b66a9b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":185,"target_disposition_id":"e71e68b9-4a5b-4456-aa5c-6a1785b66a9b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e9f3bdf8-adf8-483e-a73d-abab26bb1099'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":186,"target_disposition_id":"e9f3bdf8-adf8-483e-a73d-abab26bb1099","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e9f692e7-112e-4f8f-b0a3-50c4473fc527'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":187,"target_disposition_id":"e9f692e7-112e-4f8f-b0a3-50c4473fc527","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ea61d2b3-b476-4357-a505-2e5151f75b47'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":188,"target_disposition_id":"ea61d2b3-b476-4357-a505-2e5151f75b47","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ead8ef3f-02ac-443d-84f8-6eba9556a405'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":189,"target_disposition_id":"ead8ef3f-02ac-443d-84f8-6eba9556a405","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eae7543b-21a2-4869-9b4a-7c75c6af3a8d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":190,"target_disposition_id":"eae7543b-21a2-4869-9b4a-7c75c6af3a8d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ebbe527c-3725-4301-9458-d7778587bdb8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":191,"target_disposition_id":"ebbe527c-3725-4301-9458-d7778587bdb8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ebe3e00b-53c2-4da3-bd8e-69b895e03e2c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":192,"target_disposition_id":"ebe3e00b-53c2-4da3-bd8e-69b895e03e2c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ec408b1a-3283-470f-974e-fcb205729962'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":193,"target_disposition_id":"ec408b1a-3283-470f-974e-fcb205729962","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ec659e83-d777-4ef0-a80d-4d9efb83ac3e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":194,"target_disposition_id":"ec659e83-d777-4ef0-a80d-4d9efb83ac3e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eea998ef-de68-46a0-86ec-1b1553a9cb7b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":195,"target_disposition_id":"eea998ef-de68-46a0-86ec-1b1553a9cb7b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ef974b78-45f6-4b6d-b44c-533c29944a15'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":196,"target_disposition_id":"ef974b78-45f6-4b6d-b44c-533c29944a15","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'efcfe74f-528c-4003-86cf-7cf8fe5a01c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":197,"target_disposition_id":"efcfe74f-528c-4003-86cf-7cf8fe5a01c5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f04656cd-7fc5-4975-be25-575c04777a29'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":198,"target_disposition_id":"f04656cd-7fc5-4975-be25-575c04777a29","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f2480497-c76e-4d77-a0b4-281d79ef383c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":199,"target_disposition_id":"f2480497-c76e-4d77-a0b4-281d79ef383c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f3c25d44-4bfa-4162-b411-53c9b8e23993'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":200,"target_disposition_id":"f3c25d44-4bfa-4162-b411-53c9b8e23993","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f434b3f6-878b-459a-9f96-1c5c4dc3bf59'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":201,"target_disposition_id":"f434b3f6-878b-459a-9f96-1c5c4dc3bf59","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f454344a-118c-4e2a-b2a6-48ea00300183'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":202,"target_disposition_id":"f454344a-118c-4e2a-b2a6-48ea00300183","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f4706042-4d90-448f-8615-9b58a753f98c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":203,"target_disposition_id":"f4706042-4d90-448f-8615-9b58a753f98c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f48d6823-7beb-49ca-896f-a41e86d574b7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":204,"target_disposition_id":"f48d6823-7beb-49ca-896f-a41e86d574b7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f5b2100d-2c3e-490b-bac4-4782b2f9825d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":205,"target_disposition_id":"f5b2100d-2c3e-490b-bac4-4782b2f9825d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f7192aa6-bf0e-4b73-8b16-e73672184846'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":206,"target_disposition_id":"f7192aa6-bf0e-4b73-8b16-e73672184846","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f82b8c1e-d740-4630-9293-fe1813d1a63f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":207,"target_disposition_id":"f82b8c1e-d740-4630-9293-fe1813d1a63f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f94e8f65-093b-4a58-a1ec-ca9da079bacf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":208,"target_disposition_id":"f94e8f65-093b-4a58-a1ec-ca9da079bacf","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f9b60317-83bb-457a-a16e-3b337d6f7de8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":209,"target_disposition_id":"f9b60317-83bb-457a-a16e-3b337d6f7de8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fa1ead9a-6005-4032-aa91-60907a5cee46'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":210,"target_disposition_id":"fa1ead9a-6005-4032-aa91-60907a5cee46","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fa539df5-a771-4085-9a03-2813cd0b91fe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":211,"target_disposition_id":"fa539df5-a771-4085-9a03-2813cd0b91fe","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'faaa4fe2-031e-471a-9fc4-be3a3f296272'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":212,"target_disposition_id":"faaa4fe2-031e-471a-9fc4-be3a3f296272","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fc26c278-ec06-46a7-bacc-928bd6b600ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":213,"target_disposition_id":"fc26c278-ec06-46a7-bacc-928bd6b600ac","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fc79b6ad-ac4f-427f-9842-82b9a39bc622'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":214,"target_disposition_id":"fc79b6ad-ac4f-427f-9842-82b9a39bc622","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fcffb8b9-bdd1-4ed1-9c9a-d92f33263c8b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":215,"target_disposition_id":"fcffb8b9-bdd1-4ed1-9c9a-d92f33263c8b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fd94be4f-05b6-4ded-87cd-c48d02a79590'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":216,"target_disposition_id":"fd94be4f-05b6-4ded-87cd-c48d02a79590","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fda75f92-8e21-408e-8e46-90cfde1e213e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":217,"target_disposition_id":"fda75f92-8e21-408e-8e46-90cfde1e213e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'feccf896-d636-4988-a5fe-405a1820ec3e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":218,"target_disposition_id":"feccf896-d636-4988-a5fe-405a1820ec3e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ff28ae88-c34c-4b28-8ed0-00474696ac88'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_remaining_drain_plan'::text,
  null::text,
  'MEE core remaining low_signal_monitor drain proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1","row_manifest_sha256":"c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050","batch_index":219,"target_disposition_id":"ff28ae88-c34c-4b28-8ed0-00474696ac88","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

commit;
