# RUNTIME_AUTOMATION_BOUNDARIES_V1

Status: Active runtime support document

## Automatically Allowed

The automation layer may automatically run:

- validation
- proof execution
- drift checks
- scope / coverage sanity checks
- quarantine insertion
- violation logging
- visibility/reporting commands

## Explicit Human Invocation Required

The automation layer must NOT automatically run:

- canon promotion from ambiguity
- quarantine promotion
- repair actions that mutate canon truth
- reconciliation actions that require judgment
- bulk canon rewrite jobs

## Principle

Automation may block, surface, quarantine, and report.
Automation may not silently authorize ambiguous truth.
