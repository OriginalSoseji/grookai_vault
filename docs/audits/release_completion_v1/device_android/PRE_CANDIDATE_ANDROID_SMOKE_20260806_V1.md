# Pre-Candidate Android Smoke - 2026-08-06

## Scope

This is physical-device evidence from the Samsung pre-candidate build. It proves that the current Android runtime can load the principal signed-in read journeys against production data. It does not satisfy the final-candidate or 72-hour soak gates.

## Provenance

- Source baseline: `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf`
- Branch: `release/8-week-completion-v1`
- Package: `com.grookai.vault`
- Installed version: `1.0.0` (`versionCode=21`)
- Device: Samsung `SM-S908U`
- Android release: `16`
- APK mode: debug diagnostic build
- APK SHA-256: `8e6ea62e46ad96bce6bee74e363a9f4698bb870873d0dc24292efea31b7b0203`
- Build configuration: governed `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` were supplied at compile time; values are excluded from this artifact.
- Observed at: `2026-08-06T20:18:19.9385304Z`

## Runtime Results

| Surface | Result | Evidence |
| --- | --- | --- |
| Pulse | Passed | Authenticated Pulse loaded with Discover, Following, and caught-up state. |
| Scan | Passed | Live scanner opened with camera framing, flash, history, Photos, and Vault controls. |
| Binders | Passed | Pikachu Binder loaded with `9 of 611 card prints`, owner role, shared/completed sections, and Create Binder action. |
| Vault | Passed | `1021 cards`, `215 unique`, `53 sets`; card tiles exposed printing, set/number, condition, and quantity context. |
| Search | Passed | Pikachu search returned `32 cards` with grouped printing context and Vault presence. |
| Wall | Passed | Wall loaded `30` cards and exposed exact card/set/number/condition context plus management controls. |
| Messages | Passed after rebuild | Android reconciled with web at `Inbox 10`, `Sent 7`, `Closed 2`; collector grouping and card threads loaded. |
| Message thread | Passed | Charizard ex thread opened with Poke Javi, set/number, conversation history, reply control, and truthful legacy-printing uncertainty. |
| Message card | Passed | Thread-to-card navigation opened `Charizard ex - Holo`, `Obsidian Flames #228`, Hyper Rare, printing, pricing abstention, Vault, and Want controls. |
| Runtime errors | Passed | No fatal exception, unhandled Flutter exception, Supabase failure, socket exception, or timeout was found in the bounded per-surface log checks. |

## Message Mismatch Investigation

The previously installed Samsung build displayed zero messages. Production readback proved that the account had `57` interaction rows, `9` referenced card prints, and `12` group-state rows. Production web displayed `Inbox 10`, `Sent 7`, and `Closed 2`.

After rebuilding and reinstalling from the current source with the required compile-time Supabase configuration, Android loaded the same counts. Debug-only instrumentation localized the successful path to `57` fetched interactions, `9` resolved cards, and `12` grouped summaries. That instrumentation was removed from source after the diagnosis.

Release invariant: device evidence is valid only for an APK built from the frozen release-candidate commit with the governed compile-time configuration. An older installed binary cannot be treated as current evidence.

## Screenshot Hashes

| File | SHA-256 |
| --- | --- |
| `binders_loaded.png` | `b2a8e96a880c5783d6c2dd601fa7d5da5d15d2b31975dd7158fb1bfcfe270e89` |
| `vault_loaded.png` | `683e5bfd60284d958bbd7284c5d855bbb7825640fdcb7118fb4b52f5e73d1233` |
| `search_pikachu_results.png` | `d7673345c3f74fff2b5d507b2ea80891e6eaebfcccb1a1c6aa4fa243b279a936` |
| `wall_loaded.png` | `b8bd940ce4eb262b07dc29d195d43590630290cf0ddfd8a45af97e86f0e52e9` |
| `messages_loaded.png` | `45a8ac746b415465040a38ac620a937b7c69727025c34917ffc1beade43431ef` |
| `message_thread_loaded.png` | `b05910b546e557e6906e901bd142d2416940fcb8e1afc42c329dd717989be061` |
| `message_card_loaded.png` | `04ac02b1449d5b24af88402aaa23a1e0138eccb6172aa64c18719fd140c3027b` |
| `scan_loaded.png` | `d29ef83f0205b133a7fb484d573f24a34c8acf456e78f2ad68ea2c46c9c707f0` |

## Remaining Gate

Repeat the required Android journeys from the immutable final release build after the consolidated release commit is deployed. Only that evidence may be used for final completion and the 72-hour soak.
