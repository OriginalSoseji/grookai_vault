# Compact Master discovery V1

The pure `normalizePricingCompletionMasterDiscoveryV1` adapter validates the
complete pinned Master V6 capture through `readPricingCompletionMasterCensusV2`.
It retains the existing transport, RPC, publication, census and terminal checks,
while avoiding construction of the duplicate legacy snapshot and observations.
The original V2 normalization API remains available with its original outputs.

Work is identified by real Master UUIDs: `master_printing` carries the printing,
USD and NOT_CONDITION_SPECIFIC dimensions; `catalog_parent` carries the parent
UUID, including parents with no child. A missing child never gets a fabricated
printing ID. Catalog and price issues for the same printing are merged. Parent
and printing entities are counted separately and are not distinct-card totals.

Evidence contains retained parent/printing fields and exact application price
status. Source-run IDs and capture clocks belong to the generation provenance,
not semantic work identity. Current source age must remain within 24 hours at
intake. The complete inventory stays in the pinned original capture; compact
queue records do not imply that omitted, priced cards were never inventoried.

The adapter has no database access, completion API or repair authority. Absence
from a subsequent generation is not proof of repair. Mapping and classification
still require their separate authority; a source quote is not a published price.

Qualification: 23 Master adapter contracts passed in offline Windows Sandbox.
An explicit historical-clock replay of the 82,715,924-byte V6 capture produced
49,433 work entities: 43,261 printings and 6,172 parents. Maximum serialized
evidence was 926 bytes, below the discovery queue's 4 KiB limit. This historical
replay is not current feed admission or scheduled runtime qualification. Evidence
is retained externally in `output/master-compact-v1-historical-replay`.
