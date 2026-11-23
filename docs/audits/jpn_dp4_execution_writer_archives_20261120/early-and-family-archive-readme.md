# DP4 earlier and family writer archives

The `subject`, `identity80`, `artist84`, and `family` archives preserve the five exact source files used by the corresponding production rollback and apply runs. The contract test hashes every archived file and recomputes the recorded writer fingerprint. The combined registry files in this branch have different bytes, so the historical proof authenticates each archived writer only; any new mutation needs a fresh same-writer rollback proof for the current bytes.

The `subject` and `identity80` execution files contained mixed line endings that Git normalized in the later commits. Their exact execution bytes were recovered from the original working checkouts and matched against the recorded rollback fingerprints before archiving. The other three registration files for each are recovered from its corresponding Git commit. The `artist84` and `family` archive fingerprints match their source commits. These archives preserve evidence, not authorization for another write.

The six family approvals were subsequently superseded and disabled under receipt `177111`; the earlier identity corrections have later artist-only parent changes documented in their individual audit packages. The 184 stale active source-evidence rows remain unresolved and are outside this integration.
