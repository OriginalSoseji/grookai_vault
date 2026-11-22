# Pokémon playable filter navigation

The live resolver already returns the verified Full Art, SIR, IR, common and
ordinary playable versions. A direct production HTML read nevertheless proved
that `/explore?playable=1` rendered the featured 151 catalog: the server page's
discovery exclusion list omitted the explicit playable parameter. The client
filter form also omitted that parameter, and its Clear all link retained it.

The server now selects the existing search consumer for an explicit playable
constraint. Applying smart filters retains `playable=1`; Clear all removes it
alongside the other search constraints while retaining comparison, language and
display settings. The catalog Filters panel adds a Pokémon playables link using
the existing comparison-aware route builder and shared visual styles, with a
44px minimum action height. Typed search syntax and individual filter removal
retain their existing behavior.

This is a web navigation correction. It introduces no new classification,
membership, data writes, schema, source acquisition, identity, pricing, ownership
or native binary changes. The raw artwork evidence and 23 exact-card facts from
release #995, and bounded name verification from #999, remain unchanged.

Fresh read-only environment verification on `ycdxbpibncqcchqiihfz` found 173,837
card prints, 3,420 sets, 47,409 traits and 326 vault items. Public publication
`bf66faa91d6301c890e25f0d7cbd368f5a45f9fa4e9a52903023f46526939022`
was ready with 300 current rows. All 298 retained product records for those
parents still had only the previously classified Judge `(Full Art)` label;
this work does not broaden artwork labels from rarity or images.

Regression coverage runs through the real server page and client forms in
`apps/web/tests/parity/search-combobox.spec.ts`, using loopback-only configuration
and intercepted browser API responses. It checks bare-parameter entry, actual
filter submission, Clear all and individual removal, preserved comparison/query/
language/view settings, the new catalog entry, four viewport/theme combinations,
minimum target height and serious/critical accessibility violations. The normal
search audit workflow runs this suite in Chromium and WebKit.

All 14 search browser tests passed in both engines, including the three new
navigation cases per engine. Screenshots were inspected in real app light/dark
themes at phone and desktop widths; the link remains visible and clickable with
comparison UI present. Web typechecking and focused lint also passed.

Release acceptance requires the browser suite, typechecking/lint, normal managed
commit/push gates, all hosted checks and deployment. Then verify the real public
page and actual resolver responses together, retaining the current publication
snapshot and exact IDs. Local mocked browser results alone do not establish
production data behavior. The PR release receipt records that final readback.
