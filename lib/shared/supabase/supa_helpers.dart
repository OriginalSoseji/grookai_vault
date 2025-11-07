String digitsOnly(String s) {
  final b = StringBuffer();
  for (final r in s.runes) {
    final ch = String.fromCharCode(r);
    if (ch.codeUnitAt(0) >= 48 && ch.codeUnitAt(0) <= 57) b.write(ch);
  }
  return b.toString();
}

String leftPad3(String s) {
  if (s.isEmpty) return '';
  return s.padLeft(3, '0');
}

String normalizeSlash(String input) {
  final q = input.trim();
  if (!q.contains('/')) return '';
  final parts = q.split('/');
  final left = digitsOnly(parts.first);
  final right = parts.length > 1 ? parts[1].replaceAll(RegExp(r'\s+'), '') : '';
  final l = leftPad3(left);
  return right.isEmpty ? (l.isEmpty ? '' : l) : '$l/$right';
}

