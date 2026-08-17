# Chat Safety Contract V1

## Purpose

Grookai collector messaging is a signed-in, card-centered communication surface.
It is not a general public chat room. Chat Safety V1 keeps ordinary collecting
conversation usable while preventing clear safety risks from being sent through
the supported web and Flutter clients.

## Active Policy

Every new message and reply must pass the versioned
`CHAT_SAFETY_POLICY_V1` decision before a supported client writes it.

The policy blocks:

- personal email addresses and phone numbers;
- non-Grookai external links and off-platform contact requests;
- gift-card, wire, cryptocurrency, and named off-platform payment requests;
- direct threats, targeted harassment, and sexual solicitation;
- first-person self-harm statements, with a crisis-support response;
- obvious repeated-character or repeated-word spam;
- empty messages and messages over 2,000 characters.

The policy does not apply a blanket profanity or sentiment ban. Ordinary
collector wording such as `sick card`, `killer artwork`, price discussion, and
card names must remain usable when they do not form a prohibited claim.

## Enforcement Layers

- Web create and reply actions screen messages before database work.
- The central web insertion helper screens again before its authenticated or
  owner-write fallback path.
- Flutter create and reply services screen messages before database work.
- Existing two-way `trust_blocks` enforcement remains authoritative for normal
  message eligibility.
- Existing `trust_reports` rows preserve user reports and founder decisions.

This release is client and web-server enforcement. Database enforcement remains
a gated follow-up because linked migration history is not clean:
`20260816160000_mtg_tcgplayer_market_publication_v1.sql` is present locally and
not recorded remotely. A new chat trigger must not be stacked behind or applied
around that unrelated pending migration.

Until the database follow-up is applied, a deliberately crafted direct Supabase
request could bypass content screening even though normal Grookai clients cannot.
The product and store evidence must state that limitation accurately.

## Reports And Review

Collectors can select `spam`, `harassment`, `scam`, `inappropriate`, or `other`
and may add details. Reports never mutate or hide content automatically.

The founder-only `/founder/trust-safety` queue reads existing reports and may
move them among `reviewing`, `actioned`, and `dismissed`. The queue:

- requires founder entitlement;
- uses the server admin client only after founder authorization;
- never edits message text;
- never deletes reports, messages, users, or Vault data;
- preserves resolved rows as review history.

## Invariants

- Existing messages and reports are never rewritten by Chat Safety V1.
- A blocked message creates no `card_interactions` or secondary signal row.
- Safety checks must run before duplicate detection or a message insert.
- Block/report controls remain available from message surfaces.
- No automatic account suspension, deletion, or public accusation is permitted.
- Policy changes require versioned tests for both blocked risks and benign
  collector-language false positives.

## Next Database Gate

After the pending MTG migration is resolved and strict linked-schema preflight is
green, prepare a separate forward-only migration for bypass-proof database
screening, rate limiting, and moderation provenance. Replay it locally, inspect
RLS/grants, and obtain explicit production migration authorization before apply.
