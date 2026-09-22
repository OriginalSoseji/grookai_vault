import 'package:flutter/material.dart';
import '../models/search_interpretation.dart';

class SearchInterpretationChips extends StatelessWidget {
  const SearchInterpretationChips({
    super.key,
    required this.interpretation,
    required this.onQuery,
    this.onFilter,
    this.empty = false,
  });
  final SearchInterpretation interpretation;
  final ValueChanged<String> onQuery;
  final ValueChanged<SearchQueryAction>? onFilter;
  final bool empty;

  @override
  Widget build(BuildContext context) {
    if (interpretation.filters.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final filter in interpretation.filters)
              InputChip(
                label: Text(filter.label),
                deleteButtonTooltipMessage: 'Remove ${filter.label}',
                onDeleted: () => onFilter != null
                    ? onFilter!(filter)
                    : onQuery(filter.query),
              ),
          ],
        ),
        if (interpretation.correction != null) ...[
          Text(interpretation.correction!),
          if (interpretation.originalSpellingQuery != null)
            TextButton(
              onPressed: () => onQuery(interpretation.originalSpellingQuery!),
              child: const Text('Use original spelling'),
            ),
        ],
        if (interpretation.artistChoices.isNotEmpty) ...[
          const Text(
            'Matching these artists. Choose one to narrow your search:',
          ),
          Wrap(
            spacing: 8,
            children: [
              for (final choice in interpretation.artistChoices)
                ActionChip(
                  label: Text(choice.label),
                  onPressed: () => onQuery(choice.query),
                ),
            ],
          ),
        ],
        if (empty)
          const Text(
            'No recorded matches for all these filters. Remove a filter to broaden your search. Finish searches include only cataloged printings.',
          ),
        for (final warning in interpretation.unappliedLabels)
          Text(
            warning,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        if (interpretation.hasOwnershipFilter)
          const Text('Ownership is checked for the card across all printings.'),
      ],
    );
  }
}
