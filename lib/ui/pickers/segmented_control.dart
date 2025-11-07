import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class GVSegmentedControl extends StatelessWidget {
  final List<String> segments;
  final String value;
  final ValueChanged<String> onChanged;
  const GVSegmentedControl({super.key, required this.segments, required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    final isCupertino = Theme.of(context).platform == TargetPlatform.iOS;
    if (isCupertino) {
      return CupertinoSegmentedControl<String>(
        children: {for (final s in segments) s: Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text(s))},
        groupValue: value,
        onValueChanged: onChanged,
      );
    }
    return Wrap(
      spacing: 6,
      children: [
        for (final s in segments)
          ChoiceChip(
            label: Text(s),
            selected: value == s,
            onSelected: (_) => onChanged(s),
          ),
      ],
    );
  }
}

