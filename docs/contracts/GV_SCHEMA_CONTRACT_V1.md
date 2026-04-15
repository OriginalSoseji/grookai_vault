# Grookai Vault — Schema Contract v1
_November 2025_

This document defines the canonical database contract for Grookai Vault. All future schema
changes must respect these rules.

## 1. Canonical Entities

### 1.1 sets

Represents official trading card sets.

**Identity**
- Natural key: `(game, code)` (unique)
- Surrogate key: `id` (uuid, primary key)

**Core Columns**
- `id` (uuid, PK)
- `game` (text)
- `code` (text)
- `name` (text)
- `identity_model` (text, not null, default `standard`)
- `release_date` (date)
- `source` (text)
- `logo_url` (text)
- `symbol_url` (text)

**Metadata**
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())
- `last_synced_at` (timestamptz, nullable)

**Constraints**
- `UNIQUE (game, code)`
- `identity_model IN ('standard', 'reprint_anthology')`
- `id` is the only FK target for other tables

---

### 1.2 card_prints

Represents individual printings of a card.

**Declared Identity Behavior**
- `set_id` (uuid → sets.id)
- `set_identity_model` (text, denormalized from `sets.identity_model`)
- `number_plain` (text)
- `variant_key` (text, nullable; treat '' as “base”)
- `printed_identity_modifier` (text, nullable)
- `print_identity_key` (text, required for `reprint_anthology`)

**Unique Identity Constraints**

For `standard` sets:

UNIQUE (set_id, number_plain, coalesce(printed_identity_modifier, ''), coalesce(variant_key, ''))

For `reprint_anthology` sets:

UNIQUE (set_id, number_plain, print_identity_key, coalesce(variant_key, ''))


**Core Columns**
- `id` (uuid, primary key)
- `set_id` (uuid, FK → sets.id)
- `game_id` (optional)
- `name`
- `number`
- `number_plain`
- `variant_key`
- `set_identity_model`
- `rarity`
- `image_url`, `image_alt_url`
- `image_source`
- `tcgplayer_id`
- `external_ids`
- `artist`
- `regulation_mark`
- `set_code`
- `variants`

**Metadata & AI Columns**
- `created_at`, `updated_at`, `last_synced_at`
- `print_identity_key`
- `ai_metadata`
- `image_hash`
- `data_quality_flags`

**Indexes**
- `(set_id)`
- `(set_code, number_plain)`
- `(tcgplayer_id)`
- partial unique identity indexes for `standard` and `reprint_anthology`

**Rules**
- `id` is UUID and canonical.
- set identity behavior is declared by `sets.identity_model`.
- `standard` sets use number / printed-identity-modifier / variant uniqueness.
- `reprint_anthology` sets must not rely on `(set_id, number_plain)` uniqueness and instead require `print_identity_key`.
- No duplicates.
- `set_id` must be non-null for production prints.

---

## 2. Child Tables — Must Reference card_prints.id (UUID)

### 2.1 external_mappings  
(…FULL CONTENT…)  

### 2.2 ai_decision_logs  
(…FULL CONTENT…)

### 2.3 card_embeddings  
(…FULL CONTENT…)

### 2.4 card_print_traits  
(…FULL CONTENT…)

### 2.5 ingestion tables  
(raw_imports, mapping_conflicts, ingestion_jobs)

- `mapping_conflicts.candidate_print_uuids uuid[]` is the canonical column for storing candidate `card_prints.id` values. The older `candidate_print_ids bigint[]` column remains for legacy reference only; see `docs/audits/AUDIT_EBAY_MAPPING_L2.md` for context.

---

## 3. Vault & Pricing (UUID FKs)

### 3.1 vault_items  
Must reference `card_prints.id uuid`.

### 3.2 price_observations  
Must reference `card_prints.id uuid`.  
Early TCG batch is non-authoritative.

---

## 4. Mandatory Rules (MUST FOLLOW)

1. `card_prints.id` is UUID and canonical.
2. All `card_print_id` FKs must be UUID.
3. Print identity follows the owning set's declared `identity_model`.
4. No duplicates.
5. No production `set_id IS NULL`.
6. Old experimental data is non-authoritative.
7. New ingestion/pipeline is the source of truth.

---

## 5. Purpose

Ensures:
- Pricing correctness  
- AI attachment correctness  
- Vault correctness  
- Predictable migrations  
- Zero schema drift  
