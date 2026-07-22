# Pulse, Wall, Vault Product Architecture V1

Status: experimental branch contract

## Primary shell

The primary product order is:

1. Pulse
2. Wall
3. Vault
4. Scan
5. Search

Pulse, Wall, and Vault are equal product pillars. Scan and Search are global
acquisition and discovery actions that support all three pillars.

## Responsibilities

- Pulse answers **what changed** with evidence, time window, confidence, and a
  next action.
- Wall answers **what is worth seeing or sharing** through structured Grookai
  objects rather than detached screenshots.
- Vault answers **what I own and what I can do with it** through quantities,
  variants, condition, provenance, value, organization, and collector intent.

## Cross-pillar actions

Canonical card surfaces may expose:

- Open in Vault
- Watch in Pulse
- Post to Wall
- Compare markets
- Add to folder
- Mark for trade
- Share externally

Mutations and external publishing always require an explicit user action.

## Navigation rules

- Mobile docks contain exactly five destinations.
- Optional catalog utilities such as Dex, Sets, and Compare do not displace the
  primary five destinations.
- Android back returns to the immediately previous surface.
- Public links must never expose private acquisition data by default.
- External destinations are labeled before leaving Grookai.

## Reversibility

This contract and its implementation live on
`codex/pulse-wall-vault-product-architecture`. No production deployment or
irreversible database migration is part of V1.

Web alignment is explicitly out of scope for this branch. Existing web routes
and navigation remain unchanged.
