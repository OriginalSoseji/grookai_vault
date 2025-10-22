import "package:flutter/material.dart";

List<String> variantTagsFromRow(Map row) {
  final v = (row["variant_key"] ?? "").toString().toLowerCase();
  final tags = <String>[];

  if (v.contains("first") || v.contains("1st")) {
    tags.add("1st Edition");
  }
  if (v.contains("shadowless")) {
    tags.add("Shadowless");
  }
  if (v.contains("holo") || v.contains("holographic")) {
    tags.add("Holo");
  }
  if (v.contains("reverse")) {
    tags.add("Reverse Holo");
  }
  return tags;
}

class VariantBadges extends StatelessWidget {
  final Map row;
  const VariantBadges({super.key, required this.row});

  @override
  Widget build(BuildContext context) {
    final tags = variantTagsFromRow(row);
    if (tags.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final t in tags)
          Chip(label: Text(t), visualDensity: VisualDensity.compact),
      ],
    );
  }
}
