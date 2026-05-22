import 'package:flutter/material.dart';

enum ScannerBuildPlaceholderAction { search, vault }

class ScannerBuildPlaceholderScreen extends StatelessWidget {
  const ScannerBuildPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const background = Color(0xFF070A12);
    const accent = Color(0xFF2F69C9);
    const foreground = Color(0xFFF5F7FB);
    const muted = Color(0xFF9AA6BA);
    final bottomPadding = MediaQuery.viewPaddingOf(context).bottom;

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(18, 8, 18, 16 + bottomPadding * 0.25),
          child: Column(
            children: [
              SizedBox(
                height: 42,
                child: Row(
                  children: [
                    IconButton(
                      tooltip: 'Close scanner',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                      color: foreground,
                      visualDensity: VisualDensity.compact,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      'Scan Card',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: foreground,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(flex: 3),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.42),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: const Color(0xFF74A8FF).withValues(alpha: 0.40),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.22),
                      blurRadius: 28,
                      spreadRadius: 3,
                    ),
                  ],
                ),
                child: const SizedBox(
                  width: 74,
                  height: 74,
                  child: Icon(
                    Icons.center_focus_strong_rounded,
                    color: foreground,
                    size: 36,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Scanner is being built',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: foreground,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 310),
                child: Text(
                  'Card scanning is under active construction. For now, use Search or Browse sets to add cards with verified identity.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: muted,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ScannerStatusChip(
                    icon: Icons.verified_user_outlined,
                    label: 'Identity-safe',
                  ),
                  _ScannerStatusChip(
                    icon: Icons.construction_rounded,
                    label: 'In progress',
                  ),
                  _ScannerStatusChip(
                    icon: Icons.archive_outlined,
                    label: 'No archive',
                  ),
                ],
              ),
              const Spacer(flex: 4),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFE7F0FF),
                    foregroundColor: const Color(0xFF172033),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () => Navigator.of(
                    context,
                  ).pop(ScannerBuildPlaceholderAction.search),
                  icon: const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Search cards instead'),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: foreground,
                    side: BorderSide(color: foreground.withValues(alpha: 0.72)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () => Navigator.of(
                    context,
                  ).pop(ScannerBuildPlaceholderAction.vault),
                  icon: const Icon(Icons.inventory_2_outlined, size: 18),
                  label: const Text('Open vault'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScannerStatusChip extends StatelessWidget {
  const _ScannerStatusChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFF101827).withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: const Color(0xFF334155).withValues(alpha: 0.86),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0xFFC5D4EE), size: 14),
            const SizedBox(width: 5),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: const Color(0xFFE6EDF8),
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
