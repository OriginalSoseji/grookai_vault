# Square canonical artwork V1

Status: active implementation and release contract; default-off until live verification.

The owner authorized automatic canonical artwork for new and previously synced
Square items. This extends SQUARE_CATALOG_SYNC_V1 and SQUARE_COMMERCE_SYNC_V2.
No canonical image, identity, ownership, stock, pricing, tax or sale authority is
added. Existing database493 and Samsung531 remain compatible without migrations
or installation. Artwork is an optional catalog suboperation after stock.

The public exact-copy reader must reprove a currently public vendor offer and
the selected printing. The existing canonical image resolver supplies artwork;
private owner photos are never exported. Exact child images retain their truth
status. Parent fallback is representative, with a visible baked-in Roboto label
that survives POS thumbnails. Renderer V2 pads the complete card and centered
confidence footer into a square canvas; the portrait V1 live canary demonstrated
that POS center-cropping otherwise removes the card edges and footer. The renderer
version changes its stable identity, so prior accepted uploads remain historical
facts while a versioned attach promotes the corrected grookai image. Blocked, missing or unavailable artwork never
authorizes a guess and does not revoke a ready physical unit.

Fixed HTTPS origins, no redirects, bounded input/decoded pixels/output, JPEG
normalization and content hashes constrain image IO. Signed storage URLs and
credentials are never persisted in catalog, payloads, logs or client responses.
The public descriptor contains public image references or existing canonical
proxy URLs only; it cannot expose a private inventory/photo lookup.
Artwork identity hashes source bytes, confidence and renderer version, so
platform-specific JPEG/font encoding cannot create alternating duplicate images.
A separate normalized-file digest protects the retained upload bytes on replay.
Concurrent asking-price changes defer artwork until ordinary catalog sync catches up.

Existing grookai_square.operations holds an immutable versioned artwork envelope
as a catalog operation. It contains exact request, normalized bytes, content
digest, source provenance, prior image list and existing exact-copy snapshot.
Prepare and begin occur before provider writes under the ordinary fenced seller
lease. No new private schema/table/RPC or authenticated-owner impersonation is
required. The existing stage 'catalog' and sanitized artwork error codes identify
failures in durable run diagnostics.

Square CreateCatalogImage attaches a new image atomically; an existing image is
reused by exact digest filename plus expected caption through a versioned full
item upsert. Existing taxes, modifiers, SKU, prices, stock settings and seller
images are preserved. A seller-owned primary remains primary. Repeated copies
reuse the same merchant image where complete provider reads prove its identity.
Square may deduplicate an upload to an image with older seller metadata. Its
decoded pixels must match the retained image before accepting that alias; never
rename or take ownership of the seller's image. If Square leaves it unattached,
complete the retained upload and prepare a separate immutable attach operation.

Sending-process crashes, timeouts and failed receipt persistence remain uncertain.
Read the attached image before retrying the same immutable request/key; never
replace an uncertain create. A changed image list or wrong mapping requires
review. Already accepted artwork may be recorded as historical fact after an
offer change, but stale publication is not resent. Disabling new artwork retains
recovery of existing obligations. Ordinary item updates preserve all images.
New automatic image work also requires the current leased connection's auto-sync
setting. Manual sync may request images; disabled new-work flags/settings cannot
discard retained recovery. Attach receipts must prove the exact requested image
ordering, so an already attached newer image cannot leave obsolete grookai artwork
permanently primary.

Release requires source checks, real Square Sandbox upload/readback/reuse and
lost-response recovery, live public descriptor checks, a bounded production
canary, provider image readback, initial-stock backfill and a scheduled worker
proof. Image errors are persisted separately from ready stock and completed
sales. Website and worker feature flags independently control new image work.
