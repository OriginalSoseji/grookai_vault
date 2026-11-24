# Full-size public QR qualification

This extends the prepared Square scale candidate with a development-only web
mode for the existing isolated 100,001-copy laboratory. It changes no pricing,
identity, authentication, inventory, payment or production routing authority.

`NEXT_PUBLIC_SQUARE_SCALE_LOCAL_TEST=true` admits only
`http://127.0.0.1:55881/`. The normal local target and every earlier test mode
retain their original scopes. Mixed modes, other ports, aliases, credentials,
paths, query strings, fragments and remote databases fail. Web bootstrap also
requires authenticated local staging, disabled telemetry, no read-only preview,
no Vercel target and no production activation. The production release validator
rejects the new flag, including malformed activation values.

The earlier exact-source web probe refused this unrecognized target. Its failed
receipt and server logs remain preserved. The successor uses the new explicit
scope; it does not forge production settings, reuse another lab's port, or patch
an archived guard. A frozen Git index archive supplies the server source, with
only ignored dependency junctions and local runtime settings outside the repo.

All 42 focused staging/release checks passed, including the new target and
bootstrap cases and existing authenticated-staging/production-release tests.
Run them with:

```powershell
node --test --test-concurrency=1 tests/contracts/square_scale_local_target_v1.test.mjs tests/contracts/collector_authenticated_staging_v1.test.mjs tests/contracts/collector_production_release_v1.test.mjs
```

Four anonymous HTTP cases passed against the full-size database: the newly
created default-priced copy and existing manual, preset and default copies.
Each public offer API returned the current source asking price; each permanent
`/q/{gvvi}` returned the correct 307 redirect and its page rendered that same
vendor asking price. Responses prohibit caching. Invalid and absent identifiers
returned 404 without exposing an offer. The application source did not change
any existing price, copy or claim during these GET requests.

Playwright checked the new copy at $17.00 and the manual copy at $7.77 across
390×844, 360×800 and 1280×900 viewports. All six cases passed anonymous routing,
visible vendor asking price after ordinary scrolling, no horizontal overflow,
and bundled Roboto. Screenshots were inspected. Synthetic catalog rows have no
artwork; their visible image fallback is expected and does not qualify image
upload/rendering. These are viewport checks, not a physical Samsung test.

The first browser attempt waited for network idle, which local development
connections prevented. The next attempt's `scrollIntoViewIfNeeded` did not
account for the fixed mobile dock. The final verifier waits for the actual
price and fonts, performs a normal wheel scroll and verifies its unobstructed
position. It changes no document styles or product behavior. Earlier logs are
retained. Anonymous navigation-shell requests return the expected 401; the
public offer remains readable without sign-in.

Evidence is retained under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-523-v1/qr-http-v2/`:
`prepared.json`, `http-result-v1.json`, `browser-result-v3.log`, the
versioned verifier sources, HTML captures and phone/desktop screenshots.
All traffic uses the loopback server on 54490 and the isolated database on
55881. No production request or write is credited by this qualification.

The separate ordinary-check continuation operates the genuine installed clock
and commerce paths on the same retained full-size dataset, with simulated
250ms Square transport. It preserves source-copy fingerprints, prices, SKU
mappings, artwork bindings and quantities after each bounded cycle. Only its
terminal receipt can establish a complete queue drain. Do not infer hosted
timing, real provider capacity or native Edge/UI acceptance from these public
QR or local clock results. Production publication and exact SQL release gates
remain separate.
