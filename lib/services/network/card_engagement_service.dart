import 'package:supabase_flutter/supabase_flutter.dart';

class CardWantState {
  const CardWantState({this.want = false, this.isPublic = false});

  final bool want;
  final bool isPublic;
}

class CardCommentEntry {
  const CardCommentEntry({
    required this.id,
    required this.userId,
    required this.body,
    this.intentType,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String body;
  final String? intentType;
  final DateTime? createdAt;

  bool isOwnedBy(String? currentUserId) => userId == _clean(currentUserId);
}

class CardEngagementService {
  static Future<CardWantState> loadWantState({
    required SupabaseClient client,
    required String cardPrintId,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    final normalizedCardPrintId = _clean(cardPrintId);
    if (userId.isEmpty || normalizedCardPrintId.isEmpty) {
      return const CardWantState();
    }

    final row = await client
        .from('user_card_intents')
        .select('want,is_public')
        .eq('user_id', userId)
        .eq('card_print_id', normalizedCardPrintId)
        .maybeSingle();

    if (row == null) {
      return const CardWantState();
    }

    final data = Map<String, dynamic>.from(row);
    return CardWantState(
      want: data['want'] == true,
      isPublic: data['is_public'] == true,
    );
  }

  static Future<CardWantState> setWant({
    required SupabaseClient client,
    required String cardPrintId,
    required bool want,
    String? surface,
    Map<String, dynamic>? metadata,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    final normalizedCardPrintId = _clean(cardPrintId);
    if (userId.isEmpty || normalizedCardPrintId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final existing = await client
        .from('user_card_intents')
        .select('want,trade,sell,showcase,is_public,metadata')
        .eq('user_id', userId)
        .eq('card_print_id', normalizedCardPrintId)
        .maybeSingle();
    final existingRow = existing == null
        ? null
        : Map<String, dynamic>.from(existing);

    if (!want && existingRow == null) {
      return const CardWantState();
    }

    final payload = <String, dynamic>{
      'user_id': userId,
      'card_print_id': normalizedCardPrintId,
      'want': want,
      'trade': existingRow?['trade'] == true,
      'sell': existingRow?['sell'] == true,
      'showcase': existingRow?['showcase'] == true,
      'is_public': existingRow?['is_public'] == true,
      'metadata': _normalizedMetadata(existingRow?['metadata']),
    };

    final updated = await client
        .from('user_card_intents')
        .upsert(payload, onConflict: 'user_id,card_print_id')
        .select('want,is_public')
        .maybeSingle();

    try {
      await recordFeedEvent(
        client: client,
        cardPrintId: normalizedCardPrintId,
        eventType: want ? 'want_on' : 'want_off',
        surface: surface ?? 'card_detail',
        metadata: metadata,
      );
    } catch (_) {}

    if (updated == null) {
      return CardWantState(want: want, isPublic: payload['is_public'] == true);
    }

    final updatedRow = Map<String, dynamic>.from(updated);
    return CardWantState(
      want: updatedRow['want'] == true,
      isPublic: updatedRow['is_public'] == true,
    );
  }

  static Future<void> recordFeedEvent({
    required SupabaseClient client,
    required String cardPrintId,
    required String eventType,
    String? surface,
    Map<String, dynamic>? metadata,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedEventType = _clean(eventType);
    if (userId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedEventType.isEmpty) {
      return;
    }

    await client.from('card_feed_events').insert({
      'user_id': userId,
      'card_print_id': normalizedCardPrintId,
      'event_type': normalizedEventType,
      if (_clean(surface).isNotEmpty) 'surface': _clean(surface),
      'metadata': _normalizedMetadata(metadata),
    });
  }

  static Future<List<CardCommentEntry>> fetchComments({
    required SupabaseClient client,
    required String cardPrintId,
    int limit = 16,
  }) async {
    final normalizedCardPrintId = _clean(cardPrintId);
    if (normalizedCardPrintId.isEmpty) {
      return const <CardCommentEntry>[];
    }

    final response = await client
        .from('card_comments')
        .select('id,user_id,body,intent_type,created_at')
        .eq('card_print_id', normalizedCardPrintId)
        .order('created_at', ascending: false)
        .limit(limit);

    return (response as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map(
          (row) => CardCommentEntry(
            id: _clean(row['id']),
            userId: _clean(row['user_id']),
            body: _clean(row['body']),
            intentType: _optionalClean(row['intent_type']),
            createdAt: _parseDateTime(row['created_at']),
          ),
        )
        .where((entry) => entry.id.isNotEmpty && entry.body.isNotEmpty)
        .toList(growable: false);
  }

  static Future<CardCommentEntry> addComment({
    required SupabaseClient client,
    required String cardPrintId,
    required String body,
    String? intentType,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedBody = _clean(body);
    final normalizedIntentType = _optionalClean(intentType);

    if (userId.isEmpty) {
      throw Exception('Sign in required.');
    }
    if (normalizedCardPrintId.isEmpty || normalizedBody.isEmpty) {
      throw Exception('Comment text is required.');
    }
    if (normalizedBody.length > 2000) {
      throw Exception('Comments must be 2000 characters or fewer.');
    }

    final response = await client
        .from('card_comments')
        .insert({
          'card_print_id': normalizedCardPrintId,
          'user_id': userId,
          'body': normalizedBody,
          if (normalizedIntentType != null) 'intent_type': normalizedIntentType,
        })
        .select('id,user_id,body,intent_type,created_at')
        .single();

    final row = Map<String, dynamic>.from(response);
    return CardCommentEntry(
      id: _clean(row['id']),
      userId: _clean(row['user_id']),
      body: _clean(row['body']),
      intentType: _optionalClean(row['intent_type']),
      createdAt: _parseDateTime(row['created_at']),
    );
  }

  static String formatRelativeTime(DateTime? value) {
    if (value == null) {
      return 'Just now';
    }

    final delta = DateTime.now().difference(value.toLocal());
    if (delta.inMinutes < 1) {
      return 'Just now';
    }
    if (delta.inHours < 1) {
      final minutes = delta.inMinutes;
      return '$minutes min ago';
    }
    if (delta.inDays < 1) {
      final hours = delta.inHours;
      return '$hours hr ago';
    }
    if (delta.inDays < 7) {
      return '${delta.inDays}d ago';
    }
    final weeks = (delta.inDays / 7).floor();
    if (weeks < 5) {
      return '${weeks}w ago';
    }
    final months = (delta.inDays / 30).floor();
    if (months < 12) {
      return '${months}mo ago';
    }
    final years = (delta.inDays / 365).floor();
    return '${years}y ago';
  }

  static Map<String, dynamic> _normalizedMetadata(dynamic raw) {
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return <String, dynamic>{};
  }

  static DateTime? _parseDateTime(dynamic raw) {
    final text = _clean(raw);
    if (text.isEmpty) {
      return null;
    }
    return DateTime.tryParse(text);
  }
}

String _clean(dynamic value) => (value ?? '').toString().trim();

String? _optionalClean(dynamic value) {
  final text = _clean(value);
  return text.isEmpty ? null : text;
}
