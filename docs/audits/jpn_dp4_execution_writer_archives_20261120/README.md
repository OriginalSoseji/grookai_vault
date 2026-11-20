# Executed writer archives

These compressed JSON packages retain the exact five writer and registration files used for each production transaction. Each file includes its SHA-256 and base64-encoded bytes; hashing the ordered `[path, sha256]` array produces the writer fingerprint recorded in the corresponding rollback proof and receipt.

The integrated branch combines the four registrations, so its current registry files have different bytes from the files used during each execution. The archived original bytes are the historical authority for those fingerprints. The merged writers still require a fresh same-writer rollback proof for any new mutation; the archived proofs do not authorize a writer whose fingerprint has changed. Some strict readbacks also intentionally detect later legitimate changes to their protected parent records; see the individual audit READMEs for the chronology.

This integration packages the 12-credit, six-Unown, two-Porygon, and eight-credit follow-ups. The earlier four-subject repair, 80-identity repair and separate 84-credit fill remain in their own review branches. Integrate these with the resolver/catalog work deliberately; this branch alone does not contain the whole launch effort.
