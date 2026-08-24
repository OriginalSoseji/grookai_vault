# Pokemon New-Set Discovery Monitor V1

## Purpose

Detect new English Pokemon TCGPlayer groups within 24 hours of their arrival in
the governed TCGCSV warehouse. Discovery creates review evidence. It never
creates or updates canonical sets, cards, printings, mappings, images, prices,
publication rows, or Vault data.

## Evidence Flow

```text
TCGCSV immutable source artifact
  -> tcgcsv_source_groups warehouse row
  -> read-only discovery reconciliation
  -> canonical exact / ambiguous / review required / candidate backlog
  -> governed staging and separate canonical promotion
```

Canonical reconciliation uses, in order:

1. an explicit TCGCSV or TCGPlayer group ID carried by canonical set evidence;
2. a unique normalized set name; or
3. a unique normalized name plus release date when duplicate names exist.

An abbreviation alone is never identity authority. Ambiguous candidates remain
review-required. Product, promo, deck, and collection groups remain visible in
the backlog but do not masquerade as expansion-set matches.

## Runtime Contract

- Worker: `POKEMON_NEW_SET_DISCOVERY_MONITOR_V1`
- Schedule: daily at `12:15 UTC` with up to ten minutes of jitter
- Workload class: B
- Database transaction: `READ ONLY`
- Statement timeout: 30 seconds
- Lock timeout: 5 seconds
- Source freshness maximum: 36 hours
- State: `/var/lib/grookai/new-set-discovery`
- Alerting: deduplicated operations webhook for review-required candidates;
  systemd `OnFailure` for execution failure
- Canonical writes: prohibited

The durable state records the last source run, group fingerprints, candidate
fingerprint, last alert fingerprint, report path, and report hash. A source run
that is missing, partial, failed, stale, or contains row failures causes the
monitor to fail closed.

## Promotion Boundary

Discovery is not publication authority. A candidate must enter a separately
governed staging/acquisition flow with source artifacts, expected counts,
identity-domain classification, image truth, collision checks, and an explicit
canonical promotion result.

## Rollback

Disable the timer. The monitor owns only its filesystem artifacts and has no
database rollback path because it performs no database mutation.
