class ParsedQuery {
  final String? name;
  final String? setCode;
  final String? collectorNumber;
  final String? totalInSet;
  const ParsedQuery({this.name, this.setCode, this.collectorNumber, this.totalInSet});
}

ParsedQuery parseQuery(String raw) {
  final q = raw.trim();
  if (q.isEmpty) return const ParsedQuery();
  final nameNum = RegExp(r'^(.+?)\s+(\d{1,3})\s*/\s*(\d{1,3})$', caseSensitive: false);
  final numOnly = RegExp(r'^(\d{1,3})\s*/\s*(\d{1,3})$', caseSensitive: false);
  // set code + number (optional /total): e.g. sv3 001 or sv3 001/198
  final setNum = RegExp(r'^([A-Za-z0-9-]{2,8})\s+(\d{1,3})(?:\s*/\s*(\d{1,3}))?$', caseSensitive: false);

  final m1 = nameNum.firstMatch(q);
  if (m1 != null) {
    final name = m1.group(1)!.trim();
    final num = _pad3(m1.group(2)!);
    final total = m1.group(3)!.trim();
    return ParsedQuery(name: name, collectorNumber: num, totalInSet: total);
  }
  final m2 = numOnly.firstMatch(q);
  if (m2 != null) {
    final num = _pad3(m2.group(1)!);
    final total = m2.group(2)!.trim();
    return ParsedQuery(collectorNumber: num, totalInSet: total);
  }
  final m3 = setNum.firstMatch(q);
  if (m3 != null) {
    final set = m3.group(1)!.trim().toLowerCase();
    final num = _pad3(m3.group(2)!);
    final total = (m3.group(3) ?? '').trim();
    return ParsedQuery(setCode: set, collectorNumber: num, totalInSet: total.isEmpty ? null : total);
  }
  return const ParsedQuery();
}

String _pad3(String s) {
  final n = s.trim();
  if (n.length >= 3) return n;
  return n.padLeft(3, '0');
}
