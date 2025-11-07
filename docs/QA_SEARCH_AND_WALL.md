# QA — Unified Search & Wall

## Search inputs (expect results)
- 49
- 049
- 049/203
- pika 49
- pika 049/203
- pikachu 049

## Ranking sanity
- "pika 49" should rank Pikachu #49 near the top (boosted trigram).

## Wall refresh
- After inserting or updating listings/images, call POST /rest/v1/rpc/rpc_refresh_wall
- Verify wall_feed_view results update accordingly.

