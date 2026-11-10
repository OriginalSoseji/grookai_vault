# Magic individual print release dates - November 10, 2026

Magic search previously filtered and sorted exclusively by set release dates.
Rolling collections such as Secret Lair and promo collections have undated sets;
their individual prints already carry admitted, source-backed release dates.
The current inventory has 12,973 such prints. Another 979 admitted prints have
dates different from their dated set's launch. Neither case justifies changing
the set's release date.

The shared backend reader projects only the individual print date, year, scope
and provider. It requires the exact current physical identity, Magic's ordered
identity hash, one active global Scryfall owner, original source receipt/hash/as-of
metadata, matching print coordinates and a valid calendar date. Contradictory
mapping release evidence, stale identity, missing provenance and ambiguous owners
fail closed. The 436 unadmitted metadata cases retain unknown print dates;
a collection launch does not substitute for their individual issue date.

The server search adapter reuses the existing private server SDK boundary.
Privileged evidence reads are limited to candidates visible through the request's
public catalog client; only the narrow date projection leaves the worker.
Year-only candidate discovery can first read private source-date IDs, then obtains
every result through the request's public catalog visibility before qualification.
Private candidates are never authorization or published results. No private
mapping, raw body or gameplay metadata is returned.

Date filtering precedes child-printing enrichment and response pagination.
Child identities and finishes remain intact. Display, newest and oldest sorting
use the same qualified print date. Card detail, related-print and comparison
records use that shared date scope too, so opening or comparing a search result
does not substitute its collection's launch. Optional display-date transport
failures preserve the card and an unknown print date; search completeness remains
strict. Other games retain their existing date scope.
There are no schema migrations, canonical writes, Storage operations, pricing
changes or Vault mutations in this change.

Verification includes actual rolling-set source fixtures, stale/ambiguous-owner
and identity cases, unknown/invalid dates, requester visibility, complete evidence
pagination, child-date retention, date-sort and cross-consumer behavior. The original advertised
Pokemon examples remain covered by the existing regressions. Production build
and focused contracts pass. A real SDK qualification checked all 1,596 1993 date
candidates with current requester visibility and source ownership; its longest
GET was 6,534 characters, below the 8 KB proxy limit. Scope is capped at 20,000
candidate IDs, and broad or incomplete queries fail explicitly without publishing
truncated success. The existing complete-search timeout also remains in force.

Read-only date-specific full-cohort qualification reparses each admitted date from
its durable original source member, including current members of historical
identity bridge pairs. It pins and archives the executed pure reader, domain
identity serializer and audit sources. Publication requires that proof plus the
normal managed commit/push, hosted checks and actual production readback.

Operator evidence lives in `C:/grookai_vault/docs/audits/` under
`catalog_mtg_release_projection_v1_20261110` (baseline, SDK, runtime and release
proofs) and `catalog_mtg_release_projection_release_v1_20261110` (full-cohort source
qualification). Preparation failures remain recorded; they are not successful
qualification. The preliminary audit was replaced after source hardening; only
the final pinned run qualifies the released reader. No populated proof lab reset.

Full catalog cleanup remains partial. Artist, taxonomy, species, source identity,
printing, image and sealed-product queues are unchanged by this consumer repair.
