class OcrSpec {
  // Collector number: 1–3 digits / 2–3 digits, with optional spaces
  static final RegExp collectorNo = RegExp(r'(\d{1,3})\s*/\s*(\d{2,3})');

  // Year near copyright line
  static final RegExp year = RegExp(r'20\d{2}');

  // Uppercase “stamps” that are text-based (fallback)
  static final List<RegExp> textStampPatterns = [
    RegExp(r'\bPRERELEASE\b', caseSensitive: false),
    RegExp(r'\bSTAFF\b', caseSensitive: false),
    RegExp(r'\bWINNER\b|\bWINNERS\b', caseSensitive: false),
    RegExp(r'\bWORLD(S)?\s*20\d{2}\b', caseSensitive: false),
    RegExp(r'\bPOKEMON\s*CENTER\b', caseSensitive: false),
    RegExp(r'\bCHAMPIONSHIP(S)?\s*20\d{2}\b', caseSensitive: false),
  ];
}

