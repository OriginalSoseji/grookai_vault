# PokeScope PL2 Variant Acquisition V1

Generated: 2026-06-06T16:45:00.000Z

Audit only. No DB writes, migrations, cleanup, quarantine, or canonical mutation were performed.

This bounded evidence packet adds only exact Rising Rivals card-level finish facts that PokeScope exposes with set, card number, card name, and finish label.

| status | rows |
| --- | ---: |
| validated | 3 |
| blocked | 2 |

Validated:

| set | number | card | finish | source |
| --- | --- | --- | --- | --- |
| pl2 | 32 | Rhyperior E4 | holo | https://pokescope.app/card/pl2-32/ |
| pl2 | 96 | Team Galactic's Invention G-109 SP Radar | stamped | https://pokescope.app/card/pl2-96/ |
| pl2 | 98 | Volkner's Philosophy | stamped | https://pokescope.app/card/pl2-98/ |

Blocked:

| set | number | card | finish | reason |
| --- | --- | --- | --- | --- |
| pl2 | 92 | Lucian's Assignment | stamped | No usable exact PokeScope page evidence found for stamped finish. |
| pl2 | 102 | Upper Energy | stamped | PokeScope page lists Reverse Holofoil and Normal, not League Stamp/stamped. |

Guardrail: League Stamp maps to `stamped` only when the exact card-level page lists that finish variant. No general set, rarity, or tournament-product inference is used.
