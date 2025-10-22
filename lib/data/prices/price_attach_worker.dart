import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class _Semaphore {
  int _permits;
  final _q = <Completer<void>>[];
  _Semaphore(this._permits);
  Future<void> acquire() {
    if (_permits > 0) {
      _permits--;
      return Future.value();
    }
    final c = Completer<void>();
    _q.add(c);
    return c.future;
  }

  void release() {
    if (_q.isNotEmpty) {
      _q.removeAt(0).complete();
    } else {
      _permits++;
    }
  }
}

class CardPrice {
  final String cardPrintId;
  final num? low;
  final num? mid;
  final num? high;
  final String? index;
  final num? confidence;
  CardPrice({
    required this.cardPrintId,
    this.low,
    this.mid,
    this.high,
    this.index,
    this.confidence,
  });
}

Future<List<CardPrice>> _parsePricesCompute(String jsonStr) async {
  final data = json.decode(jsonStr) as List<dynamic>;
  return data.map((row) {
    final m = row as Map<String, dynamic>;
    return CardPrice(
      cardPrintId: '${m['card_print_id']}',
      low: m['low'] as num?,
      mid: m['mid'] as num?,
      high: m['high'] as num?,
      index: m['grookai_index'] as String?,
      confidence: m['gi_confidence'] as num?,
    );
  }).toList();
}

class PriceAttachWorker {
  final SupabaseClient client;
  final int chunkSize;
  final int maxConcurrent;
  PriceAttachWorker(this.client, {this.chunkSize = 20, this.maxConcurrent = 6});

  Future<bool> _viewExists() async {
    try {
      await client.from('latest_card_prices_v').select('card_print_id').limit(1);
      return true;
    } on PostgrestException catch (e) {
      if (e.code == 'PGRST205') {
        // ignore: avoid_print
        print('[VIEW] latest_card_prices_v missing (PGRST205) -> prices disabled');
        return false;
      }
      rethrow;
    }
  }

  Future<Map<String, CardPrice>> attachByIds(List<String> cardPrintIds) async {
    if (cardPrintIds.isEmpty) return {};
    final exists = await _viewExists();
    if (!exists) return {};
    final sem = _Semaphore(maxConcurrent);
    final futures = <Future<List<CardPrice>>>[];
    for (var i = 0; i < cardPrintIds.length; i += chunkSize) {
      final chunk = cardPrintIds.sublist(i, i + chunkSize > cardPrintIds.length ? cardPrintIds.length : i + chunkSize);
      futures.add(_runChunk(sem, chunk));
    }
    final results = await Future.wait(futures);
    final map = <String, CardPrice>{};
    for (final list in results) {
      for (final p in list) {
        map[p.cardPrintId] = p;
      }
    }
    return map;
  }

  Future<List<CardPrice>> _runChunk(_Semaphore sem, List<String> ids) async {
    await sem.acquire();
    try {
      // ignore: avoid_print
      print('[PRICES] chunk.fetch size=${ids.length}');
      final resp = await client
          .from('latest_card_prices_v')
          .select('card_print_id, low, mid, high, grookai_index, gi_confidence')
          .inFilter('card_print_id', ids);
      final jsonStr = json.encode(resp);
      final parsed = await compute(_parsePricesCompute, jsonStr);
      // ignore: avoid_print
      print('[PRICES] chunk.parse done count=${parsed.length}');
      return parsed;
    } finally {
      sem.release();
      await Future.delayed(const Duration(milliseconds: 1));
    }
  }
}

