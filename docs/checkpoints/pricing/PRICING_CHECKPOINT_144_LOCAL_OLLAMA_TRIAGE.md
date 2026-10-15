# Pricing Checkpoint 144: Local Ollama Card Triage

## Status

`LOCAL 4B MODEL INSTALLED - GUARDED REVIEW WORKER VERIFIED`

## Outcome

Grookai has a small local advisory model for repetitive TCGPlayer identity
review. The model is `grookai-card-triage:4b`, derived from `qwen3:4b`. Its base
weights are about 2.5 GB and its measured 4,096-token GPU allocation is 3.2 GB,
compared with the separately installed 13 GB
`gpt-oss:20b` model. The larger model remains installed but is not used by this
worker.

This is prompt specialization through a checked-in Modelfile, not fine-tuning.
The current backlog does not contain a sufficiently large, independently
adjudicated training set to justify fine-tuning. Exact reviewed mappings remain
the better future evaluation set.

Create or refresh the local model with:

```powershell
npm run pricing:market:ollama:model:create
```

Run one bounded chunk of an exact planner's `blocked.jsonl` with:

```powershell
npm run pricing:market:ollama-triage -- `
  --input=<blocked.jsonl> `
  --out-dir=<external-evidence-directory> `
  --offset=0 `
  --limit=25
```

The default chunk is 25 rows and the hard maximum is 100. Requests execute one
at a time with a 4,096-token context. The model has a 15-second keep-alive and
the worker explicitly unloads it at the end of every run.

## Safety Boundary

The worker accepts only an unauthenticated HTTP loopback Ollama endpoint. It has
no database dependency, credentials, apply mode, mapping authority, publication
authority, or customer-state path. Before a model call, deterministic code:

- rejects conflicting printed coordinates and reviewed target set codes;
- removes edition conflicts such as First Edition versus Unlimited;
- removes targets that already have an active TCGPlayer mapping;
- holds missing source coordinates and rows with no candidate targets; and
- limits the model to candidate IDs present in the guarded input.

Every accepted model answer is still emitted as `review_required`. Model-reported
confidence is a sorting hint and never execution evidence. The checked-in
exact planner, reviewed authority builder, bounded writer, governed pricing
shadow, production publication, and independent readback remain mandatory.

## Verification

The final real run used the October 15 completion agent's 558-row blocked plan.
The planner retained 125 exact set-and-number review rows with 126 bounded target
possibilities without changing any blocked mapping disposition. Deterministic
filters admitted 86 rows to the local model. The complete run produced:

- 472 deterministic holds;
- 86 sequential local-model calls;
- 86 advisory review leads across 26 groups;
- zero model errors; and
- zero active Ollama models after completion.

Evidence is retained outside the repository at
`pokemon_pricing_repair_20261012/ollama/enriched-triage-v3-20261015`. The input
SHA-256 is
`417dc9ffc69e7400b8a0fe7e186dfc5567b80d6ca11aacb9c29d69c58a697a89`, the
exact model digest is
`e001eb828275332c722faf874070fc1e3745dcffadd4feb5d0118d1a7bf7efa5`, and the
86-row lead file SHA-256 is
`8807a2368628527138ba8fc82e1140a6a327b622c88d8d93a29b51dae489a5ee`.
The largest lead groups are Black and White Promos (12), Nintendo Promos (9),
EX Holon Phantoms (6), and SM Promos (6). Each still requires reviewed source,
canonical parent, governed child-printing, and collision evidence before it can
enter a mapping batch.

The active Team Rushdown pricing release remains separate. Hosted full-source
shadow run `38754917242` is executing from exact main commit
`371150cacdfe914c2faa2f40a536082d19f8c6bc`; this local helper cannot activate it.
