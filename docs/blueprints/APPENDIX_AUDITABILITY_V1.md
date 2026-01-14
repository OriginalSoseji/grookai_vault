# Appendix G — Auditability (Normative)
- All critical flows must be replayable with fixtures and logs.
- Logs must include auth target, env target, and contract version (no secrets).
- Snapshots/analyses must be traceable to user_id and manifest.
- QA checkpoints required before release; stored in repo.
