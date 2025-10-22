// lib/ui/widgets/search_field.dart
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../tokens/spacing.dart';

class SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final String hintText;
  const SearchField({super.key, required this.controller, this.onChanged, required this.hintText});

  @override
  Widget build(BuildContext context) {
    final isCupertino = Theme.of(context).platform == TargetPlatform.iOS;
    if (isCupertino) {
      return CupertinoSearchTextField(
        controller: controller,
        onChanged: onChanged,
        placeholder: hintText,
        padding: const EdgeInsets.symmetric(horizontal: GVSpacing.s8, vertical: GVSpacing.s8),
      );
    }
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search),
        border: const OutlineInputBorder(),
        isDense: true,
        contentPadding: const EdgeInsets.all(GVSpacing.s12),
      ),
    );
  }
}

