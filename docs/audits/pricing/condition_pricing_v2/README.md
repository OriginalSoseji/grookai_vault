# Condition pricing V2 evidence

See the [checkpoint](../../../checkpoints/pricing/TCGTRACKING_CONDITION_PRICING_V2_20261117.md)
and [contract](../../../contracts/TCGTRACKING_CONDITION_PRICING_V2.md).

`live-readback.json` records the shared backend reader against current production
mapping truth and the published source: seven printings, 35 selections, 23 prices,
12 unavailable. Each resolved selection, including missing amounts, is checked
against the exact source product, finish, language and condition. Source/module
hashes and provider timestamps are recorded. There are no production writes,
credentials or provider datasets in this report. Its timestamp is UTC; this work
occurred on November 17 in America/Denver.

`browser-result.json` records the passing Playwright CLI check in
`browser-checks.js`. The fixture mounts the actual Add to Vault and copy-settings
components, with stubbed authentication, navigation and save actions. It tests
all 20 Dragons Exalted combinations, missing values, rapid switching, delayed and
mismatched responses, retry, unknown/unresolved selection, failed condition-save
rollback and graded/archived exclusion. No copy is submitted or changed.

The three screenshots show the actual Add to Vault component in desktop, 320px
light and 320px dark layouts. Outer lab controls and headings are fixture-only.
This is not a deployed Next page or authenticated hosted acceptance. The Next
adapter's SDK/session checks and the live backend/source check are separate proof.

`fixture/` preserves the exact entry, navigation/auth/save stubs, small captured
DTO fixture and loopback server used for this run. It is evidence source: copy
these files to `.tmp/condition-auto-ui/` to restore their relative imports before
bundling. The lab binds only to 127.0.0.1 and has test-only failure routes that do
not exist in the production API. Bundle the entry with the web tsconfig and its
React/ReactDOM dependencies; alias `next/link`, `next/navigation`,
`@/lib/auth/useClientViewer`, telemetry and the three save-action imports to
`stubs.tsx`, and `OwnedObjectRemoveAction` to `remove-stub.tsx`. Build the normal
Tailwind globals including both actual component sources and the fixture entry.
The compiled `app.js` and `app.css` go in the same temporary directory. Run the
server with `CONDITION_FIXTURE_PORT=56378`, then run the saved Playwright CLI
function. It clears only this fixture's session storage before checking.

The fixture's source snapshot predates the final confidence metadata addition;
the executed read-model hash and complete final metadata are in the independent
live readback. Browser assertions compare amounts, selection identity and state;
the API tests verify the DTO boundary. No live source or account credentials are
needed for this component fixture.
