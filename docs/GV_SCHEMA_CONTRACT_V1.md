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
- `id` is the only FK target for other tables

---

### 1.2 card_prints

Represents individual printings of a card.

**Canonical Identity**
- `set_id` (uuid → sets.id)
- `number_plain` (text)
- `variant_key` (text, nullable; treat '' as “base”)

**Unique Identity Constraint**


UNIQUE (set_id, number_plain, coalesce(variant_key, ''))


**Core Columns**
- `id` (uuid, primary key)
- `set_id` (uuid, FK → sets.id)
- `game_id` (optional)
- `name`
- `number`
- `number_plain`
- `variant_key`
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
- `print_identity_key` (unique when not null)
- `ai_metadata`
- `image_hash`
- `data_quality_flags`

**Indexes**
- `(set_id)`
- `(set_code, number_plain)`
- `(tcgplayer_id)`
- `print_identity_key` unique when not null

**Rules**
- `id` is UUID and canonical.
- `(set_id, number_plain, variant_key)` is the true identity.
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

- `mapping_conflicts.candidate_print_uuids uuid[]` is the canonical column for storing candidate `card_prints.id` values. The older `candidate_print_ids bigint[]` column remains for legacy reference only; see `docs/AUDIT_EBAY_MAPPING_L2.md` for context.

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
3. Print identity = `(set_id, number_plain, variant_key)`.
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

