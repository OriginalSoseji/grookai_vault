# Japanese DP4 Porygon identity repair

The exact official images and printed Pokédex numbers identify DP4 104 as Porygon2 and 105 as Porygon-Z. These records had unrelated English identity candidates, despite correct primary species links. The pinned official images and pages, the species-name source, and full preimages are retained here and in raw imports. Only the two English identity payloads were changed; all existing species links and parent records were preserved.

The same-writer rollback rehearsal passed in run `d7bf4abc-0561-48e1-b64a-fa8c92694b8a`. Production application run `28556146-8848-4dae-9e1c-f391bc030958` produced durable receipt `177103`; a separate read-only audit verified both complete postimages, original links, identity hashes and source packages. The runtime preflight initially rejected a missing audit registration; after the registration was added, the preflight passed with documented deferred debt.

This bounded correction is not proof of complete catalog quality or resolver launch readiness. Coordinate integration with the other DP4 repairs because their execution registries overlap.

Follow-up: after the independent readback above, a separate official-source artist fill changed the parent `artist` field on both cards (receipt `177107`; `docs/audits/jpn_dp4_artist8_20261120/`). This writer's strict verification deliberately expects the earlier complete parent preimages, so it will now report parent drift. Use the historical readback together with the later artist receipt when reconstructing the sequence; do not rerun or alter the original proof to conceal that subsequent change.
