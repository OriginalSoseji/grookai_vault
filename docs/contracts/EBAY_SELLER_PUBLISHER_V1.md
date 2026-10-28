# eBay Seller Publisher V1

## Status and scope

Active implementation contract; isolated candidate, default off. No live seller
linking or listing publication is established by this document. Existing market
searches, grookai sale intent and owner-recorded sales retain their meanings.

This workflow links an authenticated collector's eBay seller account and lists
one owned, active exact copy on EBAY_US. Native and web use the same durable
server authority. It does not fabricate an order, payment or sale receipt.

## Account linking

- Verify the grookai bearer or server session through the shared Supabase SDK.
  Never trust a client-supplied owner or parse a JWT as authentication.
- Persist independent, cryptographically random, hashed state, launch capability
  and browser nonce with an owner, environment, expiry and consumed state.
  Native receives only a short-lived launch capability, never a user token URL.
- Browser launch consumes that capability once and sets a Secure, HttpOnly,
  SameSite=Lax cookie. Callback must atomically consume an unexpired state bound
  to that cookie and original owner before the one-attempt code exchange.
- Record interrupted or uncertain exchanges durably. Never retry an ambiguous
  authorization-code exchange automatically. A native return contains status
  only; it never contains credentials, provider code or launch capability.
- Use only the required base, sell.inventory, sell.account.readonly and
  commerce.identity.readonly scopes. Do not request contact, address or private
  identity scopes. Verify the immutable provider user ID through Identity API.
- Bind each environment/provider seller identity to one grookai owner. Never
  transfer an existing binding during relinking or accept a different seller
  as an implicit replacement.
- Provider access and refresh tokens remain server-only. Owner reads use an
  explicit safe projection. Remove legacy owner token-table CRUD while retaining
  existing service-only order workers. Refresh failures stop provider writes.
- Configuration must match the registered production keyset and OAuth-enabled
  RuName. No invented RuName, default callback fallback, new credentials or
  disabled legacy callback can substitute for the qualified flow.

## Listing preparation and review

- Drafts belong to one owner and active exact copy, preserving canonical parent,
  verified printing, grade/certification and copy condition. Unknown condition
  requires an explicit seller choice; it is never mapped silently to Near Mint.
- Draft revisions are optimistic and immutable once reviewed for publication.
  Bind review to the exact normalized payload, photos, policies, fee response,
  revision and seller account. Every material edit invalidates that review.
- Fetch seller policies and inventory locations, category suggestions/aspects,
  and category condition policies through the current official APIs. Validate
  required category aspects and provider condition descriptors. Do not guess
  numeric IDs, seller eligibility or category requirements.
- The collector supplies photos of the physical copy. Store them privately,
  validate ownership, size and decoded dimensions, strip metadata server-side,
  and upload bytes through the Media API. Do not publish catalog artwork, expose
  private storage, or fetch arbitrary user/provider URLs. Validate EPS receipts
  and Location origins/paths before use.
- Prepare a stable SKU and unpublished offer. Read actual supported listing fees
  for the offer and display currency, limitations and the reviewed price/shipping
  terms. Do not present an invented final-value fee or net proceeds as a quote.
- Preparing, saving, linking or reading fees never publishes. Publication requires
  an explicit final action for the same reviewed revision and payload hash.

## Operations and inventory authority

- Private Postgres authority owns drafts, reservations, operation leases, attempt
  IDs, provider receipts and state transitions. HTTP routes are thin; provider
  orchestration and transports live in backend workers using the shared client.
- Serialize provider mutations for a draft and seller. Persist a stable SKU and
  known offer/listing IDs before subsequent mutations. Never automatically replay
  an ambiguous create/publish/withdraw response. Reconcile using provider reads.
- Atomically reserve the exact copy before publication. Publishing, live and
  uncertain reservations block other publication, canonical disposition, archive
  and identity changes. An uncertain listing must not lose its reservation merely
  because a worker lease expires.
- Release a publication reservation only after definitive non-publication or
  provider-ended/withdrawn evidence. Provider authentication failure, timeout or
  missing response is not proof that a listing ended.
- Existing canonical sale/trade writers remain the only inventory disposition
  authority. Recording an external sale while an eBay listing may be live is
  blocked until that listing has a verified safe terminal state.
- No public listing or permission expansion occurs in QA without the collector's
  concrete final action. Disposable grookai accounts do not make a real eBay
  listing or financial transaction disposable.

## Release evidence

Default-off controls separate linking, draft/provider preparation and publication.
Owner permissions, state replay/expiry, simultaneous operations, stale review,
bounded provider responses, strict TLS, interrupted calls and inventory conflict
paths require runtime proof. Fixture transport tests alone cannot qualify release.

Any forward schema release starts from the verified 479 baseline with a new exact
scope and payload. Applied migrations and consumed gates remain immutable. Prove
full fresh replay, retained data/auth/storage, no-op, complete public schema and
security equivalence before official CLI deployment. Never reset populated proof
labs, repair migration history, or use ad-hoc remote SQL mutation.

Release requires normal hooks, hosted checks, an integrated signed build, actual
seller consent and provider readback. Report unverified steps explicitly.
