# Verified Catalog Image Delivery

Date: 2026-09-16 UTC. Base main: d3a125e25bd8fc6278801d280a7ef57fcbe83eaf.
Branch: fix/verified-catalog-image-source-20260916.

The bounded 30th Celebration apply published 191 English parents across two
sets. Files were already privately hosted and byte-verified. Live card-image
requests returned 404 because delivery recognized only image_source=identity.
The records use the schema-permitted self_hosted_verified_external_exact_product_v1.

This patch recognizes that exact source in the shared web predicate, canonical
batch lookup and native set-grid resolver. It does not admit arbitrary prefixes,
rewrite records, change bucket permissions, or upgrade representative_shared
artwork to exact physical finish evidence. Canonical route visibility and path
checks are unchanged. Pricing, printing and regional admission remain separate.

No catalog writer, payload or raw intake artifact is part of this release.
Production apply receipts are preserved separately under
C:/grookai_vault_operator_artifacts/pokemon_30th_20260916/parent-execution-v3.

Release gate: source/contract checks, web typecheck and build; preserve the
current deployment, verify candidate image bytes and public catalog routes,
then promote and repeat live checks. Native source is included for the next app
build; web deployment alone is not a new installed mobile build.

Operator release receipts:
C:/grookai_vault_operator_artifacts/pokemon_30th_20260916/image-delivery-release.
