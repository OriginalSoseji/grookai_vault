String cleanDexFilterLabel(String? value) {
  return (value ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');
}

String normalizeDexFilterValue(String? value) {
  return cleanDexFilterLabel(value).toLowerCase();
}

List<String> buildDexFilterOptions(Iterable<String?> values) {
  final labelByNormalizedValue = <String, String>{};
  for (final value in values) {
    final label = cleanDexFilterLabel(value);
    final normalized = normalizeDexFilterValue(label);
    if (normalized.isEmpty) {
      continue;
    }
    final current = labelByNormalizedValue[normalized];
    if (current == null || label.compareTo(current) < 0) {
      labelByNormalizedValue[normalized] = label;
    }
  }

  final options = labelByNormalizedValue.values.toList(growable: false);
  options.sort((left, right) {
    final normalizedOrder = normalizeDexFilterValue(
      left,
    ).compareTo(normalizeDexFilterValue(right));
    return normalizedOrder == 0 ? left.compareTo(right) : normalizedOrder;
  });
  return options;
}

bool matchesDexFilterValue(String? candidate, String? selected) {
  final selectedValue = normalizeDexFilterValue(selected);
  return selectedValue.isEmpty ||
      normalizeDexFilterValue(candidate) == selectedValue;
}
