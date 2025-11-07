class ScanCandidate {
  final String cardId;
  final String name;
  final String setCode;
  final String number;
  final double confidence;
  final String? imageUrl;
  const ScanCandidate({
    required this.cardId,
    required this.name,
    required this.setCode,
    required this.number,
    required this.confidence,
    this.imageUrl,
  });
}

