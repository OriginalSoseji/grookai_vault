# MTG Sealed Image Pointer Rollback Canary V1

## Purpose

Prove the exact MTG sealed image release compare-and-swap activation path
without leaving an active pointer or changing visibility.

## Preconditions

- Frozen image release `86b207e6-4f73-5d9a-af40-864c47256c38` exists with
  manifest `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`.
- Active frozen price release is
  `25626032-7d72-5542-a8e0-7a6532c2f776`.
- Image release and price release use the same `mtg` authority.
- The MTG image pointer is absent.
- MTG catalog visibility is `signed_in`; MTG sealed visibility is `hidden`.

## Canary

1. Capture the complete production evidence-release, pricing, visibility,
   security, and cross-game baseline read-only.
2. Select one exact, fresh, byte-verified member as the signing candidate.
3. Begin one repeatable-read transaction and repeat the preflight.
4. Call `sealed_product_set_active_image_release_v1` with the target release,
   expected current pointer `null`, and the frozen reviewer identity.
5. Read the pointer back exactly and verify active price-release binding.
6. Prove the selected object satisfies the complete structural image, price,
   and freshness chain under the transient pointer.
7. Confirm authenticated signing remains denied because sealed visibility is
   still hidden. Pointer presence alone must never grant client access.
8. Confirm RPC V3 remains an undeployed migration candidate.
9. Verify transaction write attribution contains exactly one pointer insert.
10. Roll back and reconnect read-only to prove the pointer is null and every
    protected release, security, pricing, visibility, and cross-game boundary
    is unchanged.

## Boundaries

This gate authorizes one transient image-pointer insert inside a transaction
that must roll back. It authorizes zero durable database writes and no Storage,
evidence, pricing, visibility, Vault, signer, client, or cross-game operation.

It does not authorize durable pointer activation.
