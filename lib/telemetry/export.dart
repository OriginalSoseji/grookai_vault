import 'dart:io';

// Writes a JSON snapshot (no PII) to app documents dir and returns the full path.
Future<String> exportTelemetryJson(String json) async {
  final dir = await _documentsDir();
  final file = File(_join(dir.path, 'telemetry_snapshot.json'));
  await file.writeAsString(json);
  return file.path;
}

Future<Directory> _documentsDir() async {
  // Portable fallback without extra packages; use current directory if platform dirs unavailable.
  final env = Platform.environment;
  final home = env['USERPROFILE'] ?? env['HOME'] ?? Directory.current.path;
  final out = Directory(_join(home, 'Documents', 'AppTelemetry'));
  if (!(await out.exists())) { await out.create(recursive: true); }
  return out;
}

String _join(String a, String b, [String? c]) {
  final sep = Platform.pathSeparator;
  final ab = a.endsWith(sep) ? (a + b) : (a + sep + b);
  if (c == null) return ab;
  return ab + (ab.endsWith(sep) ? '' : sep) + c;
}
