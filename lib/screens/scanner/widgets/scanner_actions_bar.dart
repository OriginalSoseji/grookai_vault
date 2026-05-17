import 'package:flutter/material.dart';

class ScannerActionsBar extends StatelessWidget {
  const ScannerActionsBar({
    super.key,
    required this.showUnknownActions,
    required this.showRescanAction,
    required this.onTryAgain,
    required this.onSearchManually,
  });

  final bool showUnknownActions;
  final bool showRescanAction;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;

  @override
  Widget build(BuildContext context) {
    if (showRescanAction) {
      return Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          onPressed: onTryAgain,
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: const Text('Rescan'),
          style: TextButton.styleFrom(
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          ),
        ),
      );
    }

    if (!showUnknownActions) return const SizedBox.shrink();

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onTryAgain,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Try again'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: BorderSide(color: Colors.white.withValues(alpha: 0.22)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton.icon(
            onPressed: onSearchManually,
            icon: const Icon(Icons.search_rounded, size: 18),
            label: const Text('Search manually'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF111217),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ],
    );
  }
}
