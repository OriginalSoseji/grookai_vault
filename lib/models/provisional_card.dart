import '../services/provisional/provisional_presentation.dart';

class PublicProvisionalCard {
  const PublicProvisionalCard({
    required this.candidateId,
    required this.displayName,
    required this.setHint,
    required this.numberHint,
    required this.provisionalState,
    required this.provisionalLabel,
    required this.publicExplanation,
    this.imageUrl,
    this.sourceLabel,
    this.createdAt,
  });

  final String candidateId;
  final String displayName;
  final String setHint;
  final String numberHint;
  final String? imageUrl;
  final String provisionalState;
  final String provisionalLabel;
  final String publicExplanation;
  final String? sourceLabel;
  final String? createdAt;

  String get displayLabel => provisionalDisplayLabel(provisionalLabel);
  String get identityLine => <String>[
    setHint,
    if (numberHint.isNotEmpty) '#$numberHint',
  ].where((value) => value.trim().isNotEmpty).join(' ');

  String get detailPath => '/provisional/${Uri.encodeComponent(candidateId)}';

  factory PublicProvisionalCard.fromJson(Map<String, dynamic> json) {
    final candidateId = _clean(json['candidate_id']);
    final displayName = _clean(json['display_name']);
    final setHint = _clean(json['set_hint']);
    final numberHint = _clean(json['number_hint']);
    final provisionalState = _clean(json['provisional_state']);
    final provisionalLabel = _clean(json['provisional_label']);

    if (candidateId.isEmpty ||
        displayName.isEmpty ||
        setHint.isEmpty ||
        numberHint.isEmpty ||
        provisionalState.isEmpty ||
        provisionalLabel.isEmpty ||
        json.containsKey('gv_id')) {
      throw const FormatException('Invalid provisional card payload.');
    }

    return PublicProvisionalCard(
      candidateId: candidateId,
      displayName: displayName,
      setHint: setHint,
      numberHint: numberHint,
      imageUrl: _nullableHttp(json['image_url']),
      provisionalState: provisionalState,
      provisionalLabel: provisionalLabel,
      publicExplanation:
          _nullable(json['public_explanation']) ?? provisionalTrustCopy,
      sourceLabel: _nullable(json['source_label']),
      createdAt: _nullable(json['created_at']),
    );
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String? _nullable(dynamic value) {
    final normalized = _clean(value);
    return normalized.isEmpty ? null : normalized;
  }

  static String? _nullableHttp(dynamic value) {
    final normalized = _nullable(value);
    if (normalized == null) {
      return null;
    }
    final uri = Uri.tryParse(normalized);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }
    return normalized;
  }
}

class ProvisionalSearchResult {
  const ProvisionalSearchResult({required this.rows});

  final List<PublicProvisionalCard> rows;
}
