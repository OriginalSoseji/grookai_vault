import 'package:supabase_flutter/supabase_flutter.dart';

typedef SaleListingPersist =
    Future<Map<String, dynamic>?> Function({
      required String userId,
      required String instanceId,
      required Map<String, dynamic> values,
    });

class SaleListingService {
  SaleListingService({
    SupabaseClient? client,
    SaleListingPersist? persist,
    String? currentUserId,
  }) : _client = client,
       _currentUserIdOverride = currentUserId,
       _persist = persist;

  final SupabaseClient? _client;
  final SaleListingPersist? _persist;
  final String? _currentUserIdOverride;

  Future<SaleListingSaveResult> saveSingleCardListing({
    required String instanceId,
    required String gvviId,
    required String vaultItemId,
    required String cardPrintId,
    required double price,
    String currency = 'USD',
    String? note,
  }) async {
    final userId = _currentUserId();
    if (userId.isEmpty) {
      throw Exception('Sign in required.');
    }
    final normalizedInstanceId = _clean(instanceId);
    if (normalizedInstanceId.isEmpty) {
      throw Exception('This card copy is not available yet.');
    }
    final normalizedPrice = _normalizePrice(price);
    if (normalizedPrice == null || normalizedPrice <= 0) {
      throw Exception('Enter an asking price greater than 0.');
    }
    final normalizedCurrency = _normalizeCurrency(currency);
    if (normalizedCurrency == null) {
      throw Exception('Currency must be a 3-letter code.');
    }

    final values = <String, dynamic>{
      // LOCK: Public sale authority is exact-copy level.
      // LOCK: Do not create marketplace listings or write grouped vault_items.
      'intent': 'sell',
      'pricing_mode': 'asking',
      'asking_price_amount': normalizedPrice,
      'asking_price_currency': normalizedCurrency,
      'asking_price_note': _nullable(note),
    };

    final row = await _persistListing(
      userId: userId,
      instanceId: normalizedInstanceId,
      values: values,
    );
    if (row == null) {
      throw Exception('Sale listing could not be saved.');
    }

    final savedIntent = _normalizeIntent(row['intent']);
    final savedPrice = _normalizePrice(row['asking_price_amount']);
    final savedCurrency = _normalizeCurrency(row['asking_price_currency']);
    if (savedIntent != 'sell' ||
        savedPrice == null ||
        savedCurrency == null ||
        savedPrice != normalizedPrice) {
      throw Exception('Sale listing could not be saved.');
    }

    return SaleListingSaveResult(
      instanceId: _fallback(row['id'], normalizedInstanceId),
      gvviId: _fallback(row['gv_vi_id'], gvviId),
      vaultItemId: _clean(vaultItemId),
      cardPrintId: _fallback(row['card_print_id'], cardPrintId),
      intent: savedIntent,
      price: savedPrice,
      currency: savedCurrency,
      note: _nullable(row['asking_price_note']),
    );
  }

  Future<Map<String, dynamic>?> _persistListing({
    required String userId,
    required String instanceId,
    required Map<String, dynamic> values,
  }) async {
    final injected = _persist;
    if (injected != null) {
      return injected(userId: userId, instanceId: instanceId, values: values);
    }

    final client = _requiredClient();
    final row = await client
        .from('vault_item_instances')
        .update(values)
        .eq('id', instanceId)
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .select(
          'id,gv_vi_id,card_print_id,intent,asking_price_amount,asking_price_currency,asking_price_note',
        )
        .maybeSingle();
    return row == null ? null : Map<String, dynamic>.from(row as Map);
  }

  SupabaseClient _requiredClient() {
    final client = _client ?? Supabase.instance.client;
    return client;
  }

  String _currentUserId() {
    final override = _clean(_currentUserIdOverride);
    if (override.isNotEmpty) {
      return override;
    }
    final client = _client;
    if (client != null) {
      return _clean(client.auth.currentUser?.id);
    }
    try {
      return _clean(Supabase.instance.client.auth.currentUser?.id);
    } catch (_) {
      return '';
    }
  }
}

class SaleListingSaveResult {
  const SaleListingSaveResult({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.cardPrintId,
    required this.intent,
    required this.price,
    required this.currency,
    this.note,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final String cardPrintId;
  final String intent;
  final double price;
  final String currency;
  final String? note;
}

String _clean(dynamic value) => (value ?? '').toString().trim();

String _fallback(dynamic value, String fallback) {
  final normalized = _clean(value);
  return normalized.isEmpty ? fallback : normalized;
}

String? _nullable(dynamic value) {
  final normalized = _clean(value);
  return normalized.isEmpty ? null : normalized;
}

String _normalizeIntent(dynamic value) {
  return _clean(value).toLowerCase() == 'sell' ? 'sell' : 'hold';
}

String? _normalizeCurrency(dynamic value) {
  final normalized = _clean(value).toUpperCase();
  if (normalized.length != 3 || RegExp(r'[^A-Z]').hasMatch(normalized)) {
    return null;
  }
  return normalized;
}

double? _normalizePrice(dynamic value) {
  if (value is num) {
    final normalized = value.toDouble();
    return normalized.isFinite && normalized >= 0
        ? double.parse(normalized.toStringAsFixed(2))
        : null;
  }
  final parsed = double.tryParse(_clean(value));
  if (parsed == null || !parsed.isFinite || parsed < 0) {
    return null;
  }
  return double.parse(parsed.toStringAsFixed(2));
}
