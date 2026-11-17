import 'package:flutter/material.dart';

/// Navigation context only. Square readiness always comes from the save result.
class SaleWorkflowProgress extends StatelessWidget {
  const SaleWorkflowProgress({super.key, required this.step});
  final int step;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Wrap(
      spacing: 20,
      runSpacing: 8,
      children: [
        for (final (index, label) in ['Review', 'Publish', 'Label'].indexed)
          Semantics(
            selected: index == step,
            child: Text(
              '${index + 1}  $label',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: index == step
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: index == step ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
      ],
    ),
  );
}
