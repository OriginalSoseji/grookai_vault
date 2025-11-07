import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../config/env.dart';
import '../models/wall_feed_item.dart';
import 'package:http/http.dart' as http;

class WallFeedService {
  String get _base => Env.supabaseUrl.replaceAll(RegExp(r'/+$'), '');
  String get _anon => Env.supabaseAnonKey;

  Uri _buildUri({
    required int limit,
    required int offset,
    String? q,
    List<String>? conditions,
    int? minPriceCents,
    int? maxPriceCents,
  }) {
    final params = <String, String>{
      'limit': limit.toString(),
      'offset': offset.toString(),
    };
    if (q != null && q.trim().isNotEmpty) params['q'] = q.trim();
    final conds = (conditions ?? <String>[])..removeWhere((e) => e.trim().isEmpty);
    if (conds.isNotEmpty) params['conditions'] = conds.join(',');
    if (minPriceCents != null) params['min_price_cents'] = minPriceCents.toString();
    if (maxPriceCents != null) params['max_price_cents'] = maxPriceCents.toString();
    final url = '$_base/functions/v1/wall_feed';
    return Uri.parse(url).replace(queryParameters: params);
  }

  Future<WallFeedPageData> fetch({
    int limit = 10,
    int offset = 0,
    String? q,
    List<String>? conditions,
    int? minPriceCents,
    int? maxPriceCents,
  }) async {
    final uri = _buildUri(
      limit: limit,
      offset: offset,
      q: q,
      conditions: conditions,
      minPriceCents: minPriceCents,
      maxPriceCents: maxPriceCents,
    );
    if (kDebugMode) debugPrint('[HTTP] GET $uri');
    final resp = await http.get(uri);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception('wall_feed error ${resp.statusCode}');
    }
    final map = json.decode(resp.body) as Map<String, dynamic>;
    final items = ((map['items'] as List?) ?? <dynamic>[])
        .cast<Map>()
        .map((e) => WallFeedItem.fromMap(e.cast<String, dynamic>()))
        .toList();
    final count = map['count'] as int?;
    return WallFeedPageData(items: items, total: count, offset: offset, limit: limit);
  }

  // Triggers the materialized view refresh via PostgREST RPC.
  // Useful after creating/updating listings or on pull-to-refresh.
  Future<bool> refreshWall() async {
    final uri = Uri.parse('$_base/rest/v1/rpc/rpc_refresh_wall');
    if (kDebugMode) debugPrint('[HTTP] POST $uri');
    final resp = await http.post(
      uri,
      headers: {
        'apikey': _anon,
        'Authorization': 'Bearer ' + _anon,
        'Content-Type': 'application/json',
      },
      body: json.encode({}),
    );
    return resp.statusCode >= 200 && resp.statusCode < 300;
  }
}
