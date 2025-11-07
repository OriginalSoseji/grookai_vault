// Grookai Vault — search normalizer (client-side helper)
// Works with the unified server RPC but also fine for local view filters.

class SearchParse {
  final String? name;   // e.g., "pika" from "Pika 049/203"
  final int? number;    // 49 from "049" or "049/203"
  final int? total;     // 203 from "049/203"
  final String? setCode;
  const SearchParse({this.name, this.number, this.total, this.setCode});
}

final _reNum = RegExp(r'(\d{1,4})(?:\s*/\s*(\d{1,4}))?'); // 49 or 049/203
final _reNameChars = RegExp(r'[^a-z0-9 ]+');

SearchParse parseSearchInput(String raw) {
  final s = raw.toLowerCase().trim();
  if (s.isEmpty) return const SearchParse();

  int? number;
  int? total;
  final numMatch = _reNum.firstMatch(s);
  if (numMatch != null) {
    number = int.tryParse(numMatch.group(1)!);
    if (numMatch.groupCount >= 2 && numMatch.group(2) != null) {
      total = int.tryParse(numMatch.group(2)!);
    }
  }

  String? namePart = s
      .replaceAll(_reNum, ' ')
      .replaceAll('/', ' ')
      .replaceAll('-', ' ')
      .replaceAll(_reNameChars, ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  if (namePart.isEmpty) namePart = null;

  return SearchParse(name: namePart, number: number, total: total, setCode: null);
}
