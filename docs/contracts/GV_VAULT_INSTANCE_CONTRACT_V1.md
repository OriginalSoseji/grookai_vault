# GV Vault Instance Contract V1

Status: LOCKED CONTRACT (documentation only; no schema/code changes in this file)  
Scope: Universal ownership identity for Grookai Vault objects.  
Out of scope: schema implementation, listings, offers, trades, UI, pricing, slab provenance implementation details.

## 1) Purpose
- `GVVI` identifies one owned vault instance.
- `GVVI` is scoped to the vault owner namespace.
- `GVVI` is the universal anchor for trade, sale, offers, sharing, and ownership lifecycle inside Grookai Vault.
- Every vault item must eventually have one `GVVI`.
- `GVVI` is independent of canonical card identity and slab identity.
- This identity layer exists so Grookai can support ownership and marketplace behavior for all vault objects, not only slabs.

## 2) Identity Layers
### A. Canonical identity
- `GV-PK-...`
- Answers: `what card is this?`

### B. Slab object identity
- `GV-SLAB-...`
- Answers: `which specific graded slab object is this?`

### C. Vault instance identity
- `GVVI-{OWNER_CODE}-{INSTANCE_INDEX}`
- Answers: `which specific object does this user own in their vault?`

Rules:
- `GV-PK` is not ownership identity.
- `GV-SLAB` is not ownership identity.
- `GVVI` is the ownership identity.

## 3) GVVI Identity Model
- `GVVI` format is:
  - `GVVI-{OWNER_CODE}-{INSTANCE_INDEX}`
- Example values:
  - `GVVI-G7F3A9-000001`
  - `GVVI-G7F3A9-000002`
- `OWNER_CODE` is a permanent Grookai-assigned vault namespace identifier.
- `INSTANCE_INDEX` increments within the owner namespace only.
- `GVVI` allocation is per owner vault, not per canonical card and not per slab object.

## 4) Owner Code Definition
- `OWNER_CODE` is generated when a vault is created.
- `OWNER_CODE` is immutable.
- `OWNER_CODE` is unique per Grookai account.
- `OWNER_CODE` is safe for public exposure.
- `OWNER_CODE` is independent of login credentials.
- `OWNER_CODE` must not be derived from email, username, or auth provider identifiers.

Reason:
- Ownership identity must remain stable and public-safe even if authentication credentials, usernames, or provider links change.

## 5) Core Principle
- Every row in `vault_items` represents one owned instance and must eventually have one `GVVI`.
- `GVVI` applies to raw cards.
- `GVVI` applies to slabbed cards.
- `GVVI` applies to future item types when they are ownable vault objects.

## 6) Relationship to Other Identities
### Canonical card identity
- `GV-PK` answers canonical classification.

### Slab object identity
- `GV-SLAB` answers slab object identity.

### Vault instance identity
- `GVVI` answers owned instance identity.

Rules:
- `GV-PK` classifies.
- `GV-SLAB` identifies slab objects.
- `GVVI` identifies owned vault instances.

## 7) Raw vs Slab Model
### Raw cards
- Vault instance identity is anchored by `GVVI`.
- Canonical classification is anchored by `GV-PK`.
- Raw ownership resolves as:
  - `GVVI-G7F3A9-000001`
  - `-> card_print_id`
  - `-> GV-PK`

### Slabs
- Vault instance identity is anchored by `GVVI`.
- Slab object identity is anchored by `GV-SLAB`.
- Canonical classification is anchored by `GV-PK`.
- Slab ownership resolves as:
  - `GVVI-G7F3A9-000002`
  - `-> slab_cert_id`
  - `-> GV-SLAB`
  - `-> GV-PK`

Rules:
- `GVVI` anchors ownership.
- `GV-SLAB` anchors slab object identity.
- `GV-PK` anchors canonical classification.

## 8) Concurrency Rule
- `INSTANCE_INDEX` must be allocated from the owner namespace only.
- `INSTANCE_INDEX` must not be derived from counts of `vault_items`.
- `INSTANCE_INDEX` must not be derived from counts of canonical card identities.
- `INSTANCE_INDEX` must not be derived from counts of slab identities.

This rule prevents ownership identity collisions and removes per-object sequence allocation.

## 9) Future Systems
Future systems that must anchor to `GVVI`:
- trading
- selling/listings
- marketplace
- offers
- chat about owned objects
- public sharing of owned objects
- ownership lifecycle, archival, and transfer
- provenance of ownership inside Grookai
- future marketplace behavior

## 10) Non-Goals / Exclusions
- `GVVI` does not replace canonical identity.
- `GVVI` does not replace slab cert identity.
- `GVVI` is not pricing identity.
- `GVVI` is not market-bucket identity.
- `GVVI` is not the same as external marketplace listing ids.

## 11) Red Flags / Landmines
- Using `GV-PK` as the ownership anchor.
- Using `GV-SLAB` as the ownership anchor.
- Encoding object identity inside `GVVI`.
- Tying `GVVI` allocation to object counts.
- Deriving `GVVI` from login identifiers.
- Collapsing multiple owned copies into one ownership record.
- Making trade or sale flows depend directly on canonical identity.
- Tying ownership identity to mutable market state.
- Treating slab cert history and vault ownership history as the same system.

## 12) V1 Implementation Direction
- Every `vault_items` row must gain a deterministic public `GVVI` identity.
- Future schema must support raw and slab ownership under the same universal vault-instance concept.
- Slab ownership must resolve through `slab_cert_id`.
- Raw ownership must resolve through canonical card identity.
- Future listings, trades, and offers must anchor to `GVVI`, not `GV-PK` or `GV-SLAB`.

## 13) Open Design Questions
The following implementation questions remain outside this contract:
- final `OWNER_CODE` generation method and alphabet
- final `INSTANCE_INDEX` width and allocation mechanism
- whether `vault_items` stores `card_print_id`, `slab_cert_id`, or both depending on item type
- whether an `item_kind` discriminator is required
- whether slab card classification is always derived through `slab_certs`
- migration and backfill strategy for legacy vault rows

These questions are implementation questions only. They do not change the identity rule that ownership anchors to `GVVI`.
