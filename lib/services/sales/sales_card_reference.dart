/// Outbound references only: never a price quote or an exact-printing assertion.
class SalesCardReference {
  const SalesCardReference({
    required this.name,
    this.setName,
    this.number,
    this.productId,
  });

  final String name;
  final String? setName, number, productId;

  bool get hasProduct =>
      RegExp(r'^[1-9][0-9]{0,11}$').hasMatch(productId?.trim() ?? '');

  Uri get uri => hasProduct
      ? Uri.https('www.tcgplayer.com', '/product/${productId!.trim()}')
      : Uri.https('www.tcgplayer.com', '/search/all/product', {
          'q': [name, setName, number]
              .whereType<String>()
              .map((s) => s.trim())
              .where((s) => s.isNotEmpty && s != '—')
              .join(' '),
          'view': 'grid',
        });

  String get label => hasProduct ? 'TCGplayer product' : 'Search TCGplayer';
}
