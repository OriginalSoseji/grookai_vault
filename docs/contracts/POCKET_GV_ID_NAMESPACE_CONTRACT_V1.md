# POCKET_GV_ID_NAMESPACE_CONTRACT_V1

Status: Active

Extends:

- `IDENTITY_DOMAIN_BASELINE_V1`

## 1. Purpose

Define deterministic Grookai IDs for TCG Pocket rows without reusing or weakening the English physical `GV-PK-*` namespace.

Pocket rows are not English physical canon. They must remain in the `tcg_pocket_excluded` identity domain unless a separate future contract promotes a different product surface.

## 2. Parent Pattern

Pocket parent IDs use:

```text
GV-TCGP-{SET_TOKEN}-{NUMBER_TOKEN}
```

Examples:

```text
GV-TCGP-A1-001
GV-TCGP-A1A-001
GV-TCGP-P-A-001
```

## 3. Child Printing Pattern

Pocket child printing IDs use:

```text
{PARENT_POCKET_GV_ID}-{FINISH_SUFFIX}
```

Approved finish suffixes:

```text
normal  -> STD
holo    -> HOLO
reverse -> RH
```

## 4. Token Rules

`SET_TOKEN`:

- comes from the Pocket set code, preferring `card_prints.set_code` and falling back to `sets.code`
- uppercase
- non-alphanumeric separators collapse to hyphen

`NUMBER_TOKEN`:

- comes from `card_prints.number`, falling back to `number_plain`
- if both fields are missing, may be recovered from an exact active Pocket source ID only when the source ID set token matches the Pocket set token
- example: `A1a-084` may provide number token `084` only for set token `A1A`
- preserves leading zeroes
- uppercase
- removes non-alphanumeric separators
- must not be guessed from name, rarity, sort order, or page position

## 5. Separation Rule

Pocket IDs must not use `GV-PK-*`.

Physical and Pocket identity spaces are separate:

- English physical: `GV-PK-*`
- TCG Pocket: `GV-TCGP-*`

This prevents Pocket rows from colliding with or masquerading as physical printed cards.

## 6. Backfill Rule

Backfill must be guarded:

- no physical rows may be targeted
- no non-null IDs may be overwritten
- proposed parent IDs must be unique
- proposed child IDs must be unique
- duplicate Pocket parent rows must be resolved before GV-ID assignment
- unsupported finish keys must fail closed
- dry-run proof is required before any write

## 7. Public Surface Rule

Assigning a Pocket GV-ID does not automatically make Pocket cards part of English physical search, master sets, vault ownership, or public physical card routes.

Any UI exposure must preserve the Pocket domain label.
