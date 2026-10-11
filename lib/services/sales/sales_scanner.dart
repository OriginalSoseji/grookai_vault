/// A keyboard QR reader supplies an exact-copy label, never a URL to open.
String? scannedCopyId(String raw) {
  if (raw.length > 1024) return null;
  var value = raw.trim();
  if (RegExp(r'^[a-z]+://', caseSensitive: false).hasMatch(value)) {
    try {
      final uri = Uri.parse(value);
      if (uri.scheme != 'https' ||
          uri.userInfo.isNotEmpty ||
          (uri.hasPort && uri.port != 443) ||
          !['grookaivault.com', 'www.grookaivault.com'].contains(uri.host)) {
        return null;
      }
      final match = RegExp(r'^/(?:q|gvvi)/([^/]+)/?$').firstMatch(uri.path);
      if (match == null) return null;
      value = Uri.decodeComponent(match[1]!);
    } on FormatException {
      return null;
    }
  }
  value = value.toUpperCase();
  return RegExp(r'^GVVI-[A-Z0-9]+-[0-9]{6}$').hasMatch(value) ? value : null;
}
