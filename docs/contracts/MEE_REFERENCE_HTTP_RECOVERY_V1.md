# MEE reference HTTP recovery V1

The default PokemonTCG.io reference adapter previously retried only curl process
failures. Curl exits successfully for ordinary HTTP errors unless configured
otherwise, so a text 502 response escaped that retry loop and failed later in
JSON parsing. The September 29 acquisition recorded 321 fetch errors.

The adapter now reads curl's explicit HTTP status before parsing the body.
Transient 408/500/502/503/504 responses, selected transport failures and invalid
JSON under HTTP200 may retry, with at most three attempts and 750/1500ms waits.
Each attempt retains the 60-second transfer limit, an 80-second child-process
deadline and an 8MiB output limit. Authentication, missing IDs, rate limiting,
certificate failures and redirects fail explicitly without an immediate retry.
HTTPS certificate verification remains enabled. Credential-bearing redirects
are not followed. Successful card IDs must match the requested external ID.

Terminal errors persist in acquisition JSON as sanitized codes, HTTP status and
attempt count. Neither raw subprocess commands nor response bodies are copied
into error artifacts. Existing reviewed-target missing-data classifications and
review-only evidence/publication boundaries remain unchanged. Missing external
IDs require separately governed mapping work; retries cannot create mappings.

Preserve the already deployed bounded artifact-history selection and latest
acquisition-per-source normalization from fc26dda11/ed7414b98. Include their
regression tests in the release; do not replace those behaviors with older
release-branch versions. Public pricing and canonical writes are outside this fix.

Validate the incident-shaped 502 fixture, retry exhaustion, JSON corruption,
terminal HTTP statuses, certificate errors, secret redaction and ID mismatch.
Deploy an exact merged immutable MEE checkout with a retained rollback pointer.
Use a small read-only provider canary and record remaining provider failures;
never treat a successful code deployment as complete upstream coverage.

Curl semantics: https://curl.se/docs/manpage.html#-f and
https://curl.se/docs/manpage.html#-w .
