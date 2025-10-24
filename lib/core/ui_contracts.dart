class CardPrintView {
  final String id;
  final String name;
  final String setCode;
  final String number;
  final String imageUrl;
  final num? lastPrice;

  const CardPrintView({
    required this.id,
    required this.name,
    required this.setCode,
    required this.number,
    required this.imageUrl,
    this.lastPrice,
  });
}

class VaultItemView {
  final String id;
  final String cardId;
  final int qty;
  final String name;
  final String setCode;
  final String imageUrl;
  final num? lastPrice;

  const VaultItemView({
    required this.id,
    required this.cardId,
    required this.qty,
    required this.name,
    required this.setCode,
    required this.imageUrl,
    this.lastPrice,
  });
}

class PriceMoveView {
  final String cardId;
  final String name;
  final String setCode;
  final double deltaPct;
  final num current;
  const PriceMoveView({
    required this.cardId,
    required this.name,
    required this.setCode,
    required this.deltaPct,
    required this.current,
  });
}

