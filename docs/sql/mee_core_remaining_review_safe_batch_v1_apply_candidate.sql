-- MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: one safe internal remaining-review cleanup batch only.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '8fdcb18c-4b0f-416b-b275-d65d6456d0b2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":1,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '51175b84-0830-4afe-b724-784a3219f8a4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":2,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '86f99129-2e45-4f47-88ed-235b8a43b2f7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":3,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '68463cc2-2b88-42a3-ba24-4304ef6bbd7f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":4,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bb1eba75-4efd-4b2d-8602-b66e622030ab'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":5,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '94dc8353-cdd3-4284-b742-4b47209956a4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":6,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3aa86132-2e5e-4cf3-b29d-ae2d31d2d96c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":7,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0b74b1d9-a24c-48e4-95e2-ac54f93006ba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":8,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '42467bc1-4a93-40a5-bed8-ef0faa75dccf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":9,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4bdc0132-4556-4b45-8f79-94da20692f5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":10,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '669d4353-2834-4557-8d80-ae734cb81a9d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":11,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92d7e3cd-124c-4f5d-b92a-6dfd425f440a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":12,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9502e9c9-5cad-4879-b0d4-24728e28f881'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":13,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e91314f1-1834-41ef-8809-6d169b19a320'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":14,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6085e554-c158-4bd9-88b7-1f024920623f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":15,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd5250d80-004f-4df6-b74e-af234bd54b61'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":16,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0803c287-1491-4e6d-9f61-687a4e867ce5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":17,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '50103bcd-85fb-4c8b-b334-2e69bd3b4ba0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":18,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8956b2e4-5cc4-4791-839e-dcebb784bbf4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":19,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2a50db93-b372-4544-8a5b-8592dad508e9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":20,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '51cbd91e-5729-4fee-a784-5292ae9c6cd9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":21,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e33922e0-2d25-4a28-9d75-d971c281c61b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":22,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5f010b61-ab5d-444a-84ce-459d883852b6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":23,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '663986bc-7251-4966-8500-b7f00e86cb6c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":24,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fcbfb355-833c-4b29-94c5-190c87f36d8f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":25,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c94c4341-64b3-472a-b18d-3c3c8465f08b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":26,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40cb56ee-611e-4b83-9a7e-d06a1711e65e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":27,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c7a35c16-70b3-40a6-b333-4ecf062ad489'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":28,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'db9d55c9-60ad-48ad-9fb8-ec7e18e52121'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":29,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b4ff0281-9fb5-45ac-995f-276239889774'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":30,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0b7b98fd-2977-49e9-8e91-693b16998b69'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":31,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31d99581-59c6-4715-8b28-5ba0981911c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":32,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a4e218bc-193c-4769-a288-f52836f51f0c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":33,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '22cc67c9-1d1f-4f18-b5ae-8a503d6dfc5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":34,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bc369bfe-a987-4e63-a04a-f582babc7b08'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":35,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '436d6226-a649-4964-85a6-764a917c69aa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":36,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92228247-964d-4120-b94a-7af41d5f566b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":37,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c856046-22ba-4531-8b4d-f72f55a39eaf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":38,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eb449642-1f06-4ce6-bcbd-0ca823d98eb0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":39,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1fe45438-a2da-49bb-b65e-3797667a3894'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":40,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c3baab9-50de-40d2-89ad-5873875848e4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":41,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7944ac4c-aa93-481d-baf6-c5763042c6f0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":42,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '37cc4dba-7d71-424c-8302-c561fe2f485a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":43,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd4282b27-7628-4810-95f7-8dc6122f982e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":44,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4f834955-3c17-4a07-bade-c8ddfaaaa57b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":45,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eea1ae84-e7f4-4111-99f5-3d4491a2d8ba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":46,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'de2d40e8-a298-437c-b83f-19ffd32bb88f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":47,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b89c924f-fccc-4365-9d75-c951d1af2fbf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":48,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3a88578e-b992-46f4-82cb-e0049758ede7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":49,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cf5d4f4f-9f1c-48c2-b6a2-ea32510124c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":50,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '72ae9113-155e-4dd1-a762-11100d2b0674'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":51,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '81e1c91d-3532-4897-9697-8bc77f630512'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":52,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0d9b4799-6dd7-47bd-90c3-cbf003c94163'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":53,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd431f540-d09a-4f1b-b11f-8f3bcf9de328'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":54,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4af3fbae-b758-4427-b70f-cdbcc77a9c7e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":55,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f4ba78b3-fd90-4c97-a08a-f07657654899'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":56,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '622cc172-2c6f-495f-aea7-8b52ed9ca954'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":57,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3a233100-90de-4abe-bbe1-ef3a5fc7575e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":58,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92a418fb-fdfa-44e4-b5f4-82f77375a2cb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":59,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd3bfb201-acec-482a-bb08-d1e3200c5796'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":60,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '72591405-e0e6-449b-b5f7-8a00847f1352'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":61,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fce346a7-def8-49d8-a0cd-a4e9c7bb8560'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":62,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e1a82998-3e50-4a6b-b9d4-3eca34000dc6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":63,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '000f055a-a9e7-494e-b740-8ed062b7c44f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":64,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9768fe65-1899-4098-b1a1-b299b9ace386'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":65,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '20add719-09a6-4952-a0e2-38d763648e83'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":66,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd48adcae-30a0-4240-a8c5-49233496194e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":67,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c28a4790-a7dc-4f20-badf-70812a9cc645'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":68,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0f216665-ff36-417f-be45-6bf594e8972c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":69,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e72071a1-db25-40b5-ab19-1fa3fb74c5c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":70,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b0d8eac8-b9ad-4a0e-8b7a-5e7fd4e52514'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":71,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c42a8a6-904b-4f81-86b3-ae19d2655df6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":72,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '61e0dc9f-5150-43aa-ba34-9d0a24b44e26'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":73,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '18230dde-78b1-4147-bd5e-fe4faf1a2613'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":74,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8309e159-0550-4838-8754-5b283191470a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":75,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '730addcb-8121-44bd-8823-6db5c88e67a1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":76,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '41837aa3-227f-430c-a8b0-6e9daadfd1a0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":77,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dfd28be7-7edb-4102-a6d0-2dcfbc338c72'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":78,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fbfb4269-9b1f-4f4c-bb4c-9b41fad6d43d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":79,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b770c5c1-d8f7-49bd-92d5-efa440471c94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":80,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '049328bc-5951-436f-8e76-5eca81ec3750'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":81,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '005170c4-e49a-4e00-a7a5-63da0dd0d64b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":82,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd436378-03b3-4219-a3ef-a3d3a7b1c262'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":83,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '79c10f26-0720-4056-8c1f-eafc4941764e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":84,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d61f3dd-38aa-450d-a3f8-fd96d3bb5818'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":85,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4241ba4c-e680-4059-ba85-06d5557f5900'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":86,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c2875ea-12cc-43b0-8387-e85ed1b13f4e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":87,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4815fa0f-049d-4472-9142-1e735a09a778'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":88,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4a16214d-689c-4bef-945e-47b0f1539b54'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":89,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c905513-04c7-4618-8f99-cf666258abc7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":90,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87e053fd-0f8f-4755-a67e-18c811a084fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":91,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bbdc212c-13ee-434f-b514-12ba05e081ae'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":92,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2461b874-2022-4775-813c-6f326d2a933c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":93,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'af78e924-9ba9-4580-b075-36d5695ca526'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":94,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '42a3ef55-1367-4ccb-a243-f1024f93a250'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":95,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b6d0cf06-c482-4098-98a1-296d1a5a8cb4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":96,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd4e6255c-8a07-4491-84e3-fdf9a8e6f479'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":97,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fdb3ddc-4f7b-4295-b508-dbda4f115706'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":98,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40dc79ec-c380-4707-935c-5949873796ea'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":99,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c38a7503-4d0a-4076-9970-96297c2430d8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":100,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5b60406b-594a-4c82-af5b-adfdac7240dc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":101,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f5b5740d-83de-49e9-b0c8-36a181b20870'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":102,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '500f3998-11d6-4588-9f62-127104965212'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":103,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aba24fdf-79ee-4755-bbb3-5eb07f6f110e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":104,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd95b8e6-b493-46ad-969d-282f28b3532c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":105,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1cdbdef6-77d8-4eab-83d6-bfe9451473d1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":106,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87a1051c-c370-42cd-b04b-6ff24a9e68bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":107,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95d70fa2-4fc6-4831-912e-42834ef8c11f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":108,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a09d0b39-4d82-4c86-bd99-ceda02a518c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":109,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fbe5af65-2e36-4942-8cbb-f1fcc9fa2d05'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":110,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6b33b6ff-139d-466a-b05a-022cb763a007'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":111,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0955483-72f1-432d-9aa9-4a195f9ee239'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":112,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '379c17ff-1179-4384-be37-4fdbeaa2b528'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":113,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '54bac6bc-476a-408b-bac5-729840202932'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":114,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f9f2780b-17bf-4050-bdf7-95ae9b196ade'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":115,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '724ac4bc-1111-4eaa-9535-04fb87c87697'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":116,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b9f8e43d-f18b-42a3-b552-ad6c57c5d87f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":117,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '58884b34-74ed-40b9-a694-1942988a6594'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":118,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '27cbace5-a205-4c14-84f1-fff135551ef6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":119,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e4803c29-f969-4dd1-9795-71bfa56918d0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":120,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03f547d3-70fa-46db-9bb1-1e01c3a58c74'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":121,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c51abbe3-4771-4f04-9e7f-8810e331e3ae'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":122,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd6226923-49ee-48dd-b6a4-8c4f3125b56d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":123,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c6c9698-0b98-47cc-92fb-384634ad73a1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":124,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d187ef5-5afb-4b9f-9d0c-ad089ff7b51c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":125,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2de63e1e-0606-49ba-a9b7-b83af54c3d36'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":126,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4628b207-0c4b-4a3a-a48b-3f39322d91ad'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":127,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5eb41480-9f5b-411a-8518-bb1ab7f9fcba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":128,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '707e88fb-1d57-4b1c-b4a4-9638c1021259'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":129,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9b46d16b-df7d-4d2f-be0d-62c2a259e79f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":130,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f796bd56-1c48-484f-bfac-4923dc7cf9f8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":131,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bcf7d66f-57ef-4ce9-bec9-53f1a352de00'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":132,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '72a4a161-450a-47e4-bcb4-80de9a8b44c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":133,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0fcc9cdb-f349-462c-892a-eeb8e5b3fa7e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":134,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78ae22eb-e332-4f28-aad9-da56491df0b6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":135,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f7945ca-268e-445a-9308-d7e6a87a15c4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":136,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '760e936e-a1d7-4ab3-9799-4eec472ea5fa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":137,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bd406d84-9633-4302-9030-786421c875e1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":138,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0c764469-8d2b-4ebf-9bb1-99abbf0af8f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":139,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a8a15264-98bf-4f89-aac3-9b131e2d206a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":140,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c596ffd4-d8c7-4dcd-8fd4-c43000a47fa1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":141,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7ac7fbe0-f518-43f0-89f6-657f6c7aaa41'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":142,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '292098f8-49ad-4e3d-97f1-d2b39f298108'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":143,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '36d47341-218d-4944-bf6d-26fe3b96ae47'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":144,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4fc3460c-4e77-4a17-b792-da7eab565257'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":145,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3df2dbe8-a9f6-4736-a26c-754e73d99d23'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":146,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8aa64128-55c9-4301-86f0-ba33aa7050a3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":147,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8cbe9eb9-e2f8-4161-b786-80d30ff7ca81'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":148,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9bf76598-1dec-49d3-b30a-a3eb0b2742dd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":149,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ee63752-36f2-4425-bb63-58d3cf0fa501'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":150,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0f76940-8a5e-481f-91bc-ea6b703505e1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":151,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '25994950-a846-418f-a7ff-6912c466144d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":152,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'beb18b28-6750-437a-b358-cda886477397'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":153,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2389cc78-3c1b-4666-b93d-58c0d878caf8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":154,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd2a161c5-60ed-42f2-ad0c-2907e6dc1cbf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":155,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fa628611-a69b-44cb-91d7-de2a552934d9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":156,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93f71667-a7c7-4d8f-aa03-9c37ce081375'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":157,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '882d8386-c4ee-45ce-9175-aed6abbaf97c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":158,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'df5f8fe2-d7fb-4a0f-85ca-d78861c99f86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":159,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1fa9737b-ff22-45be-b09a-405a6240a7b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":160,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2f5054fc-818f-4cf3-8b90-c8961ece1c20'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":161,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '471a9f94-ced3-45bb-be1c-346330a1a5f4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":162,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bf0a7f04-7947-469b-ab25-a850455c63ff'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":163,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2f4dc1dc-7bfb-42f1-8377-4a7580f66137'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":164,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9d1b9110-080d-4dec-a65a-a7d04a79fd03'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":165,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9f400db9-89c1-462f-836d-c80f5ae95fc6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":166,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2aa1178-eaec-4070-985e-1e4303bcefc7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":167,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '27d38ddd-fe0d-46b7-af2b-9a94966d882e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":168,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c6afd5f1-d141-4c5c-8611-bd03f3f0218d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":169,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8104a297-9726-4367-a5b0-104ba0473a9b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":170,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5a841dcc-34e7-4e99-aa9c-95b440c62afa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":171,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bd6756a0-a95f-4c59-a875-fe6f76ce472c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":172,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03341f8b-4d53-451b-91c1-107c71f4c692'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":173,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bf794a4d-8766-48a9-9816-725b2be22690'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":174,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ed4b526d-8dc6-4167-85f2-1f1f22e070d4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":175,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '86d804e8-97a1-4e64-a3ee-c5399ee68e57'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":176,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '42a68551-4314-4eac-b47e-ba8f1316f517'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":177,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e7a2cb14-d480-4b0c-9018-03c912a91828'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":178,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '48c63309-3b8f-423d-95c9-03d3b9522344'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":179,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '49a6b467-e60f-42bc-9980-5e41d4e555c7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":180,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '874bbe6e-0db6-44fb-a2c2-b0ec2b927554'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":181,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b6e5eabc-eed0-47d3-a28c-50396e3c3d53'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":182,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9075cfad-eb34-4b06-864c-e02a5c06e571'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":183,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87257049-6e0b-42e5-b2f8-743002b8c6e3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":184,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f778f2b4-a6c2-4a12-96e7-cc2e868051de'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":185,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f839855c-b8c4-4289-8be6-bd170a6d6b3b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":186,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '17a2f29f-0249-44fd-b1fa-51a3a896f439'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":187,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1eb43a44-a83c-4ef3-b174-ff661adf554b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":188,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b9857059-c401-452a-b5dc-6a2f98b20681'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":189,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4e3e22a0-cc1b-4741-9b8b-ef8a26230464'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":190,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aa2e3f09-d93b-44ce-a604-ee7a2bfed165'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":191,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '343dc16c-aca0-4ccf-8e99-b31582beaffc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":192,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '47a886da-b288-4ffd-9078-c43980644373'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":193,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2d1c85ca-d684-4091-b4de-c0e14ca1229a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":194,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '015c1eeb-ef42-4990-a0d3-d2353af65289'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":195,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c64e2ef1-9fc8-43de-a3fb-be2af26508d4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":196,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ac29059-6865-4599-bc9c-f3a9615ab258'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":197,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4e8aaa04-4272-4d02-b6e5-a2944010b23b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":198,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e206af55-d384-41f4-b563-56094b3ec726'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":199,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9a1fca3b-5346-4e84-8b12-36bcd240fc78'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":200,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '672155c5-6dc9-4c42-9d66-2f3c37c9aee7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":201,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ede9396-bdc1-47f9-91c4-854b47d9a6d2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":202,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fc9eaac-7684-490b-a56f-2b90c10e0b86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":203,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a7e71691-f72a-4219-8816-b349e29d152a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":204,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b5f02c44-8d5a-4a8e-b7c9-72c1573e550e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":205,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7de1e829-a3d5-48ef-bdee-1b82ba13d3f8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":206,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '69ac2fc8-09c6-4e2a-bb69-0ffbd1307c56'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":207,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9556d2ee-e85b-4018-a323-c12a585580a8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":208,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d1eb149-4b19-4317-aa8d-fbceee4968c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":209,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5c6aba74-f124-46f9-98c0-b1c3ba09db91'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":210,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '216d41ba-56ce-44fe-9229-ef5c0fd9caec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":211,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '84107551-30e0-4f6e-a2bf-856e9da43353'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":212,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd96d661a-4088-4d4a-9084-c9c2d2173c9f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":213,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '85a975bb-e08f-43aa-a9b1-9dd97d09706a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":214,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eebcc9cf-b763-44a4-9a37-2b281802dcac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":215,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '407af9a2-ea31-4a39-a450-ace6c073382c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":216,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fdbecfde-8243-4957-9318-9ca862859c47'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":217,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0a21a3c-7cc5-497e-af44-a55d4aa5ad5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":218,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '49b28b73-b5c0-470a-9719-5137310a9e21'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":219,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0d0f020-1449-497d-9e06-e0f0bedd77d7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":220,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a3195bfd-8458-4315-8244-4a3b0a732a24'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":221,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '906bd025-d554-4802-826c-ae9e54af3f52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":222,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7c4d7323-4737-4dc5-a7ef-4fcc135e2523'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":223,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0db7a7d4-0ec4-41f2-9661-227d39d0c55a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":224,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '57e10461-b260-4b6c-9c10-122494e97935'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":225,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '346c858b-2e9a-4dde-9e32-f8adadc66c71'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":226,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd236e811-7998-4989-9c17-808f9ba1bdc9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":227,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a80fdac1-4ec1-44f3-a24a-e7564b459bbd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":228,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '52ea8cc5-3885-4a1b-9c71-a7337df05a19'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":229,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aa1a4dcd-9d89-41b2-961e-4b65bd9a06be'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":230,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e9987787-d7b1-4a07-8f49-07aed9a0081f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":231,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c3f601e-e8a8-4d6b-9ca6-ccb5a2e7207f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":232,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2cea3680-a94c-4a94-a111-73c7df00c351'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":233,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0e5f2f2-e220-4ae4-83bf-646b9b937355'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":234,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4238d01a-0f0c-4ecf-bccb-5eece99e6775'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":235,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'de96a10e-f7f1-444b-a29e-ca6d5e8848eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":236,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fe2d933e-d9a6-4d7c-aba5-a0abffafdb4b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":237,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cc02d6f8-cbad-4e26-9b05-1c2818374db3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":238,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f106467a-d884-47f0-9e01-6fd4cb96db40'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":239,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cd27a25f-82f2-4c62-aad1-47faf28c8f0f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":240,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a9d48c9d-a286-46b1-870b-1551f87c9c6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":241,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f7b52b6e-f8f0-4e07-95ce-fe00d8686896'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":242,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1087b0c8-3bb1-4130-be2c-763f32d6ca31'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":243,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '408517c7-d655-44aa-9b87-95d443564580'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":244,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '034642ed-d924-4076-9746-a148b93f44ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":245,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '522227b9-b7c9-41e4-8b26-8aed46e41eb6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":246,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ac52e46f-64b9-4332-a6dd-c0177d5e9845'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":247,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ca90282c-4494-4cf3-a35d-479d2c23af7e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":248,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8191f7eb-7ed5-42a0-8b62-fe3095e86881'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":249,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c481708d-c5b6-4232-b60b-67bf1dac9803'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":250,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5bd11ff6-b952-4f84-b1c0-05c6acb819dc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":251,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '01bbdcf5-2d61-4f52-903b-a738c3824643'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":252,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fcd6ec09-e69f-48d3-bc4d-d7ed0bc701df'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":253,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '67c517b9-6b7f-4500-ae64-8a187f28dbe6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":254,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75a4eb66-a9ea-4b35-a6bb-9ca5136be2c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":255,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2211291-fdf0-40a5-82bc-2d81dfe9ce03'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":256,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9d1bc35f-ee99-4508-bf75-a887be8a04d3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":257,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '714eb764-76ca-4054-bf3e-47933be3c3e5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":258,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd92ffa6e-7534-40af-92d5-72f7d7bca2ab'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":259,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9f529aa3-3cbc-4130-99b7-8de80119f738'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":260,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dc67d5a8-7fa0-49cd-a960-eb5cc1a146cb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":261,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0393231-e229-4044-b6d2-9f59820d21e6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":262,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c990aab9-d13d-4c26-9be9-23f01589282d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":263,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '86a9e488-b5f6-442e-8b4d-9db5cf0f403d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":264,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93c838e2-51fb-41db-ae66-f6a29a9374af'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":265,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'def7d112-d54e-4d4d-ad85-7b1ad701cb0f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":266,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '80988f45-4f94-48ab-8cfa-c417c4015e6c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":267,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '61860156-c7e8-406a-a95c-69b2592568f6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":268,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd069b349-791b-4b7a-a1a6-34de3733ea84'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":269,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7892d806-063e-429e-bcee-0c5eeb9c74a7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":270,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4f72a312-bb31-4562-a73a-c2489ab7d2bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":271,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2d3c263e-6dd3-4269-9297-a55725641571'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":272,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '50731c79-7ccb-4c1a-a62f-82a7dcc10ed2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":273,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '29c09fd1-57f9-422d-a989-8d460091743a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":274,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b75d662e-41ee-4e8e-a297-f990d269845c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":275,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0a36edb-0652-4913-8643-2e03b7bd8f8d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":276,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7523f922-e423-4c62-b658-c3d5449697c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":277,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b3d4357e-99e7-4f82-a399-7aa6612cedf8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":278,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dce0b880-8b3a-4b5e-a094-9c1effba2d9d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":279,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a200b2c6-f69d-42df-a1d8-34b7f86bff24'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":280,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '64709e0d-2654-49cd-9a19-40480772d296'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":281,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8086f512-f14b-4f96-8c45-43a6bd4bae15'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":282,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e7f0c167-8d07-4c59-a0b8-4de5ee517058'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":283,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd75df00b-4ccc-4996-a61f-61518c09747d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":284,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0f49e13b-98c8-4770-b045-20559f24eb59'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":285,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9973d8d-c72b-4501-8e71-6c4510405c56'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":286,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a5c5601c-435e-49cc-9a68-dd45086ceb33'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":287,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a27f14b5-f2a1-4e46-8c55-3f0ba77a530f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":288,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ad472c9d-b0bf-4856-bbe5-712d405f9efe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":289,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8ea2c9a1-c0be-4e81-8f9a-03239ef1b76f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":290,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40d8a56c-d9fe-4316-93ea-67bf3ec3e471'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":291,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '72e880da-3165-4662-b377-a9ef3bbd7397'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":292,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ae3ae699-01c0-4ce1-8ad1-13b223987956'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":293,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bda1f73f-2a7f-4cf5-875c-98c3f6487e3e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":294,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '79fd7da2-2ba1-4f45-ba1a-ab647f696f77'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":295,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f681538f-163f-415d-aee4-9d96f7e4b1ff'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":296,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f5dc4dc-919b-491f-890f-11f4a0e8a600'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":297,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75c4db9a-fe25-4f9f-a1e9-42eea3241a5c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":298,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dc356e70-aa66-4d70-84d2-2dccc47260cc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":299,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4b5af98a-4de6-4913-b18f-b476027c5cc9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":300,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5059a4b9-7bbc-4098-9a33-13e0bd4f7c40'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":301,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ee2365d-507f-4849-8d31-122138fc7c85'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":302,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '41dfda12-7906-453d-9505-abb4150aa437'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":303,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '12c86c44-8700-4672-a8da-9e6f16367df1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":304,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '027fe0ba-bec6-4cd2-b34c-ce4e24d6d460'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":305,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e63aa744-7903-4e79-a85b-aa627308faae'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":306,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c69fc104-bcf1-4796-8e84-9e33c8d5fd31'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":307,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5d8b2d30-f6c2-4936-8d86-009fdd87dce5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":308,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e4d46b8c-63c3-4e04-9992-c1465cf19c33'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":309,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd856885c-bc96-402a-8a98-e440209730fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":310,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1b76d2b9-58c3-40a9-903d-4b90781669d0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":311,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3bfaee3e-76bc-46e4-a023-4e27fa4424a3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":312,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cd313923-abd7-41ee-9d49-ea7dbc09cb98'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":313,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8368239a-7dec-4fbf-90b3-6e13a491c0ef'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":314,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '640c9869-8777-4b09-980e-246720ff0851'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":315,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c48a1f33-ea02-4683-a6b8-c1d24121223e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":316,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8112ab9b-e959-413a-a89d-16d0149fec2f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":317,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ece0617e-6387-4f12-9881-c974cc82132a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":318,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '68b268eb-cec5-4eb7-bad2-ee9849113bf5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":319,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'abf7358f-aebe-4541-96fc-785f7a475ff8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":320,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b5428ccc-53f4-4c93-9e2b-a1f1fca2baca'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":321,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f962ba23-2496-45bd-b501-5b24298d0d56'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":322,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5678f061-e1b2-44fc-88a5-9e933c29535a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":323,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0c077bf-2bb9-4945-a961-7ea8c3c3d252'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":324,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8339109f-bfc4-4d72-8f85-a2679606875b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":325,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'df64b9b2-2f27-41da-8c3f-afcba0ef02cd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":326,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f1056bd3-4c6b-48ba-86a0-d71fff7dc24a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":327,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '59171114-7c50-4857-b240-d0704bf4499c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":328,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c5c218cf-9752-42be-ac8d-0ac44c30f0af'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":329,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c00972a-476e-436f-8f6a-32921550be66'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":330,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '16c19ae5-8d45-4885-b4a4-7b9de88f09fc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":331,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'df8eba95-9229-4eef-b2b7-6a808cc489e6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":332,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4e0c861f-49fb-46d6-9544-16795afe50e9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":333,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8786972-73af-4a14-b60b-5cf10d952f84'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":334,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fa9bda56-02c0-4ba1-8d86-fa0803b5fe51'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":335,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8d317e5-e450-4dcf-abb0-d1447efff835'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":336,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04b34afa-0232-4c53-bfa7-5b0540f55ca9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":337,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3f7d6ff4-1967-44ae-b248-c5e087e915bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":338,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd2021c74-5e64-45b8-9cdf-a4c908306818'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":339,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c160292f-8695-463a-9abb-96631dde8b53'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":340,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '30e35cee-485f-4b74-bbe4-7a6188097fe9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":341,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9af0a959-d7f2-40da-a557-5f1c1db6c9f2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":342,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3cf2ab0a-b6d2-4192-9723-bbafda3e12e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":343,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'be251ad2-d85a-4530-8b22-1510e15dc832'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":344,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04ec205f-34fe-4761-9418-5343624afb9d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":345,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e469407e-4dab-4dc2-8662-351adc794c4d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":346,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fb3ca505-edaa-4bdd-bf60-586c1a78a583'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":347,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '887cc3e9-b562-4790-b11a-35c1f5dd61bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":348,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '97073d74-9ca7-4aa9-b51a-eab8928ac2b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":349,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '865e8b46-c584-48b6-b3bb-04fb9365847a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":350,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a151b9f3-e419-4475-bceb-fb2b96356cdb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":351,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6e1d6481-ac3b-45ff-bd3c-b0b8731d9deb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":352,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e47fdda9-71fc-4ee3-a778-5bb1b367fb49'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":353,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a441e7e6-6fea-4f9c-86e9-dbd2a2a7e0bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":354,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b6e7c4e2-6e5f-424a-b58a-976c5486d571'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":355,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2b0a874d-1573-4285-a91c-012e89d59821'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":356,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9b9d3116-7663-426f-81f0-60dd367f2f26'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":357,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e3b77d96-60b0-45bf-9c8c-01fd00f896f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":358,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '51914099-19a5-4e66-b83c-101f87f2cf3f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":359,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd919d824-b398-4ec7-a38b-2c5ed4efe91f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":360,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd11f4591-bf82-4c8c-91eb-0376adbc0239'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":361,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5d1fcf27-05c1-45a9-ab9f-41a770403a7d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":362,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '96ba72ca-2bef-4242-a83a-6fea49e41f24'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":363,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f33f0163-581d-4de8-8737-02ee78a9c85e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":364,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5578e7a6-b932-4760-9c6f-aa4210e9676c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":365,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7217cc55-a061-4026-8341-81dbda50ab84'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":366,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6b89d64a-e085-4cca-adf8-dc3f309d8897'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":367,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c16567c-7cd4-4b29-85f5-4201682dcd6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":368,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '72929faa-8bf9-476c-b688-83b9a3437421'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":369,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bf53554f-7195-4c34-9fba-111183d2884c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":370,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f2768c9f-a584-4320-9ca9-20bfd32a7e4a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":371,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7cf708c5-1a0d-40dc-976d-30357d3fdb0a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":372,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '614e491f-c7df-4037-9f19-ec611d4aa08a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":373,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5cb80d70-8186-4273-a2b3-90bfebb1c56d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":374,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ed2deff2-f17c-404e-b1d9-0f53d731ee7c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":375,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e3c716e0-1c86-49de-ae02-441b1d821c0e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":376,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '950f5d15-c4f7-4374-a12c-2ebb6ee8b6d1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":377,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '214e898c-c4c6-4398-968e-ab6925033f8a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":378,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '317ed1c0-51d9-4dc3-9ef5-9ccb6a89eaec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":379,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6de37ede-536c-479a-a596-04dcac2c8a4d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":380,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0b652fa8-2ad8-4aba-8d84-843656409c14'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":381,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '79290d1b-6947-4a58-b751-f5ff4873a85d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":382,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '961d77b7-90cb-4168-b3ef-ec615c010aac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":383,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '15722c54-be29-4743-8874-f014c21228d2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":384,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03847acb-6d24-4af9-aaa8-fb41b570b070'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":385,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bc76f8b3-d4c3-4e27-98e7-07746098201f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":386,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '48406ca0-73f1-4ac4-92d7-13dc314f441b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":387,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '309bf565-2ba0-488b-86d6-7f2be831d1fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":388,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fd195e50-a9c6-4bf1-b686-392d35af99f9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":389,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f4fa1c4e-fbc7-40c5-9035-c2b125f754fe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":390,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0455637f-ab41-40cd-a71d-d03533db36a8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":391,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1eb5645e-a33f-4994-8fae-b43b15850879'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":392,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7025a965-ac84-4e85-af15-3312ccf5d81e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":393,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '50c28174-a9fe-408e-9c60-d2fdaaf78359'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":394,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '97b7b3ca-408c-4057-8fe5-9faff701ef96'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":395,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '41340426-bbfe-489f-8190-e3c66c78959c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":396,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0a2f562b-7acc-4b11-9995-2cb9488008fa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":397,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fc013c4-8ae1-4733-863c-a925faea64eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":398,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '62fad7c7-78d5-4b39-85d9-16d9ea9a5501'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":399,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ac1fd877-3c4b-4aa2-a92c-fda481ad54e2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":400,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b39abda0-230a-4924-a764-6f135f56321f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":401,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '39c0d83e-1dc3-42a8-8fe5-8b0bf6956c34'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":402,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c1a8851d-d582-4d3b-ae8a-68a6521739c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":403,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f02c9dad-912a-4625-b758-020969498d70'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":404,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a77622e9-e26c-486e-ad28-100099d69e79'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":405,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '30d7e65e-909d-4d70-b51f-d992cf773b45'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":406,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bed91950-ecb2-4f74-ad11-3d2e4048b961'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":407,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2be21385-3c43-4b9b-b166-262dc9ad678d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":408,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cd17acf5-917e-49cd-9de9-5f666f9135b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":409,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '11d3ee35-bba0-4a7a-81a6-a03f60f774f9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":410,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6cfcbc80-c495-4cf7-98cb-066d2948905b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":411,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e611b7e4-6892-4774-92a7-0d330c04fb02'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":412,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ff4d1269-c949-4cf4-91f1-81d91bc3fadf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":413,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ba41c4d2-e72e-4bc3-ab12-2f46c37549b8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":414,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '33c3129e-b862-405c-a641-7a939a45cc37'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":415,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '706ecfa2-11af-4b4d-aadf-c5338f75d4cc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":416,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '190d27cb-38e1-49c3-a220-55a90cb88077'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":417,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5e282103-0069-4662-a8fb-f1cf873af242'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":418,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '570f0808-96f0-4a6d-9df6-2186b4fc3775'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":419,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04dc8755-0932-4842-bf0d-4805a1c5537e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":420,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '60802863-5c03-4044-bdb2-11ba03d1973f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":421,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3eef6a91-4b1a-48d3-8277-9a801d00116f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":422,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0ce83677-2bc1-460d-bd4a-6c803d488ab6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":423,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '226b9aa2-e34d-4b35-a080-94a9215f578c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":424,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '221a2473-c3db-4f85-8023-1ab19458838b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":425,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '15bce0b8-5e7e-47e3-af81-bae0d2b10647'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":426,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dc005d25-7d23-4903-94c1-c144ccde8a26'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":427,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ac4437df-4587-4fd3-b0b7-6dce1330ce0d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":428,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'de43b632-459c-48ed-91f5-91ea9bd1c7db'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":429,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a2b21bd1-0bd9-4ed9-85a9-8bda83e51521'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":430,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0e07d57d-92ec-45f1-a5e3-60c960f5e442'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":431,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '45ffc1d2-0165-4dd4-b7a4-e624dbde6ff5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":432,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1a678f17-eacb-427a-8203-117f847d6f0d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":433,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '708ed526-e1ac-4eeb-82de-34d440b285e4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":434,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ce4e3315-4a2b-4f35-a786-8b63042c7a65'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":435,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd1b7fc3f-faa5-4618-85a5-2ef64c583201'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":436,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c07a7b12-d904-4a23-984b-a6dbe4161655'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":437,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92b4b819-2ad4-46c6-8c53-5dfa3aace6e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":438,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dbc619f9-6b9a-4a17-b1cb-bc45f1e43f6f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":439,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1111fc34-5de3-4420-927c-ae8579fd73b8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":440,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0dc8ee5-499a-4063-ba5b-c30c5b2ade97'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":441,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bcac6663-07fb-411e-a1cb-5e65b4d30bac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":442,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd5f3aeab-cdbd-4174-a0ac-749a1c601afd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":443,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d76a056-2457-409d-97ac-c8d3fed2942c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":444,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a05575a4-1f2d-4d0a-b5a4-80dd7f98e58b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":445,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cde69525-03f0-4865-a9a2-b24a353a8a27'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":446,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9bbf68c7-cc27-408c-b395-7efd48ad5912'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":447,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04a6f312-2e6f-4dd6-8332-c70dfba2016c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":448,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8d91fc3-488e-4871-8cfb-eabfae135d55'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":449,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f79dbf59-f6b3-409e-a128-b77cd6c9eb23'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":450,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c36a3a27-0949-4969-bc7d-9a8920ae9303'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":451,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b2989cf0-5c36-4a43-83f9-44c4efd633c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":452,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4f0371a4-6a2d-40b5-a08f-49b0fc74ed2a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":453,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b5f55fab-447a-4d4c-ad01-8cc8b069f3e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":454,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '07ba8694-e60f-44da-b4e0-f9b7129bbc9f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":455,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0a59cb12-3971-49ac-a348-fac047206bf3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":456,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e9f96c11-1fc5-41fc-a4c0-38b183120a37'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":457,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bdfcd631-2de1-4d9f-91d6-6ab12dc8228f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":458,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cec2672d-009d-43c5-91e5-e46660f5f661'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":459,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '800bcf06-1f0a-4031-ac27-50fece850087'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":460,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ccb4ac1-917a-4a17-a958-ae04ddaadce4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":461,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5d6db78d-3c54-4880-ac4f-9c3c1a4dbecb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":462,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2c1640b4-288f-4042-9e0d-fe71916edb31'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":463,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e68e2f18-9db1-4089-a0af-6a36ea2926cb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":464,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '39fafd64-d3e7-401d-91b6-28050a2b7eb3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":465,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c77fc203-7055-473d-9e42-df8992e01cc8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":466,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '66102807-e30a-4687-9790-9e3daf2739e2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":467,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a856539b-1ad7-4fc0-a81d-4ad0153d2f13'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":468,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b341119d-1e2f-4336-8d6a-6a097e1c665c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":469,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ddefc1cf-dd14-4ada-a2b4-1a0c0fb37ffb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":470,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '657d07b9-92ac-45d7-835e-00c03b1fe46a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":471,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a910834e-bda5-4705-a8c8-225306684a69'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":472,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ab76cfd6-81fa-497b-ab66-67260c8b0658'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":473,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '52fc9e77-1e08-4018-9dc4-cacf88ef1c23'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":474,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3b99f225-2da5-4c24-9f73-21944b8310e6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":475,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd1032a16-3231-4cbb-acc7-812c358939db'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":476,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '399fe576-6f6d-4022-903b-5cebe72768e5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":477,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd1e63aa3-586f-4e6e-bc34-7d5eec2df538'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":478,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31fdaba2-9267-4926-bec3-cdec47686901'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":479,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a549ff2a-fa03-4612-9728-a2a40b95c8af'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":480,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e91a7d54-826b-46c5-8d96-4389bcd842fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":481,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ad01612-d3c6-4e73-a85d-5c562549ab94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":482,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '73b1f657-74c7-4984-b583-801f5ea022aa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":483,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b5d51642-0139-4dca-9f76-22d5cdf37e96'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":484,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '63e6d440-3cd1-4b3a-a1d2-106c7222d868'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":485,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'df5ff7ef-8d29-46d5-88d4-851d6eb36d23'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":486,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0708758-dcd6-4ac7-a7d1-3c1ffb89ba14'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":487,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a869c8b9-d561-46e3-87b0-76cc636d31b2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":488,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d0530d1-9f2c-4069-a448-d9c38f2d8fec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":489,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9aa95bb4-21f7-414a-ba15-f22cbed4d38e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":490,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '37561d2d-6e49-4ed0-93c6-18bb2368515d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":491,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3491a957-f6c3-4b17-bd62-6f88711bbd2d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":492,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0cc34157-7e93-422e-876b-b99327ce0f53'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":493,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '912ca076-6002-46b9-97a3-4a76e1104e1e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":494,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '85e7f00b-37dc-4ea4-ac31-20b89ada14fa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":495,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a6ce612b-9cf0-4562-938e-80e53bb58cbf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":496,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c040b924-0573-478a-9b3e-51de4ec19501'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":497,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fece29ea-aeb2-4b3d-b0a4-c4e4dc2944e0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":498,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d076be2-aace-40a3-8888-dc5b75239506'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":499,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e7095925-2cd1-42f7-942d-404e7fa66341'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":500,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6018cc79-bd1d-44d0-9c87-8d4e31de2893'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":501,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5a56dc8c-d65a-4484-843b-10bb85fad566'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":502,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '44f77dad-701b-4983-8ea9-b0bd8a16470f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":503,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '086840ad-97a1-438d-9d00-2b61f828f5c6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":504,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9ba6fff7-1b0f-4f7e-9920-499fa1ea235b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":505,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a8d9ba22-0201-4ba6-a34f-f397939956d9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":506,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c8bb762-1a6a-4ec9-9efc-12b22512642b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":507,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '22129560-d981-463e-864b-2bd3d7d9d90b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":508,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aaf9c1f1-6926-4d58-af0b-db85e52a93a5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":509,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9efb939a-61dd-419d-a55d-5c82ebbfab43'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":510,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5a9054d9-fe0a-4b53-bb2d-38f9beb8c97d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":511,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '39d2e075-5872-41fa-baac-98c0a4e271f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":512,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3227402c-4d36-4591-ac33-bafbe386cb81'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":513,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eeab4f5d-34c9-4d23-abb2-a8f43d2f33c2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":514,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c43b6b66-149b-4ef7-9653-d9dd64da50ea'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":515,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '14412f18-9c58-4ded-8149-796fb44afe34'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":516,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0b55194-3e9b-47a0-bd8b-7f18c8a9f740'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":517,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ae44a3e-e7d0-46f7-b3bd-bab463a52c9b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":518,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7a75b0bf-385a-4329-aab1-b24c0ae05e76'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":519,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6e5d2096-31ba-49a6-b8ba-73710c1fc3b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":520,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5050ab3c-c253-4ba4-872f-c3963a0e7dfd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":521,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '985e1086-62dd-4e33-ab06-66427acfec31'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":522,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ff0b14cd-a64a-4ab9-8428-bd318500b3f2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":523,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'da37d7de-f711-48f1-9d9d-9b38ade6ceeb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":524,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f13429a6-23f7-4d50-9beb-5dc3e211e34f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":525,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '16b3109f-65ab-4005-b474-c173cd967245'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":526,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83612897-1762-41f7-bd40-208dcfcca8b6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":527,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0add8394-0cb4-4ff6-88a6-b2879bd4bbbe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":528,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f06ddbeb-16b3-460d-80f2-12d2b55489f9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":529,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '80e62e9f-af4b-45bf-a913-87b0de5e8914'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":530,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ce950ad-d29d-4745-885d-776fe72c658d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":531,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e1f42b65-4663-4d89-8bf1-6cd2bcf63c11'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":532,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '27adb9f2-6906-44a3-8833-b3bf8b671fcf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":533,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '00a1ced0-df6b-4972-9db1-8bd1cb912f4c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":534,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ea84ad5a-92e4-4656-bbf5-277569cdd9c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":535,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5fe76cf3-0a83-458a-8479-9504db9340ff'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":536,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cb0e65ab-efcb-4df5-be0e-91e17c14bcd6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":537,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '62c7e61c-dec9-4a2b-9271-05428533bc3c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":538,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'db27f592-8326-4187-bf84-8417ae7b31cb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":539,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd1b8bb3f-c13d-40cb-a2f6-b22df7d2f895'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":540,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a7ab7000-90cd-430d-9767-b24eb754866b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":541,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '34bc35c7-ae94-4079-8465-8ac8e1097a1c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":542,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '983b0da2-a56d-4f38-94b8-10e2dad1d43b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":543,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7599046a-cc30-4738-8e9d-572e81ecb801'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":544,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c6ad330b-629d-4244-ad3c-ffc11cdd5629'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":545,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8844f7f1-a148-4743-b5bd-92568ad2abd5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":546,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ab8795e-880d-44fa-b218-4f721ceea7c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":547,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '426f32e6-a041-499c-8031-1bcb381fdc0d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":548,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9300366d-4664-4569-9b42-85f3bab25a40'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":549,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ba262db8-78fc-46cb-a8bc-9c0e7abd3a95'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":550,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a3f0b7de-8351-407f-ad7c-e996c0234e6c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":551,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8bce0726-657a-45ac-a81d-b5cdc2cbe0e0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":552,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f3339561-1253-4ca5-a922-ccf8a11107ef'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":553,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '94796e98-cde7-474e-86d1-22f320372417'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":554,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5e88e26b-9a77-4066-b9a0-b58c479854ca'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":555,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '08a74e96-0e48-401e-9a74-9721b17bc1ba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":556,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bc4b7560-5206-4a2c-a8a9-0583da9f47af'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":557,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dc07b85f-6782-4ab5-b811-d178bff4db6a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":558,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0cf38f3b-63c7-4dde-900c-4e6e746d23bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":559,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '07f94f83-cf42-4ae9-ad0f-821590af0228'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":560,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0a7ba6cd-29c3-4bdb-8a40-61939c064770'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":561,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4a296191-0477-4889-8397-d4d57ffc5ea0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":562,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '317627fd-9c93-480c-a30b-7a87fb66f8da'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":563,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b4d9d80a-1046-4a21-91f1-631cc53f2a87'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":564,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b9d497cc-bc66-497a-81a1-e22b4e2c90ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":565,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0a4d8975-1e46-47c2-8a5d-7d2be05f697b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":566,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '023cf2ab-e139-49d7-b451-a02a9dd991c4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":567,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ea25772-8926-4c3d-b9b1-c3941f830edf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":568,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5083507a-971b-4180-81c7-ed8014c557f0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":569,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6a148226-22b9-47ea-a69b-7d7187eb3811'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":570,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a2a10f0d-5137-4b88-ac39-f70aeb8d755b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":571,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd63ae70-2fc5-4449-984a-8149647a3554'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":572,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99504c7f-0ae9-4149-8752-e5e6a86d6736'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":573,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'edd5f70b-a5d0-4857-900c-b48bb9b2240c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":574,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e60671d9-93a0-49de-a7cb-5568582e454c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":575,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ff0a657d-d6d6-471d-a638-061b2dafbedd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":576,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5cde40f2-c65e-489e-b3dd-cb8d26de6ecb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":577,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '644ad04f-68b7-46d6-a5e6-5337c89197ef'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":578,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bd7848a2-c4cb-40c2-944f-00d7275a909d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":579,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b182995a-90a3-4aa6-bd00-c540405ff620'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":580,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '948a346b-1b19-444c-a1f0-4fd589c6b9a6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":581,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8ed82cce-1057-400b-925a-377600163f4e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":582,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7ec63f3c-9c69-46cb-9d53-ceb4a3709dd5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":583,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31dbd07c-d602-4087-ab1e-09352df99c91'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":584,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9b50c6fc-c516-4896-bd63-63249e3054bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":585,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bafa6ed9-5493-47d6-941b-c4095de14136'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":586,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d7e0f23-f8d3-4f42-9526-7dcd386c116a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":587,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e19dd974-1b73-45ea-98e9-1129f37a4f3b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":588,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ccbb454-c503-4171-ab8e-59ddb6d8290f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":589,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a3df9fad-a78f-4ee1-8bc0-381a44d05bec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":590,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '00de8ba6-2a33-4ff6-9716-55d46189eaa0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":591,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '914a371a-29a8-4f8b-aa06-4c712732df12'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":592,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75114a46-7846-42de-9aab-6951cac9afb0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":593,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '85cbeafe-a8b1-4c46-a994-e8dc5c05d8e3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":594,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cc74e9ca-8945-4322-b86f-bbc4aa182b03'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":595,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6930f500-e592-4f1a-9132-60ff79f48dc9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":596,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c2f65b5-d51a-4972-808f-2e7c2d35c362'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":597,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6bb71218-199c-4940-a08b-13b04fc6291b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":598,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e821dbdd-3360-451b-aae6-64b2a82e76b4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":599,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '998c865d-efc1-4400-ad67-d94e01f76e9f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":600,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '64db1161-23f3-4be9-aa33-6a705178942b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":601,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e2eab019-4017-47da-845a-1fe11c1a3571'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":602,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ea31aabe-26a6-4edf-a470-0a321839ac47'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":603,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c95511f0-e518-468f-b09a-43893eb0c7fd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":604,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e2a2d1bd-6436-4887-a9da-5bb25a25167c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":605,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ade99167-72ef-423c-bf9c-f730521091b9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":606,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b8956f3d-eb5c-46dd-9b40-b12433c5ea69'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":607,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd8c0cf27-6930-4e59-98f7-11a9d501b4bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":608,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0d8657c4-509a-4cd0-9cdc-647f39924308'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":609,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2bd48acc-892b-4261-88bd-5e9b5a022314'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":610,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '45a4eab0-d58a-4637-b10a-b68952ea076d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":611,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cae73bb4-fc2a-43b6-9a27-2bbca51cfada'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":612,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fe01ac20-c258-4c5b-9148-8920e712a6cc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":613,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ce5d6cc-07e3-4f46-b40d-5ba07dc2a1e2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":614,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ebb1aaa6-5bb6-458d-b941-0f3b0bf0317b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":615,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c0a94d4-70aa-4f97-a1d8-b3e7cb26a96d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":616,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '20abd49b-a0da-4b94-80fc-32c91668cb97'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":617,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b1820878-a7a3-47f2-b585-f31e6293556f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":618,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4e9ab44a-17e8-4968-8779-7180aacf7d51'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":619,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e944f42-4194-4113-a1d5-f5fcc64cedf4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":620,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3e37b64f-dd04-4b35-92d0-e79fdb1c720b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":621,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '55f9df57-b0ae-432f-8291-3daeddbd2e06'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":622,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2e60c3d-13c1-4b7a-8153-4bd2a69a1e2d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":623,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '26070fa3-3944-4123-8190-f5f57a701e38'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":624,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '355e287f-e4bf-48ea-a5b2-f84f59d5ba94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":625,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bbf16333-6fd8-41f2-aae4-62821c16cca6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":626,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1b986124-2e93-406c-8d58-2e1624661e1f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":627,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '74c86a39-a6ca-4617-b55d-0352b024fce7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":628,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5d4fdf0d-6377-4ceb-a8ab-b5f13b77726a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":629,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3bdae9f4-d020-4c5f-afe5-3a5207431e25'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":630,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '07d7f899-a4fb-4c05-9664-df98b15c19bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":631,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f51776c5-9df3-428b-9746-c0716d54cf7b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":632,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3260cfe3-cdeb-4b7c-b1ee-037c0f91ce2d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":633,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c51426cb-dbd8-4629-bf6e-8ebe83f4341e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":634,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a3c41d05-70b4-43bd-b3ae-5aff459dcbd8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":635,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1ba0b354-f1ca-4c20-8e6d-bb10774557e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":636,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '149368ae-4d74-4a09-a0aa-bd6914bbd580'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":637,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3eaa25a5-0acc-4e4c-ac5b-3446afeae42f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":638,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '62952e47-a722-4d1d-bef0-66ecc516b5ee'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":639,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '70c6a1fe-ce3b-4a22-85a5-8032b0e06217'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":640,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1e3a0a88-45e9-452a-aa88-0520d33ddabd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":641,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5286c5b9-9ddf-41ac-ab0b-1ac5d89ef640'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":642,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd1a3d69d-6b8d-4a7f-a2b9-efe0a5d1030d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":643,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fff4d218-f54f-4f0a-a2a3-e742026fd999'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":644,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b0568705-5b8a-4de8-bed6-06f0734489cd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":645,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4e747090-5ad4-43c1-8e2d-7e83a2da3ae0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":646,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b7b3de6a-585b-4844-afa4-187787595b73'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":647,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a5d081c0-7546-4f03-9cd7-81dd7732074e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":648,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7bb37e02-b4bc-426c-a8dc-5acb085832e6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":649,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '41c570bb-6ed7-4176-a9cc-a3f3a2b32d86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":650,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cc60df41-b472-4747-a4e6-f936a54af19f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":651,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '893d0991-2879-4239-89e5-8d13b96eca0b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":652,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c89546ed-fc51-4a77-8e37-4c1d16503e60'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":653,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7db05840-6d7a-4a5d-8dec-812435928ecd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":654,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0394c99e-99f1-4134-8e74-1e03e81fe23d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":655,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6df55e09-5c29-42e7-a618-cadc06429ef7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":656,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c81e62b2-e7b6-4317-9626-db2623e52ee5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":657,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '64679d44-06ef-4d49-aca0-6906944fd44a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":658,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '63d9c059-6d1f-4211-b773-3de5d3c97e58'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":659,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '914e3ec6-478a-4fc6-85f2-a1173cc0a938'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":660,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a8fc0d10-6661-4bed-8039-e13c9053729c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":661,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd6e87d53-9131-4679-90af-db6bd118b044'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":662,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1506aec3-9177-45a1-95fa-ecb11f3d2c9d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":663,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e1b6eac6-4352-4a5f-92ee-28f73fc95050'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":664,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cfe45b45-db8e-490c-bec7-9f410a8b8c31'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":665,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '79f859de-fde4-4fad-90db-b28ffe1a90f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":666,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ad6b9658-e672-45cb-a955-e0ce355ed9de'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":667,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '815f8054-7cb2-4ca3-bdd5-fd5bf6af4851'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":668,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75ead6e9-b3be-49a8-aeb8-539423c1f55d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":669,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ac4558b8-de4b-440f-8d0d-e0973a5f2247'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":670,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b394f92c-ea93-49ae-94dc-bfa63ebd55b7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":671,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1ff21f9c-7490-4c4f-a4c4-c6780afbb1b4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":672,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4d9e6859-7520-446d-bd15-6ed77b008525'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":673,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '67c0f92b-4e42-4ac8-8f61-b2a1552772b0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":674,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3da41263-bf68-420c-833e-df32a4e2a617'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":675,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cf1ecdc1-aa4a-4ba2-829d-90a76326dbc5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":676,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4115c1c3-5482-4056-9694-7f383033d5ce'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":677,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a75a523a-cfe1-4fc5-b95f-6f8079b1727b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":678,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7ae60622-36be-41b3-a170-8e8513f49d8f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":679,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '30df1071-f34e-4797-81d3-119645f1cc42'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":680,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eb8bc872-5900-48dc-b665-6e755796e435'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":681,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c8f57616-3def-4abe-be43-dbb6662558d5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":682,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dc663e91-c484-4ca9-84bf-0ac1753bef19'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":683,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2bfa0cb3-31b9-4e03-bbea-e8c236903751'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":684,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '251d4d50-9144-47cc-9c07-33d40bd2bb95'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":685,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '10d9ac9b-4b61-4ca2-96a2-b87c0b941872'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":686,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0e526a7-499d-4b7d-bbf9-33767e977f12'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":687,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9707b5de-43e3-43e9-8029-bd19155829e9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":688,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c881f49-26ae-4573-b3d6-e564a4888a42'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":689,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f54a813c-fe5f-4a1f-a2c3-1ec7185051e5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":690,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1b86e4dd-8585-469b-906e-87db37fe6b61'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":691,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '53af2fa5-a8dd-47a8-955f-7b65d8c847fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":692,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '28efef54-1d6e-40e2-9c47-f90db1ccd4de'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":693,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ad5d916e-3109-4a5b-934a-20d9c15ee46e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":694,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '66dbe6df-42ba-456d-9324-fb53cfa5102d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":695,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e98ba5bd-b78d-47e4-842c-44adf6c62d3d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":696,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c02c67be-9c0e-4684-b762-b7932c7e4e80'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":697,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75e98774-0696-45dc-afd9-217232ccc8eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":698,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c974f3c5-3781-4c3c-99e8-8d426ab02c5e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":699,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '15deb456-4363-4b18-85af-42136ded1532'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":700,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '73ae73ef-18b9-44aa-9913-d0d53c57d5ea'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":701,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cca581a2-91f2-4eb8-b52d-e9d9860d51db'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":702,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e454ba15-45ea-4e70-bf9d-33a938a71f9d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":703,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'daa43058-86f3-40f0-a832-5fcca105f546'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":704,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7267b88a-f065-4cc8-95ea-8fb7f3d004a8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":705,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '587d145a-7d21-4856-9280-42ca87063b36'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":706,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '02089c60-6a11-4bdc-8fc5-08a95d75b619'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":707,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31d3bc20-ce7f-45a7-8326-2e5a4d2b1dc3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":708,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9a4340e-4746-42ab-a496-62df8c132d5b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":709,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '52a2973a-63ed-4feb-b6b8-4bbad8943bc3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":710,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '74b6018f-414d-4829-bdd2-a660879dadf6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":711,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '324c96d7-2340-4b98-bb51-2f1b84323e62'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":712,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c4fe166-261f-4d80-af24-d8cf0bc02d05'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":713,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b05b1045-6409-44ba-ad7f-186322edbb8e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":714,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b77217ce-eb2d-440c-a76e-586e9f410b20'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":715,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e2547cfc-f370-4cc9-95eb-39ee0640ec50'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":716,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd45db66d-6e95-49be-83a8-ffcb8828a580'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":717,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b8940905-609b-4f86-9e33-5fa8cf1d8944'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":718,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2fdb8a6-b489-4c2a-a797-1d72f074cef8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":719,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'abb3d827-534a-4ef4-b7d9-db039300f00b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":720,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '45a89277-120c-4660-a1e4-52017dc33371'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":721,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '10cb6746-f492-4afc-b74b-15a05c7e186b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":722,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2b9c9e6f-d275-4533-a15c-9c0603879666'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":723,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd2dc4f72-31a3-4e60-8523-28d1bb203fd1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":724,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f76abc57-7b27-4c6d-a755-5ba908244b3e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":725,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8405bced-051e-423c-a31b-224e3dc8ed63'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":726,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fbda3312-8515-45fc-bbf4-4d9464af58d9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":727,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '28c3b3b5-335c-4d6e-a910-86a2e5958aef'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":728,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b2db335c-c2ca-499a-9eb3-84efd6dc1a98'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":729,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '98c81953-15af-41ed-9c16-1ba656ac426f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":730,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '97e810b1-2458-4b1c-bdbe-878e0fc430a8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":731,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75982f47-9d6a-489c-8fe0-ed8f04febf3f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'block_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'unresolved_match_ambiguity'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":732,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6aceb879-8457-4b25-adc9-04c76f501182'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":733,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd32eac3a-347a-4d46-b275-5e0d3c6b0942'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":734,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b15ee6f2-1a20-4dff-b299-90c6c8bfefcf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":735,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '966d82b3-6c2f-465e-8ca1-1f0715cc2d05'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":736,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd73856b3-f7b7-4dda-94d7-9d4cc643046e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":737,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1e905da3-45ad-471e-90ee-9c51b0d2830c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":738,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd5968e62-fda9-4f39-8127-b68ad0f50549'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":739,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d028245-3342-48d3-b698-654e2317bf83'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":740,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40cc83e0-a5a2-4458-b03a-10c57392bd1a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":741,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '402a9ee0-4063-410d-bf78-60dd1911b3b1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":742,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '918ea685-ade1-444e-92af-72b737279b52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":743,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '67701853-3407-4f21-8d55-66a9ef977adf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":744,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '52160a57-7054-423e-9909-ccdbb27be349'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":745,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'da418770-e2b2-401e-be99-63a7c76b6ba4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":746,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8633266a-3ab8-402c-bba4-78901f1dda3d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":747,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd4f7b0fe-e480-4cfc-bab2-30bf201734c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":748,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '81feed15-5026-4db3-a1bc-b8a78003a4f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":749,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f92c5d94-f356-43fa-8b6e-18a80f5ef76d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":750,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '38ac7e04-23f5-47dd-bf97-f2790e86684e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":751,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'af9d71ed-2bff-4b7c-b0b0-c9e46713a884'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":752,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '69160de5-646f-4900-8602-0fe13acfec9b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":753,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd0e98cf-ab52-4337-b389-56d9e64db2bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":754,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04e89f9c-f6d2-4d66-a61e-301a0ebd5280'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":755,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9eed2751-22c7-4ea0-8df4-c7aa4af30443'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":756,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '512ac46e-40eb-4780-9068-24a281d1ddb7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":757,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c870f3dc-e32f-4643-bcf0-33a6b1a43e8d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":758,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a9da3b99-36d5-4642-a377-76a35067fde3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":759,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '29d80566-d921-4f3e-b60a-4c6730731a41'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":760,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '264d0cd1-3e8d-4188-af08-1aa47e84565b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":761,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f9c36e25-cd9c-42c8-a2eb-61e786ce47bf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":762,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f747500c-a966-453a-aad0-d6240cce0971'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":763,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2f35c738-8a56-4940-97f7-1e1f8ceca673'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":764,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '42a6b62f-4ddc-408c-a18a-5f0c77c08d7e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":765,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ef6c4da-8b3a-43a0-a5db-f92a2cde430b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":766,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a4f5373e-12e7-48ac-b747-9e755df3dbe3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":767,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eff56c88-e499-44f1-8187-9eb00ee7558a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":768,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'db69a588-6323-4f43-b1d4-a7bede879240'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":769,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '89adceb2-4294-40f3-8c66-e39769ee31e5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":770,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '520cbac5-4058-466e-9f86-4db0b9e1b199'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":771,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '748718c3-d82a-4833-b9e7-f5ebc14cf88a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":772,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2a70a242-42a9-448e-9621-31aa78cef076'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":773,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2a07546e-c6e4-4140-a729-4968fa368e8d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":774,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4d8d5ab9-0a6f-4993-a962-0c4ff43beebb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":775,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f246b004-2b00-4fb4-a791-0f998c65c3ee'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":776,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7c916a38-e9e9-40ec-9b94-26b84c96d329'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":777,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6bae6862-db9a-4036-9574-fdf15f51b94f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":778,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03c54e7b-d140-4235-8927-905be57f9cd2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":779,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '77919e3c-fecd-4d62-a9ac-03fdc6258f4b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":780,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0569ea56-d284-4b0a-8fc4-4615e7590db1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":781,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0e905f64-9721-4331-a7be-87146eed4233'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":782,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fb372b0d-9442-4724-950f-611796038f0c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":783,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1235e62b-b71d-4ad1-8d8c-07e3ef582e9f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":784,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b3c75ae4-1a4c-40d0-a9da-c7905b4f89c2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":785,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9558410-c73b-489a-a553-a3b411b9f993'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":786,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0e47c6e2-9850-436f-880b-16dc0f06f0bc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":787,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a508bda8-bdc5-4c35-bf68-ef271bd83e1a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":788,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '86b621ad-4d71-468d-a1a3-b6c695862e57'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":789,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd912b173-27e1-444e-89ff-6a99a8407dc6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":790,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '240f239e-1404-4042-8b3f-7074976d5bd3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":791,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '395bdc87-8720-4c05-a543-6c502eb68a88'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":792,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '06e57f7c-f9b4-4786-aae8-e926ffd5887e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":793,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8fb1eff5-f93e-409b-9cda-5a8c54a7ab36'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":794,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6b7fd870-1f06-479f-b81a-bf602fbae866'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":795,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6bd2ac67-a62d-4c73-a02e-e59605861107'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":796,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c3ede1a-5d00-417a-bb03-f21704d291fb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":797,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6addbfad-ea41-4cfd-9eae-bbd08ba7fe9e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":798,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2cfb662b-7406-489f-b118-c9bbcdf4e300'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":799,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '06fd8ef1-d871-4f71-a68b-33428603767b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":800,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '77b5efd6-eb8d-412e-85f3-4cd551a4c22d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":801,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e2f813d-e7b3-46b5-93dc-5ad7fbefa6f1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":802,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e9ca0f18-9305-4e88-bc8b-583f9918599a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":803,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4bf30c46-b7b7-4c4f-a394-92eb1054e749'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":804,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f6ec11c4-e939-42ed-8d1a-b6e7fabfb91a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":805,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd6b83dae-9385-4849-9328-0b00228d34bd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":806,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'de9ba5f2-5492-4a76-8ce4-83335ffcc17e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":807,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c2dc5291-e1a4-4f1d-ab6c-bebc7d7abc1e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":808,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e4b4f66-4c76-4fa8-ab80-64011dd0784a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":809,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92fee919-9ddd-4a85-a06b-939abf5e04ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":810,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e16235df-3622-40bd-b2f7-cbc3310d8246'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":811,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '48aa7571-7080-4f43-9337-f7b6d9282afe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":812,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5cd1c0c1-e97f-4843-98c7-bbca3c6ae67d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":813,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c9b63708-44e3-49ab-a4a5-9221bc25da62'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":814,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd669eb6d-c4ee-4e86-a237-3cbfa3445a2f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":815,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5a712c9d-1e4a-4176-a0b1-346be584b363'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":816,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b73bf766-fa65-4f2e-907f-0c1c687ba122'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":817,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cdd808a3-23a0-479e-b255-825fb5ad1e3d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":818,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '310f5064-3e4d-482f-9267-0e27c710cad9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":819,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1bd589d2-ce76-45dc-ad5d-a8410d82b9b9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":820,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '51afe48f-28ae-4884-8956-f40ad9e87acd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":821,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '930ae1e6-8e74-4618-987b-3b53409f2b0d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":822,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '36de686a-6b8f-4423-9eb6-9d3001340c3c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":823,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a487cfbb-bbad-4cce-bb3f-b1f9183066d1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":824,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75e2d898-4161-4cd4-978d-0382ccb9604a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":825,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f23b859a-5fd7-4ed3-92b0-843b6c4fb0df'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":826,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9dcea49e-30f0-4943-91cd-d5bf674074c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":827,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f20f196b-122d-4fc3-9482-77a6d3ddbd94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":828,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b96d14fe-fb55-4a2f-8909-1818b0645571'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":829,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0d79486e-4dd4-4817-a39e-adbebeb71271'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":830,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c373825-d821-4b64-9aea-6557d98572b2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":831,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9696694f-6fa9-43ad-b91a-f2eac0cf6c79'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":832,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fe3134cc-afc9-4f04-9d4d-09b62c193f2f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":833,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '253a3a7e-a333-4f67-ab72-14e759457297'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":834,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '32ca6219-8e81-4365-97ab-80df1d240e27'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":835,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2fae45b1-8dc5-4f45-8966-ea2e1a65c37e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":836,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0787e434-66b7-4c6d-a9f1-d271c357360f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":837,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cf402d13-a73f-4cbc-8d51-29d043e29b91'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":838,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '463bc14e-4d0c-4fdf-90a0-b34b118cd1ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":839,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7feb03ac-7bb5-44eb-8b88-b765f7d8dfd6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":840,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e3c60e4-5b29-463c-966c-2f575dbf4b15'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":841,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6ffbfe20-adf4-49dd-a593-eaf9170f9acd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":842,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8feebc28-3cc3-44fb-9766-48086bee6744'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":843,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2656048a-da52-46f8-8420-4bd8d34bd2c5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":844,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78291cb4-5848-457b-8c87-b2c414516817'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":845,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '62cc2468-6c34-4c83-8b5b-c86a1706c1cd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":846,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f5ee7823-b826-4f95-9483-325e42f6527b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":847,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '637a3d90-d9ae-444b-af18-82ccc84352d9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":848,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f8785e9b-7ad3-4ef0-8de9-902bbc9fb46f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":849,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '342acd2a-05cb-49ba-a677-3be63e3d6fb8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":850,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a2251a88-472c-42dc-94fd-c831ded13b0c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":851,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b55cb0ee-662d-4132-8968-e14468774fe5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":852,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0441683a-f2aa-40a3-97d2-0c92094f5b65'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":853,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0478e7a-3e27-43f6-8406-fa808f633c34'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":854,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0035c95c-9e10-4b4c-935a-48080594a0d0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":855,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78dffb22-6a73-479f-8f43-6fbc5911f7f5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":856,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83143700-344b-4c8b-8c69-51b4fea1d55f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":857,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ea63dd61-b6e8-4cb8-9273-92822ef271b0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":858,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c253aac6-2fc0-4bd9-98f0-c22adfe86803'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":859,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3d93d60d-3cd5-478a-9270-98ea6b431a37'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":860,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5dfddd82-200f-4078-95d3-2a8c19a9237e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":861,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '66bf9f98-023c-40fd-a304-e2fdf32f4288'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":862,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f0eabab7-814b-45be-855a-9689ebfbb3ea'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":863,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e64e874d-8bce-431f-80c9-03cc4d34dd5f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":864,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd31ec151-63b4-4753-8ade-5fded79da3b4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":865,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '373da592-eb8c-45b5-bfc0-cee644b2685e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":866,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e34e72eb-cd54-4d55-b91d-f77bef9a7ac8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":867,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cc39a0b4-d970-4350-9f7c-b8b2a598c7fa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":868,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '97f00baf-7b39-4b18-a7c6-524d06834ed6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":869,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8473a3d3-7604-453d-9f04-63da1ec8ef6b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":870,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '94543d6a-4592-44a2-a2c8-37669b4ceebe'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":871,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8b58134d-c871-4834-8baf-9523e04dd2de'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":872,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3efff157-f289-424b-a770-2c8b5f0a2dd5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":873,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87b52b2f-4c6f-4988-a666-94ca0bb02955'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":874,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '835f0820-7eb1-4da7-98da-f98f442b735f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":875,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c0dac0ff-7a27-40d1-952a-5c29294df29d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":876,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '92dcd8ff-7f67-4851-a31c-cf38ef07b60f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":877,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '188d1600-71b8-4a09-ab64-8892ad89fb86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":878,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0e183dd3-bd89-4eb1-90c3-f798da0104d6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":879,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6d5e9d5b-ad3e-410a-a63a-ac4a34dc7cb6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":880,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2c81b898-113a-408e-bda3-fe9491f52587'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":881,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c048eaf9-a393-4632-b250-27d81ec4ee53'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":882,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '42da70c2-1bab-4c4d-9c05-ae0251869f39'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":883,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f1414f98-e38c-444b-9a4a-3bb9bd41e0c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":884,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ad280a3d-cf67-48db-92ac-e081ce9141cf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":885,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e5873ab7-988b-457b-a9d7-bad46a1d598b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":886,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a18bfb3d-e9c9-4a1c-8cc2-e8fdd8e142b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":887,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd0eef98b-12c0-46d2-9777-7052c8654d5a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":888,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '61955aa1-6e7c-4836-b0e5-3fb2d695cf06'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":889,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'cc3a3143-3b49-45b5-ba5c-146c8fd8e261'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":890,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '37ae262f-ea80-406b-870d-7299f15c401f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":891,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'adc6dd2b-40b9-4c53-807d-1705d83e0a40'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":892,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '388f27ab-353b-4071-8de1-980cc49aea07'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":893,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0e8599c7-f726-42fc-815e-f86784303529'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":894,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '68ea3e69-5f7e-4a5a-9242-09748c21d9df'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":895,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd6f93c9e-94a9-4462-a90a-33059324fab1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":896,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3eaca6d2-db90-4a5d-840d-bbc37e0ac62f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":897,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0c91923f-6de9-4f65-a9a4-c77673935e9c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":898,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'aeef0ca3-94c6-4213-b7d6-7dd7e37a8296'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":899,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03d888e3-a20f-4f66-a0af-3fe5d1f1f487'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":900,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3323637c-b2ee-4c34-a318-aae7e11fa6ab'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":901,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3273c615-7e0e-40b5-a731-86fad1797db9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":902,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f768e3d-6e54-4eff-a2c0-c43304123cd5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":903,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0966f472-67f7-4876-aed4-17010325c866'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":904,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3a3d006f-da68-4b6c-81ce-f1d07e16f63b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":905,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bbc3d1a4-8cda-461e-a213-a2592bac439f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":906,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f47a26f2-4f9d-486e-a669-58f5b5c5e327'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":907,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9a87bfa1-7f69-448f-98a2-3230265e86ab'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":908,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e8934911-7658-415d-bbab-6fb62a07b60b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":909,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '856c20ab-2b75-4150-aee6-16ceecf1adf3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":910,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e6cf7249-3799-4424-8d25-e16bbe299051'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":911,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'fab4b6e3-685b-44c5-a764-321415e2e2c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":912,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c12263ef-bd24-4858-84cd-87252f9a5b46'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":913,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd9727355-096b-4698-90bc-0392f893653f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":914,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '89f0530f-9fb2-4f7d-99a9-90d0bc8ebbea'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":915,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e15c431d-8d94-4dd2-aaa6-d04d740ceba6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":916,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'f4f032f1-3fa5-4666-9fc0-bcf6eac9727b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":917,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c57494a9-1503-4d91-beae-c302daa4dbdc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":918,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd31c7999-c4a9-4cb7-a8e1-c152a17b2ec1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":919,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a7c7aee8-fb2a-486c-a97d-a274eacf6bdb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":920,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78f0523e-08bf-4ea3-8b09-c39633021931'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":921,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'dd7ac8c5-2813-4a3a-a7f3-126e6999a428'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":922,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '64bcb193-b482-4c48-8931-53bfb77f04b7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":923,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '314ab829-483b-4402-80c0-558c32cf310b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":924,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5aff12b6-0dab-49d2-a912-bd16942093b5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":925,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '959b8325-7096-4462-ba61-271c71abae19'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":926,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bc11b338-56ef-469d-8e95-09cf50b02b46'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":927,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4d1a85f3-cba2-4210-babf-2844110fcde3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":928,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '683158ad-3b80-4a04-802a-974b73faaef6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_more_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":929,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e4ebf5fd-6694-46fe-ab50-d3619d0f57f4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_active_market_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":930,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'eda169be-ebb6-41cd-870d-b0f6dc55dfe0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_active_market_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":931,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e298389-45f4-44a5-8d9c-c023ccb21883'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_active_market_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":932,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c11adb3f-8517-402f-a704-397cd81bf822'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'defer_active_market_evidence'::text,
  'system_remaining_review_safe_batch'::text,
  'reference_only_no_market_support'::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  '{"package_id":"MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1","row_manifest_sha256":"107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd","row_index":933,"source_policy_package_id":"MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1","source_policy_fingerprint":"36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f","no_public_price_claim":true}'::jsonb
);

commit;
