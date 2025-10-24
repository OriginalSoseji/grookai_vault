import 'ui_contracts.dart';

String _s(dynamic v) => (v ?? '').toString();
num? _n(dynamic v) {
  if (v == null) return null;
  if (v is num) return v;
  final s = v.toString();
  return num.tryParse(s);
}

CardPrintView cardPrintFromDb(Map r) {
  final id = _s(r['id'] ?? r['card_id'] ?? r['print_id']);
  return CardPrintView(
    id: id,
    name: _s(r['name'] ?? r['name_local'] ?? 'Card'),
    setCode: _s(r['set_code'] ?? r['set'] ?? r['set_name']),
    number: _s(r['number']),
    imageUrl: _s(r['image_url'] ?? r['photo_url'] ?? r['image_alt_url']),
    lastPrice: _n(r['price_mid'] ?? r['market_price']),
  );
}

CardPrintView cardPrintFromLazy(Map r) {
  // Lazy/external result shape often mirrors DB with different keys
  return cardPrintFromDb(r);
}

VaultItemView vaultItemFromDb(Map r) {
  final setCode = _s(r['set_code'] ?? r['setCode']);
  final setName = _s(r['set_name'] ?? r['setName'] ?? setCode);
  return VaultItemView(
    id: _s(r['id']),
    cardId: _s(r['card_id'] ?? r['print_id'] ?? r['id']),
    qty: (r['qty'] ?? 0) is int
        ? (r['qty'] as int)
        : int.tryParse(_s(r['qty'])) ?? 0,
    name: _s(r['name'] ?? 'Item'),
    // Expose set code; UIs can display setName by preferring human label when available.
    setCode: setName.isNotEmpty ? setName : setCode,
    imageUrl: _s(r['image_url'] ?? r['photo_url'] ?? r['image_alt_url']),
    lastPrice: _n(r['market_price'] ?? r['price_mid']),
  );
}
