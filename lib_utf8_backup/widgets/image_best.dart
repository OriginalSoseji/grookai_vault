String imageBestFromRow(Map row) {
  String? raw = (row['image_best'] ?? row['image_url'] ?? row['image_alt_url'])?.toString();
  if (raw == null || raw.trim().isEmpty) return "";
  String url = raw.trim();

  // Handle TCGdex asset URLs that omit extension/quality.
  if (url.startsWith("https://assets.tcgdex.net")) {
    // If extension already present, keep as-is.
    final lower = url.toLowerCase();
    final hasExt = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp");
    if (!hasExt) {
      // If ends with '/', append high.png; otherwise add '/high.png'
      if (url.endsWith("/")) {
        url = "$url" "high.png";
      } else {
        // If last segment is a plain number (card number), add '/high.png'
        final endsWithNumber = RegExp(r"/\d+$").hasMatch(url);
        url = endsWithNumber ? "$url/high.png" : "$url.png";
      }
    }
  }

  return url;
}
