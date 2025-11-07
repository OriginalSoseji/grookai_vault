import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/config/env.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'wall_feed_service.dart';

class GVListingsApi {
  final String _base = Env.supabaseUrl.replaceAll(RegExp(r'/+$'), '');
  String get _anon => Env.supabaseAnonKey;

  Future<String> postFromVault(
    String vaultItemId, {
    required int priceCents,
    int quantity = 1,
    String? condition,
    String? note,
    bool useVaultImage = true,
  }) async {
    final uri = Uri.parse('$_base/rest/v1/rpc/vault_post_to_wall');
    final payload = {
      'vault_item_id': vaultItemId,
      'price_cents': priceCents,
      'quantity': quantity,
      if (condition != null) 'condition': condition,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      'use_vault_image': useVaultImage,
    };
    final resp = await http.post(
      uri,
      headers: {
        'apikey': _anon,
        'Authorization': 'Bearer ' + _anon,
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception('vault_post_to_wall failed: ${resp.statusCode}');
    }
    final id = (jsonDecode(resp.body) as String?) ?? '';
    Telemetry.log('post_to_wall', {
      'source': 'vault',
      'vault_item_id': vaultItemId,
      'listing_id': id,
    });
    // Refresh wall feed (best-effort)
    try {
      await WallFeedService().refreshWall();
    } catch (_) {}
    return id;
  }
}

