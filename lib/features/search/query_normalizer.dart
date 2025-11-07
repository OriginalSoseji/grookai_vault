class SearchQuery {
  final String? numberRaw;
  final String? numberPadded; // 049 -> 049
  final String? numberFraction; // 049/203
  final List<String> tokens;
  const SearchQuery({this.numberRaw, this.numberPadded, this.numberFraction, this.tokens = const []});
}

class QueryNormalizer {
  static SearchQuery normalize(String input) {
    final s = input.trim();
    if (s.isEmpty) return const SearchQuery(tokens: []);
    final tokens = s.split(RegExp(r"\s+"));
    String? numRaw;
    String? padded;
    String? fraction;

    final frac = RegExp(r"(\d{1,3})\s*/\s*(\d{2,3})");
    final hash = RegExp(r"#?(\d{1,3})$");
    final matchFrac = frac.firstMatch(s);
    if (matchFrac != null) {
      final a = matchFrac.group(1)!;
      final b = matchFrac.group(2)!;
      numRaw = a;
      padded = a.padLeft(3, '0');
      fraction = '${a.padLeft(3, '0')}/$b';
    } else {
      final matchHash = hash.firstMatch(s);
      if (matchHash != null) {
        final a = matchHash.group(1)!;
        numRaw = a;
        padded = a.padLeft(3, '0');
      }
    }
    return SearchQuery(numberRaw: numRaw, numberPadded: padded, numberFraction: fraction, tokens: tokens);
  }
}

