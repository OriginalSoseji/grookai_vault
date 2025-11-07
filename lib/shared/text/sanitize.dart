String sanitizeUiText(String? input) {
  if (input == null) return '';
  var s = input;
  // Strip ASCII control chars
  s = s.replaceAll(RegExp('[\x00-\x1F\x7F]'), ' ');
  // Common mojibake fixes
  const fixes = <String, String>{
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã­': 'í', 'Ãº': 'ú', 'Ã£': 'ã', 'Ã±': 'ñ', 'Ãœ': 'Ü',
    'â€™': '’', 'â€˜': '‘', 'â€“': '–', 'â€”': '—', 'â€œ': '“', 'Â': ''
  };
  fixes.forEach((k, v) => s = s.replaceAll(k, v));
  // Squash whitespace
  s = s.replaceAll(RegExp('\\s+'), ' ').trim();
  return s;
}

