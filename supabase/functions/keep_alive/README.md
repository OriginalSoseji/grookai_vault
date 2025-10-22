# keep_alive

Auth
- Internal/system scheduled pinger. `verify_jwt = false`.

Behavior
- Periodically invokes `search_cards` and `hydrate_card` with no-op payloads to reduce cold starts.

Config
- See `config.toml` for the schedule.
