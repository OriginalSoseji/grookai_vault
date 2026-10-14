# Pricing Checkpoint 133: TCGPlayer Pricing Completion Agent

## Status

`AGENT LIVE IN CONTROL PLANE - SCHEDULED WORKFLOW CANDIDATE VERIFIED`

## Outcome

Grookai now has a dedicated operations agent for the full TCGPlayer pricing
backlog: `tcgplayer-pricing-completion-v1`.

Implementation PR: `#646`.

The agent turns pricing completion into a persistent outcome instead of a series
of disconnected manual investigations. Every six hours it:

1. reads the latest verified production publication;
2. partitions every unpublished observation into its repair lane;
3. builds the Pokemon-only identity worklist;
4. runs the exact mapping planner against the same source sync;
5. selects a next group only when reviewed exact candidates exist;
6. heartbeats the result into the operations control plane; and
7. preserves the complete run evidence for 90 days.

It does not write canonical identities or publish prices. Those mutations remain
behind their existing bounded mapping, shadow reconciliation, production
activation, and independent readback gates. This split lets the completion agent
run continuously without turning an uncertain card identity into a wrong price.

## Live Registration Proof

The worker was executed against production through verified TLS and registered
the fourth enabled operations agent. Run `local-registration-20261014-v3`
completed successfully at `2026-10-14T14:20:37.403Z`.

Its measured state was:

- selected observations: 208,577
- published observations: 165,769
- unpublished observations: 42,808
- identity-mapping backlog observations: 30,814
- identity-mapping source products: 28,540
- identity-mapping source groups: 576
- verified exact mapping candidates after the McDonald's apply: 0
- blocked source products in the bounded exact planner: 734

The next action is `expand_reviewed_pokemon_set_authority`. The largest
unreviewed Pokemon group remains informational and cannot be mistaken for an
apply-ready batch.

## Failure Semantics Repair

The universal catalog workflow previously ran the independent Pokemon warehouse
coverage job with `--require-complete`. The inventory audit correctly found a
large unresolved backlog, but the flag converted that expected incomplete state
into a failed GitHub job. This produced a misleading control-plane error even
when discovery itself succeeded.

The scheduled job now measures and preserves every warehouse product without the
completion-only exit condition. Its artifacts still expose unresolved, overdue,
and untracked counts. Completion remains strict; the workflow simply reports the
backlog as work rather than a crash.

## Boundaries

- Remote PostgreSQL connections retain `rejectUnauthorized: true` and consume
  `SUPABASE_DB_CA_CERT` when the workflow supplies the project CA.
- The agent's database session is read-only through `PGOPTIONS`.
- Only operations registration and heartbeat RPCs may write.
- No backlog size, group size, name similarity, or set guess grants mapping
  authority.
- Zero unpublished observations is the only complete pricing state.
- Evidence-blocked cards remain visible and assigned; they are never silently
  removed from the denominator.

## Current Release in Flight

The 25 reviewed McDonald's 25th Anniversary mappings are already committed in
production and cover 50 expected Normal/Holo observations. Governed shadow run
`mtg-global-market-shadow-38575692018-1` uses source run
`6afde958-f5ca-4ab1-bc0d-47d8db954330`. It must reach reconciled
`shadow_verified`, then pass the existing production guard and independent
25-mapping/50-price readback before this batch is counted as live.

## Next Repair Batch

After the McDonald's readback, refresh the backlog and expand reviewed authority
for the highest-value Pokemon group with complete source and canonical evidence.
The current leading candidate is the 30-card 30th Celebration Classic Collection
group, but its canonical `30c-classic` set also requires printing-completeness
verification. Do not map its 28 apparent exact name-and-number matches until the
two residual products and the canonical child-printing state are reconciled.
