import 'package:flutter/material.dart';

/// Visible shortcuts into the existing owner workflows; this widget never saves
/// prices, publishes inventory, initiates OAuth, or sends a print job.
class VendorWorkspaceNavigation extends StatelessWidget {
  const VendorWorkspaceNavigation({
    super.key,
    required this.onPricing,
    required this.onLabels,
    required this.onSquare,
  });

  final VoidCallback onPricing;
  final VoidCallback? onLabels;
  final VoidCallback onSquare;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: onPricing,
              icon: const Icon(Icons.price_change_outlined, size: 18),
              label: const Text('Pricing'),
            ),
            OutlinedButton.icon(
              onPressed: onLabels,
              icon: const Icon(Icons.print_outlined, size: 18),
              label: const Text('Labels'),
            ),
            OutlinedButton.icon(
              onPressed: onSquare,
              icon: const Icon(Icons.point_of_sale_outlined, size: 18),
              label: const Text('Square'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Add privately. Choose For sale when ready.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    ),
  );
}
