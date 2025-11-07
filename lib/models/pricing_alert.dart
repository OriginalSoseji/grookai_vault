// Codex: created 2025-11-03
class PricingAlert {
  final String code;
  final String message;
  final DateTime observedAt;
  PricingAlert({required this.code, required this.message, required this.observedAt});
  factory PricingAlert.fromJson(Map<String, dynamic> j) => PricingAlert(
    code: (j['code'] ?? '').toString(),
    message: (j['message'] ?? '').toString(),
    observedAt: DateTime.tryParse((j['observed_at'] ?? '').toString()) ?? DateTime.now().toUtc(),
  );
}

