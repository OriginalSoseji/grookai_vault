import "dart:async";
import "dart:io";

/// Intercepts requests to assets.tcgdex.net and rewrites them to images.pokemontcg.io
/// with slug fallbacks. Everything else passes through unchanged.
class TcgdexHttpOverrides extends HttpOverrides {
  final HttpOverrides? _prev = HttpOverrides.current;

  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final base = (_prev?.createHttpClient(context)) ?? HttpClient();
    return _TcgdexClient(base);
  }
}

class _TcgdexClient implements HttpClient {
  _TcgdexClient(this._inner);
  final HttpClient _inner;

  static bool _isTcgdex(Uri u) =>
      u.host.contains("tcgdex.net") && u.pathSegments.isNotEmpty;

  static (String, String)? _parseTcgdex(Uri u) {
    final segs = u.pathSegments.where((s) => s.isNotEmpty).toList();
    if (segs.length < 4) return null;
    final setCode = segs[2];
    final number = segs[3];
    if (setCode.isEmpty || number.isEmpty) return null;
    return (setCode, number);
  }

  static List<String> _setSlugCandidates(String setCode) {
    final out = <String>[];
    void addUnique(String s) { if (!out.contains(s)) out.add(s); }

    addUnique(setCode);
    addUnique(setCode.replaceAll(".5", "pt5"));
    addUnique(setCode.replaceAllMapped(RegExp(r"^sv0(\d+)"), (m) => "sv${m.group(1)}"));
    addUnique(setCode.replaceAllMapped(RegExp(r"^sv(\d{1})($|[^0-9])"), (m) => "sv0${m.group(1)}${m.group(2)}"));
    return out;
  }

  static String _numSlug(String number) {
    final m = RegExp(r"^0*([0-9]+)([A-Za-z]*)$").firstMatch(number.trim());
    if (m == null) return number.trim();
    final numeric = m.group(1)!;
    final suffix = m.group(2)!;
    final stripped = int.tryParse(numeric)?.toString() ?? numeric;
    return "$stripped$suffix";
  }

  static List<Uri> _fallbacks(String setCode, String number) {
    final numSlug = _numSlug(number);
    final out = <Uri>[];
    for (final slug in _setSlugCandidates(setCode)) {
      out.add(Uri.parse("https://images.pokemontcg.io/$slug/${numSlug}_hires.png"));
      out.add(Uri.parse("https://images.pokemontcg.io/$slug/$numSlug.png"));
    }
    return out;
  }

  static Future<Uri?> _firstOk(HttpClient c, List<Uri> candidates) async {
    for (final u in candidates) {
      try {
        final req = await c.openUrl("HEAD", u);
        final res = await req.close();
        if (res.statusCode == 200) return u;
      } catch (_) {}
    }
    return null;
  }

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    if ((method == "GET" || method == "HEAD") && _isTcgdex(url)) {
  assert(() { print('[OVERRIDE] tcgdex hit: ' + url.toString()); return true; }());
      final parsed = _parseTcgdex(url);
      if (parsed != null) {
        final (setCode, number) = parsed;
        // Prefer .png (more reliable across older sets), try original slug variants in order.
        final numSlug = _numSlug(number);
        for (final slug in _setSlugCandidates(setCode)) {
          final rewritten = Uri.parse("https://images.pokemontcg.io/\/\.png");
          // Rewrite immediately to images.pokemontcg.io; skip HEAD probes.
          return _inner.openUrl(method, rewritten);
        }
        // If no slugs (unlikely), fall through to original
      }
    }
    // Default: pass through
    return _inner.openUrl(method, url);
  }

  // ---- Delegates / required members ----
  @override
  bool get autoUncompress => _inner.autoUncompress;
  @override
  set autoUncompress(bool v) { _inner.autoUncompress = v; }

  @override
  Duration? get connectionTimeout => _inner.connectionTimeout;
  @override
  set connectionTimeout(Duration? v) { _inner.connectionTimeout = v; }

  @override
  Duration get idleTimeout => _inner.idleTimeout;
  @override
  set idleTimeout(Duration v) { _inner.idleTimeout = v; }

  @override
  String? get userAgent => _inner.userAgent;
  @override
  set userAgent(String? v) { _inner.userAgent = v; }

  @override
  set findProxy(String Function(Uri url)? f) { _inner.findProxy = f; }

  @override
  void addCredentials(Uri url, String realm, HttpClientCredentials credentials) =>
      _inner.addCredentials(url, realm, credentials);
  @override
  void addProxyCredentials(String host, int port, String realm, HttpClientCredentials credentials) =>
      _inner.addProxyCredentials(host, port, realm, credentials);

  @override
  set authenticate(Future<bool> Function(Uri url, String scheme, String? realm)? f) {
    _inner.authenticate = f;
  }
  @override
  set authenticateProxy(Future<bool> Function(String host, int port, String scheme, String? realm)? f) {
    _inner.authenticateProxy = f;
  }

  @override
  set badCertificateCallback(bool Function(X509Certificate cert, String host, int port)? callback) {
    _inner.badCertificateCallback = callback;
  }

  @override
  void close({bool force = false}) => _inner.close(force: force);

  @override
  int? get maxConnectionsPerHost => _inner.maxConnectionsPerHost;
  @override
  set maxConnectionsPerHost(int? v) { _inner.maxConnectionsPerHost = v; }

  @override
  void set connectionFactory(Future<ConnectionTask<Socket>> Function(Uri url, String? proxyHost, int? proxyPort)? f) {
    _inner.connectionFactory = f;
  }

  @override
  void set keyLog(void Function(String line)? callback) { _inner.keyLog = callback; }

  // --- IMPORTANT: route network lookups through our interceptor ---
  @override
  Future<HttpClientRequest> getUrl(Uri url) => openUrl("GET", url);
  @override
  Future<HttpClientRequest> headUrl(Uri url) => openUrl("HEAD", url);

  // The host/port/path helpers can safely delegate to inner
  @override
  Future<HttpClientRequest> get(String host, int port, String path) => _inner.get(host, port, path);
  @override
  Future<HttpClientRequest> head(String host, int port, String path) => _inner.head(host, port, path);

  @override
  Future<HttpClientRequest> delete(String host, int port, String path) => _inner.delete(host, port, path);
  @override
  Future<HttpClientRequest> deleteUrl(Uri url) => _inner.deleteUrl(url);

  @override
  Future<HttpClientRequest> open(String method, String host, int port, String path) => _inner.open(method, host, port, path);
  @override
  Future<HttpClientRequest> patch(String host, int port, String path) => _inner.patch(host, port, path);
  @override
  Future<HttpClientRequest> patchUrl(Uri url) => _inner.patchUrl(url);
  @override
  Future<HttpClientRequest> post(String host, int port, String path) => _inner.post(host, port, path);
  @override
  Future<HttpClientRequest> postUrl(Uri url) => _inner.postUrl(url);
  @override
  Future<HttpClientRequest> put(String host, int port, String path) => _inner.put(host, port, path);
  @override
  Future<HttpClientRequest> putUrl(Uri url) => _inner.putUrl(url);
}




