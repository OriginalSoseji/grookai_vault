# Grookai AI Product Boundaries V1

Status: proposed

Date: 2026-06-17

## Objective

Define clear product boundaries between:

- Grookai Search
- Grookai Assistant
- Grookai Intelligence

The goal is to keep everyday catalog search fast, free, deterministic, and trusted while reserving AI costs for premium reasoning and power-user workflows.

## Core Principle

AI must never be required for basic catalog search.

Grookai canon remains the source of truth. AI may explain, summarize, recommend, and translate user intent, but it must not invent card facts, decide canonical truth, write database rows, or execute arbitrary SQL.

## Product Boundary Summary

```text
Grookai Search = free deterministic catalog interface.
Grookai Assistant = premium AI collector help.
Grookai Intelligence = vendor / power-user AI and analytics layer.
```

## 1. Grookai Search

Grookai Search is free.

Grookai Search is the default search box everyone uses.

It must support natural language through deterministic parsing and typed filters, not model calls by default.

Allowed Search capabilities:

- natural-language deterministic parsing
- structured filters
- variants
- stamps
- ownership
- years
- artists
- sets
- finish families
- image truth state
- species and Dex search where supported

Required examples:

```text
all reverse holo Pikachu cards from 2014 to 2026
Build-A-Bear stamped Piplup
Toys R Us stamped cards
cards missing images
reverse holos I own
Komiya cards
exact image Charizards
cards missing from my vault
```

Grookai Search must continue improving deterministic natural-language coverage before introducing AI fallback.

### Search Cost Rule

Grookai Search must not call AI models during normal search execution.

Allowed exceptions:

- explicitly gated experiments
- founder/admin debug tools
- user-triggered upgrade path into Grookai Assistant

## 2. Grookai Assistant

Grookai Assistant is premium.

This is where collector-facing AI lives.

Allowed Assistant capabilities:

- answer "what variants am I missing?"
- explain why a card or variant is special
- build chase lists
- compare a user's collection to the Master Index
- summarize collection gaps
- suggest collection goals
- explain stamp, error, first-edition, and variant context using sourced Grookai data

Assistant output must be grounded in Grookai data.

Assistant may reason over:

- Master Index
- card identity rows
- child printings
- variant provenance
- vault ownership
- image truth
- special-case explanation data
- market data where available

Assistant must not:

- create canonical truth
- invent variants
- invent prices
- write to the database
- execute SQL
- mutate vault ownership
- override deterministic search results

## 3. Grookai Intelligence

Grookai Intelligence is for vendors, power users, and operational workflows.

Allowed Intelligence capabilities:

- catalog gap detection
- demand signals
- Shopify exports
- collection audits
- inventory recommendations
- pricing and listing work queues
- missing-image work queues
- source coverage analysis
- vendor-facing inventory strategy

Grookai Intelligence may be more expensive because it supports commercial workflows.

It must still be grounded in Grookai data and must still obey write gates.

## Tiering

### Anonymous Users

- Grookai Search only.
- No AI calls.
- Presets and deterministic filters allowed.
- Assistant prompts may be shown as locked premium entry points.

### Free Accounts

- Grookai Search.
- Vault-aware deterministic search where supported.
- No automatic AI calls.
- Optional very limited Assistant trial may be introduced later only with explicit user action and budget controls.

### Paid Subscribers

- Grookai Search.
- Grookai Assistant.
- Higher AI limits.
- Collection-aware AI prompts.
- Chase lists and Master Index comparison.
- AI explanations for special variants.

### Founder/Admin

- Highest AI limits.
- Debug explain mode.
- Parser versus AI comparison.
- Cost telemetry access.
- Feature testing.

### Vendor / Power User

- Grookai Intelligence.
- Commercial analytics.
- Inventory/export workflows.
- Higher-cost AI lanes allowed only under explicit entitlement.

## AI Invocation Rules

AI may only run when:

- the user explicitly invokes Grookai Assistant or Grookai Intelligence
- the user is entitled for the feature
- deterministic Search has already had a chance to parse the query
- the request is logged for cost telemetry
- the output is constrained to an approved schema or grounded response type

AI must not run:

- on every keystroke
- for simple deterministic searches
- for anonymous users
- for basic search result ranking
- to generate SQL
- to decide canonical card truth
- to mutate data
- to hide or delete rows

## AI Output Rules

AI output must be one of:

- typed filter proposal
- grounded explanation
- collection gap summary
- chase list proposal
- vendor intelligence report

AI output must include:

- confidence or limitation language where relevant
- source grounding where card facts are cited
- user-visible distinction between Grookai canon and AI commentary

AI output must fail closed when facts are insufficient.

## Cache And Cost Controls

Required controls:

- cache AI interpretations by normalized prompt and entitlement context
- no model calls for cached identical interpretations
- daily/user limits
- global kill switch
- per-feature cost telemetry
- admin-visible usage summaries
- model tier selection by product lane

Recommended defaults:

- Grookai Search: no AI model
- Grookai Assistant: low-cost model for query planning and summaries; stronger model only for deeper collection reasoning
- Grookai Intelligence: explicitly metered model usage

## UI Disclosure

The UI must clearly distinguish:

```text
Grookai Search understood:
Pikachu / Reverse Holo / 2014-2026
```

from:

```text
Grookai Assistant says:
These are the Pikachu reverse holo gaps in your vault.
```

Users should know when they are using deterministic Search versus AI Assistant.

## Forbidden Behavior

The system must not:

- make AI mandatory for search
- call AI silently for every search
- let AI write or mutate DB state
- let AI generate arbitrary SQL
- let AI create or promote canonical card facts
- let AI make unsupported pricing claims
- let AI invent missing variants
- let AI override Master Index truth

## Relationship To Smart Search V1

`GROOKAI_SMART_SEARCH_V1` remains the governing contract for free deterministic search.

This contract governs when AI may exist around that search system without turning search itself into an uncontrolled AI-cost surface.

## Final Rule

Grookai Search should feel intelligent because Grookai data is structured and trustworthy.

Grookai Assistant should feel intelligent because AI helps users reason over that trusted data.

Grookai Intelligence should feel powerful because AI and analytics help commercial users act on that trusted data.
