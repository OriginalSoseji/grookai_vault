import 'package:flutter/material.dart';

import '../../theme/gv_tokens.dart';

class CardPrintingChoice {
  const CardPrintingChoice({
    required this.id,
    required this.label,
    this.publicId,
  });
  final String id;
  final String label;
  final String? publicId;
}

/// Selects an existing canonical printing without creating or inferring one.
class CardPrintingPicker extends StatelessWidget {
  const CardPrintingPicker({
    super.key,
    required this.choices,
    required this.selectedId,
    required this.onSelected,
    required this.onRetry,
    required this.onViewMarket,
    this.loading = false,
  });

  final List<CardPrintingChoice> choices;
  final String? selectedId;
  final ValueChanged<String> onSelected;
  final VoidCallback onRetry;
  final VoidCallback onViewMarket;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final selected = choices
        .where((choice) => choice.id == selectedId)
        .firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Printings', style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          loading
              ? 'Loading available finishes…'
              : choices.isEmpty
              ? 'Try again to load available finishes.'
              : choices.length == 1
              ? '1 available printing'
              : 'Choose the finish on your copy.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        if (loading)
          Semantics(
            label: 'Loading printings',
            child: Column(
              children: [
                for (var i = 0; i < 2; i++)
                  Container(
                    height: 64,
                    margin: const EdgeInsets.only(bottom: 9),
                    decoration: BoxDecoration(
                      color: colors.surfaceContainer,
                      borderRadius: BorderRadius.circular(GvRadii.surface),
                    ),
                  ),
              ],
            ),
          )
        else if (choices.isEmpty) ...[
          Text(
            'Printings are unavailable for this card.',
            style: theme.textTheme.bodyMedium,
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry printings'),
            ),
          ),
        ] else ...[
          for (final choice in choices)
            Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: Semantics(
                key: ValueKey('printing-choice-${choice.id}'),
                button: true,
                selected: choice.id == selectedId,
                child: Material(
                  color: choice.id == selectedId
                      ? colors.primary.withValues(alpha: .07)
                      : colors.surfaceContainerLow,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(GvRadii.surface),
                    side: BorderSide(
                      color: choice.id == selectedId
                          ? colors.primary
                          : colors.outlineVariant,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => onSelected(choice.id),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 64),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              choice.id == selectedId
                                  ? Icons.check_circle_rounded
                                  : Icons.radio_button_unchecked,
                              size: 22,
                              color: choice.id == selectedId
                                  ? colors.primary
                                  : colors.onSurfaceVariant,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    choice.label,
                                    style: theme.textTheme.titleSmall,
                                  ),
                                  if (choice.publicId?.isNotEmpty ?? false) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      choice.publicId!,
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: colors.onSurfaceVariant,
                                          ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (selected != null) ...[
            const SizedBox(height: 3),
            Text(
              'Selected for market links and new copies.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onViewMarket,
                icon: const Icon(Icons.arrow_downward_rounded, size: 18),
                label: const Text('View selected market'),
              ),
            ),
          ],
        ],
      ],
    );
  }
}
