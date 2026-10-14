Uri buildEbaySoldSearchUri({
  required String cardName,
  String? setName,
  String? collectorNumber,
  String? finish,
}) {
  final terms = <String>[
    cardName,
    setName ?? '',
    collectorNumber ?? '',
    finish ?? '',
    'Pokemon card',
  ].map((value) => value.trim()).where((value) => value.isNotEmpty).join(' ');
  return Uri.https('www.ebay.com', '/sch/i.html', {
    '_nkw': terms,
    'LH_Sold': '1',
    'LH_Complete': '1',
  });
}
