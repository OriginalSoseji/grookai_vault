const int kLocalRecentSearchLimit = 5;

List<String> normalizeLocalRecentSearches(Iterable<String>? values) {
  if (values == null) return const <String>[];

  final seen = <String>{};
  final normalized = <String>[];
  for (final value in values) {
    final query = value.trim();
    if (query.isEmpty || !seen.add(query.toLowerCase())) continue;
    normalized.add(query);
    if (normalized.length == kLocalRecentSearchLimit) break;
  }
  return List<String>.unmodifiable(normalized);
}

List<String> recordLocalRecentSearch(Iterable<String> current, String query) {
  final normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return normalizeLocalRecentSearches(current);
  }
  return normalizeLocalRecentSearches([
    normalizedQuery,
    ...current.where(
      (value) => value.trim().toLowerCase() != normalizedQuery.toLowerCase(),
    ),
  ]);
}

List<String> removeLocalRecentSearch(Iterable<String> current, String query) {
  return normalizeLocalRecentSearches(current.where((value) => value != query));
}
