/// Draft estimates only. The completion RPC validates and recomputes every cent.
class SalesTradeLine {
  const SalesTradeLine({
    required this.description,
    required this.valueMinor,
    required this.rateBps,
    this.quantity = 1,
    this.cardId,
    this.printingId,
    this.condition,
    this.addToVault = false,
  });
  final String description;
  final int valueMinor, rateBps, quantity;
  final String? cardId, printingId, condition;
  final bool addToVault;
  int get creditMinor => (valueMinor * quantity * rateBps + 5000) ~/ 10000;
  Map<String, dynamic> toJson() => {
    'description': description,
    'valueMinor': valueMinor,
    'rateBps': rateBps,
    'quantity': quantity,
    'cardId': cardId,
    'printingId': printingId,
    'condition': condition,
    'addToVault': addToVault,
  };
  factory SalesTradeLine.fromJson(Map item) => SalesTradeLine(
    description: item['description'] as String,
    valueMinor: item['valueMinor'] as int,
    rateBps: item['rateBps'] as int,
    quantity: item['quantity'] as int,
    cardId: item['cardId'] as String?,
    printingId: item['printingId'] as String?,
    condition: item['condition'] as String?,
    addToVault: item['addToVault'] as bool,
  );
}

int? tradeRateInput(String value) {
  if (!RegExp(r'^\d{1,3}(?:\.\d{1,2})?$').hasMatch(value.trim())) return null;
  final parts = value.trim().split('.');
  final result =
      int.parse(parts[0]) * 100 +
      int.parse(parts.length == 1 ? '0' : parts[1].padRight(2, '0'));
  return result >= 1 && result <= 10000 ? result : null;
}

String tradeRate(int bps) =>
    (bps / 100).toStringAsFixed(bps % 100 == 0 ? 0 : 2);

int receiptBalance(Map receipt) => receipt['tradeIn'] is Map
    ? receipt['tradeIn']['balanceMinor'] as int
    : receipt['totalMinor'] as int;
