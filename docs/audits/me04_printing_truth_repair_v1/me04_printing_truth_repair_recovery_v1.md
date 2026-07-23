# ME04-PRINTING-TRUTH-REPAIR-V1 recovery material

The two backup JSONL files preserve all 45 deleted `card_printings` rows, the 45 unchanged Holo sibling snapshots, and all 270 pre-repair `market_evidence_variant_assignments` rows as complete JSON snapshots. If recovery is ever authorized, restore the Normal child rows first, then compare-and-swap the assignment rows back to their recorded snapshots in one transaction. Do not execute recovery from these artifacts without a new guarded dry run against the then-current schema and dependencies.
