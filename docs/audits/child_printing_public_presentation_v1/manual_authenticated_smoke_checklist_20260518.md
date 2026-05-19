# Manual Authenticated Smoke Checklist

Date: 2026-05-18
Lane: CHILD_PRINTING_PUBLIC_PRESENTATION_V1

## Production Authenticated Smoke

1. Log into production GrookaiVault.com.
2. Open:

```text
/sets/sv8pt5
```

3. Find Exeggutor.
4. Confirm finish chips show:

- Poké Ball
- Master Ball

5. Select Poké Ball.
6. Add to vault if needed.
7. Select Master Ball.
8. Add to vault if needed.
9. Open `/vault`.
10. Confirm copy labels show:

- `NM • Poké Ball • Raw`
- `NM • Master Ball • Raw`
- `NM • Finish not selected • Raw` for legacy/null row if present

11. Open exact copy pages for both new copies.
12. Confirm exact copy page shows:

- `Finish: Poké Ball`
- `Finish: Master Ball`

13. Open:

```text
/card/GV-PK-PRE-002-MB
```

14. Confirm it does NOT resolve as a card page.
15. Confirm no public child route is enabled.

## Pass/Fail Recording

Result:
- PASS / FAIL

Failures:
-

Screenshots captured:
-

Decision:
- Merge to main / Do not merge

## Notes

This checklist is manual because authenticated browser automation was not available in the current Codex session.

Do not merge this lane to `main` until the operator records a passing authenticated smoke result or explicitly accepts the remaining risk.
