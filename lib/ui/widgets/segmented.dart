// lib/ui/widgets/segmented.dart
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class Segmented<T extends Object> extends StatelessWidget {
  final Map<T, String> options;
  final T value;
  final ValueChanged<T> onChanged;
  const Segmented({super.key, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final platformIsCupertino = Theme.of(context).platform == TargetPlatform.iOS;
    if (platformIsCupertino) {
      return CupertinoSegmentedControl<T>(
        groupValue: value,
        onValueChanged: onChanged,
        children: {for (final e in options.entries) e.key: Padding(padding: const EdgeInsets.all(8), child: Text(e.value))},
      );
    }
    final keys = options.keys.toList(growable: false);
    final idx = keys.indexOf(value);
    return ToggleButtons(
      isSelected: List.generate(keys.length, (i) => i == idx),
      onPressed: (i) => onChanged(keys[i]),
      children: [for (final e in options.entries) Padding(padding: const EdgeInsets.all(8), child: Text(e.value))],
    );
  }
}
