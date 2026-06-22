# Second Source Found Manual Candidates V1

Generated: 2026-06-21

This is audit-only. It preserves targeted web evidence discovered while working the 18-row `second_source_acquisition_bulk` lane.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Candidates Preserved

| set | number | card | variant | candidate finish | status |
| --- | --- | --- | --- | --- | --- |
| me02 | 026 | Suicune | EB Games Stamp | cosmos | existing_parent_route_needed |
| sm1 | 135 | Ultra Ball | Europe Championships Staff Stamp | reverse | needs_readiness_route |
| xy1 | 083 | Honedge | Regional Championships Staff Stamp | holo | needs_readiness_route |
| xy1 | 085 | Aegislash | Regional Championships Staff Stamp | reverse | existing_parent_route_needed |
| sm1 | 135 | Ultra Ball | Regional Championships Staff North America | holo | context_only_not_target_variant |
| bw5 | 25 | Vaporeon | Regional Championships Staff Stamp | reverse | needs_readiness_route |

## Important Boundary

These rows are not approved writes. The evidence is useful, but each row must pass a guarded readiness packet before any apply package exists.

Suicune and Aegislash are especially important: current readiness already reports target parent collisions, so they must route through existing-parent reconciliation, not parent inserts.

Vaporeon was added after a live residual refresh found independent staff/crosshatch evidence. It must still pass the guarded readiness route before any write package.
