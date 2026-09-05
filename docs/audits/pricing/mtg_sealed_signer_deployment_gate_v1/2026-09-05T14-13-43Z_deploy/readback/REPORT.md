# MTG Sealed Signer Deployment Gate V1

- Mode: `readback`
- Producer commit: `f8af247aa1dc075d74a7839705a4ce7a561c2cc8`
- Project ref: `ycdxbpibncqcchqiihfz`
- Function: `mtg-sealed-sign-image-v1`
- Bundle SHA-256: `a721f2e784bc5273adc2c1e2641f761d3175a2e7128f9600881f4aefd76f335c`
- Plan fingerprint: `f9ecc69a99c9a9efb6727d4bd7f2f9e6c39992d6c751dd85289ea80dbbe3282d`
- Result: **PASS**

## Security Proof

- Anonymous POST: `401`
- Invalid bearer POST: `401`
- Unauthenticated GET: `405`
- Authenticated-role signing while hidden: `false`
- MTG sealed visibility: `hidden`
- Protected-state drift: `false`

## Boundaries

This gate performs read-only database transactions and HTTP probes only. It makes no database, Storage, pricing, pointer, visibility, Vault, client, or cross-game write. Function deployment is performed separately by the single-target GitHub workflow.
