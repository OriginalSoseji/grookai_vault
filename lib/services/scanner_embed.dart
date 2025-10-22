import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class ServerResolveResult {
  final Map<String, dynamic>? best;
  final List<Map<String, dynamic>> alternatives;
  final bool usedEmbedding;
  ServerResolveResult({required this.best, required this.alternatives, required this.usedEmbedding});
}

class ScannerEmbedService {
  final SupabaseClient _client;
  ScannerEmbedService(this._client);

  Future<ServerResolveResult?> resolve({
    List<double>? embedding,
    List<int>? imageJpegBytes,
    String? nameHint,
    String? numberHint,
    String? langHint,
  }) async {
    try {
      final body = <String, dynamic>{
        if (embedding != null) 'embedding': embedding,
        if (imageJpegBytes != null) 'image_base64': base64Encode(imageJpegBytes),
        if (nameHint != null) 'name_hint': nameHint,
        if (numberHint != null) 'number_hint': numberHint,
        if (langHint != null) 'lang_hint': langHint,
      };
      final res = await _client.functions.invoke('scan_resolve', body: body);
      final data = Map<String, dynamic>.from(res.data ?? {});
      if (data.isEmpty) return null;
      final best = data['best'] == null ? null : Map<String, dynamic>.from(data['best']);
      final alts = List<Map<String, dynamic>>.from((data['alternatives'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e)));
      final used = (data['used_embedding'] ?? false) == true;
      return ServerResolveResult(best: best, alternatives: alts, usedEmbedding: used);
    } catch (_) {
      return null;
    }
  }
}

