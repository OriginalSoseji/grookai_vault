# Thunder UI (Primary)

- Thunder is now the default and only shell. Authenticated users boot into `ThunderShell`.
- Legacy navigation/layout has been retired.

Added files:
- `lib/shell/thunder_shell.dart`
- `lib/features/home/thunder_home.dart`
- `lib/widgets/thunder_divider.dart`
- `lib/widgets/thunder_button.dart`

Uses existing tokens/components:
- `lib/theme/thunder_palette.dart`
- `lib/theme/thunder_theme.dart`

Known notes:
- ThunderHome shows live movers, activity, and wall highlights (where data exists).
- Subtle effects only; no idle glow. Animations ~160–200ms.
