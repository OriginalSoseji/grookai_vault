# Embeddings Backfill (Dev)

Steps:
1. Set environment vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (handle securely, do not commit).
2. Run `node tools/embeddings/backfill_card_prints.js` (after transpiling), or `ts-node` if available.
3. Script selects prints with `image_url` and missing `image_embedding`, generates a placeholder embedding (TODO: replace with real model), and updates rows.

Notes:
- Replace the TODO with a proper 768-dim image embedding model.
- Use batching and retries for robustness; respect rate limits.

