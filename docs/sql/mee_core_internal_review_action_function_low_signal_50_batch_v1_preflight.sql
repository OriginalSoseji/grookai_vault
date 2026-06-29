-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_50_BATCH_PLAN_V1 preflight SQL.
-- Must return eligible_target_rows = 50 before apply.

with targets(id, expected_updated_at) as (
  values
    ('069f3ead-ed73-44fa-bd76-f3df572c3a25'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('06c018f5-148f-44ac-a31d-680d6f7c42df'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0776b7a0-6f1f-4316-8743-f042c7846015'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('07c1ca57-5e8a-440c-961e-53aaa12f5eaa'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('08360fba-56f8-4922-8a62-3d3a6ee0c1a8'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('09b3828a-fb8c-4c71-bde5-836216bc1e9c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0a1df128-1636-4eaa-8bfb-a2480c7249c4'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0a768b7d-5f9d-42af-a623-bcab7e9cc645'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0c35945e-6074-4ff5-b2b6-ea45b99aaa19'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0d2f0d9e-2f8d-4173-acb1-462e5e4aebd4'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0dca73b5-5772-4432-a37e-f7fce081d630'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0f4860f9-f165-4ad4-9961-0f6fbf32657c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('10555b27-9fa4-49cd-a822-c245375b07c1'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('10bf1f40-ffd9-43f5-a214-f9d1a1a1b7bd'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('120f68c0-f56e-4b0e-825b-834ab3dcd62d'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('12744ad0-d620-4230-9b3a-f7cf3a6c6416'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('136e15ce-a486-4d6c-9c5f-d7f68f021208'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('148a08de-148e-4cf8-831e-dae4ae394bac'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('15286a8f-3fe8-41cc-8f95-9f52bccdb899'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('15a197ef-6bd2-4085-97a2-9bd5418b2f8b'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('16359d80-f313-4c82-83c8-9c84f310ec8b'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('16b253c9-1cb5-45c0-a6de-ba3d18ecf47f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1767e70b-a0d4-4b5f-a19d-a43fa89245dd'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('17cc3d55-3a9a-447a-a966-cdef06590eb4'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('180eee59-37fb-4d34-b54c-098db4243f6f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('18411a76-53ba-41cf-81c8-0af3c85f6663'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('18ac6861-6f34-48d5-afe7-a9d1fd370a8d'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('190c0904-111e-4c43-8736-a9e5a860b78f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1a53f4e1-184d-45ce-a572-f4d70e63dc5c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1aaf59f9-e1e1-445f-8695-9b777935289c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1ac56c05-c931-4e53-b786-92fd510efe56'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1b06b5e6-e161-4b97-850b-2e80c49cc6f6'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1b33e9bc-85fa-4b6e-937f-7530d20d16c1'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1d06584b-d5be-4808-b7a5-71d4e76176e1'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1da7aee9-87f4-4733-8ce3-eac4a39d024c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1daa93fc-789a-4d0a-8cee-bf24279a5150'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1deeb841-3e71-42c9-9728-1252ded71f5d'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1e2909f6-e5ec-4845-8c4a-5c31afeb7127'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1e2ada77-b845-4e24-80bf-4ccf611703ba'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('2012bfb0-39ee-48de-8b43-96de43edc609'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('205a451f-2191-4603-9865-a5ec9e0ee6bf'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('20925f3f-32b2-4833-848b-01af35024e25'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('21c63b89-ef53-4e79-bf22-3d223a52bd52'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('226adce1-580b-4dec-8382-c3d8a6a8cd28'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('229cfee4-76ec-427b-a341-0c213fdc1ccd'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('22be3fb7-b508-4a1a-af15-02e6e69c9230'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('22fce1b7-a910-416a-aa2e-6190ce599d2e'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('23013411-3d5d-4e82-bbe6-ddc0c0e612b2'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('243c0f39-60a2-4a13-bb2a-bf361c2c5d99'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('24dddb1c-3d95-40a0-92de-c6e3870af11f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz)
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_50_BATCH_PLAN_V1_PREFLIGHT'::text as package_id,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
where d.review_lane = 'low_signal_monitor'
  and d.review_status = 'resolved'
  and d.review_disposition = 'monitor_only'
  and d.needs_review = true
  and d.publication_gate_candidate = false
  and d.can_publish_price_directly = false
  and d.publishable = false
  and d.app_visible = false
  and d.market_truth = false
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_name = 'confirm_monitor_only'
  );
