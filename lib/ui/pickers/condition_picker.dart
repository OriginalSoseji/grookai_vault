import 'package:flutter/material.dart';

class ConditionPicker extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const ConditionPicker({super.key, required this.value, required this.onChanged});
  static const _options = ['NM', 'LP', 'MP', 'HP', 'GRADED'];
  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: value,
      onChanged: (v) => v != null ? onChanged(v) : null,
      items: _options.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
    );
  }
}

