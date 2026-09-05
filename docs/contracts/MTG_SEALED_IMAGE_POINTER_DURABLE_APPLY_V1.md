# MTG Sealed Image Pointer Durable Apply V1

## Purpose

Activate the already-frozen MTG sealed image release through the governed
compare-and-swap pointer function while preserving hidden sealed visibility.

## Preconditions

- The durable image release is frozen and manifest-exact.
- Its source price release is still the active frozen MTG price release.
- The image-pointer function repair migration is present and read back.
- The current MTG image pointer is absent.
- The production rollback canary passed with zero residue.
- MTG sealed visibility remains `hidden`.

## Authorized Mutation

One call to `sealed_product_set_active_image_release_v1` may insert exactly one
MTG pointer row from the expected `null` baseline. No direct table write is
allowed.

Before commit, the executor must prove exact pointer readback, release/price
binding, one structurally eligible object, hidden signing denial, and exact
transaction write attribution. After commit, a new read-only connection must
repeat those proofs and show protected state unchanged apart from the permitted
pointer row.

The executor must also prove a stale second activation using expected pointer
`null` is rejected with SQLSTATE `40001` and leaves the active pointer unchanged.

## Exclusions

This gate does not authorize image evidence, Storage, pricing, visibility,
Vault, signer, RPC, client, cross-game, update, delete, or cleanup operations.

## Next Gate

After exact durable readback, review and promote the image-backed pricing RPC V3
migration separately. Signer deployment, client integration, visibility, and
scheduling remain later gates.
