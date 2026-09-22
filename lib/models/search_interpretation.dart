class SearchQueryAction {
  const SearchQueryAction({
    required this.label,
    required this.query,
    this.removeParameter,
  });
  final String label;
  final String query;
  final String? removeParameter;
}

/// Display-only actions supplied by the shared search service. Clients do not
/// reinterpret artists, spelling, finishes, or query constraints themselves.
class SearchInterpretation {
  const SearchInterpretation({
    this.filters = const [],
    this.artistChoices = const [],
    this.correction,
    this.originalSpellingQuery,
    this.gameScope,
    this.languageScope,
    this.unappliedLabels = const [],
    this.hasOwnershipFilter = false,
  });
  final List<SearchQueryAction> filters;
  final List<SearchQueryAction> artistChoices;
  final String? correction;
  final String? originalSpellingQuery;
  final String? gameScope;
  final String? languageScope;
  final List<String> unappliedLabels;
  final bool hasOwnershipFilter;

  factory SearchInterpretation.fromJson(Map<String, dynamic> json) {
    List<SearchQueryAction> actions(
      dynamic rows,
      String labelKey,
      String queryKey,
    ) => rows is List
        ? rows
              .whereType<Map<String, dynamic>>()
              .where(
                (row) => row[labelKey] is String && row[queryKey] is String,
              )
              .map(
                (row) => SearchQueryAction(
                  label: row[labelKey] as String,
                  query: row[queryKey] as String,
                  removeParameter: row['removeParameter'] as String?,
                ),
              )
              .toList(growable: false)
        : const [];
    final correction = json['artistCorrection'];
    return SearchInterpretation(
      filters: actions(json['queryFilters'], 'label', 'queryWithout'),
      artistChoices: actions(json['artistChoices'], 'name', 'query'),
      correction: correction is Map
          ? 'Interpreted “${correction['original']}” as ${correction['corrected']}.'
          : null,
      originalSpellingQuery: json['originalSpellingQuery'] as String?,
      gameScope: json['gameScope'] as String?,
      languageScope: json['languageScope'] as String?,
      hasOwnershipFilter: ['owned', 'missing'].contains(json['ownedState']),
      unappliedLabels: (json['unappliedLabels'] as List? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }
}
