import 'package:flutter/material.dart';

class ConditionChips extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const ConditionChips({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final opts = const ['NM','LP','MP','HP','GRD'];
    return Wrap(
      spacing: 8,
      children: [
        for (final c in opts)
          ChoiceChip(
            label: Text(c),
            selected: value == c,
            onSelected: (_) {
              if (c == 'GRD') {
                // Future graded picker hook
              }
              onChanged(c);
            },
          ),
      ],
    );
  }
}

