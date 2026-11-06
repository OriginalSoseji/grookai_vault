Uri buildEbaySoldSearchUri({
  required String cardName,
  String? setName,
  String? collectorNumber,
  String? finish,
}) {
  return buildEbaySearchUri(
    cardName: cardName,
    setName: setName,
    collectorNumber: collectorNumber,
    finish: finish,
    sold: true,
  );
}

/// Search navigation only; results are not verified exact matches or valuations.
Uri buildEbaySearchUri({
  required String cardName,
  String? setName,
  String? collectorNumber,
  String? finish,
  bool sold = false,
}) {
  final terms = <String>[
    cardName,
    setName ?? '',
    collectorNumber ?? '',
    finish ?? '',
  ].map((value) => value.trim()).where((value) => value.isNotEmpty).join(' ');
  return Uri.https('www.ebay.com', '/sch/i.html', {
    '_nkw': terms,
    if (sold) 'LH_Sold': '1',
    if (sold) 'LH_Complete': '1',
  });
}
