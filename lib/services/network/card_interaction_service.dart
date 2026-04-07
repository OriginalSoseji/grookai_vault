import 'package:supabase_flutter/supabase_flutter.dart';

enum CardInteractionInboxView { inbox, unread, sent, closed }

enum CardInteractionSendStatus {
  created,
  loginRequired,
  validationError,
  unavailable,
  error,
}

class CardInteractionSendResult {
  const CardInteractionSendResult({
    required this.ok,
    required this.status,
    required this.message,
  });

  final bool ok;
  final CardInteractionSendStatus status;
  final String message;
}

class CardInteractionMessageEntry {
  const CardInteractionMessageEntry({
    required this.id,
    required this.message,
    required this.direction,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String message;
  final String direction;
  final String status;
  final DateTime? createdAt;
}

class CardInteractionThreadSummary {
  const CardInteractionThreadSummary({
    required this.groupKey,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setName,
    required this.number,
    required this.latestMessage,
    required this.messageCount,
    required this.counterpartDisplayName,
    required this.counterpartUserId,
    required this.startedByCurrentUser,
    required this.hasUnread,
    required this.isClosed,
    required this.isArchived,
    this.vaultItemId,
    this.counterpartSlug,
    this.imageUrl,
    this.latestCreatedAt,
  });

  final String groupKey;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setName;
  final String number;
  final String latestMessage;
  final int messageCount;
  final String counterpartDisplayName;
  final String counterpartUserId;
  final bool startedByCurrentUser;
  final bool hasUnread;
  final bool isClosed;
  final bool isArchived;
  final String? vaultItemId;
  final String? counterpartSlug;
  final String? imageUrl;
  final DateTime? latestCreatedAt;
}

class CardInteractionService {
  static Future<CardInteractionSendResult> sendMessage({
    required SupabaseClient client,
    required String vaultItemId,
    required String cardPrintId,
    required String message,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.loginRequired,
        message: 'Sign in required.',
      );
    }

    final normalizedVaultItemId = _clean(vaultItemId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedMessage = _clean(message);

    if (normalizedVaultItemId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedMessage.isEmpty) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'A card and message are required.',
      );
    }

    if (normalizedMessage.length > 2000) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'Message must be 2000 characters or fewer.',
      );
    }

    final target = await client
        .from('v_card_contact_targets_v1')
        .select(
          'vault_item_id,owner_user_id,owner_display_name,card_print_id,intent,created_at',
        )
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    final targetRow = target == null ? null : Map<String, dynamic>.from(target);
    final receiverUserId = _clean(targetRow?['owner_user_id']);
    final ownerDisplayName = _clean(targetRow?['owner_display_name']);

    if (receiverUserId.isEmpty ||
        _clean(targetRow?['vault_item_id']).isEmpty ||
        _clean(targetRow?['card_print_id']).isEmpty) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.unavailable,
        message: 'That card is no longer available for contact.',
      );
    }

    if (receiverUserId == user.id) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'You cannot message yourself about your own card.',
      );
    }

    final duplicateWindowStart = DateTime.now()
        .subtract(const Duration(seconds: 15))
        .toUtc()
        .toIso8601String();

    final duplicate = await client
        .from('card_interactions')
        .select('id')
        .eq('sender_user_id', user.id)
        .eq('receiver_user_id', receiverUserId)
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .eq('message', normalizedMessage)
        .gte('created_at', duplicateWindowStart)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (duplicate != null) {
      return CardInteractionSendResult(
        ok: true,
        status: CardInteractionSendStatus.created,
        message:
            'Message sent to ${ownerDisplayName.isEmpty ? 'collector' : ownerDisplayName}.',
      );
    }

    await client.from('card_interactions').insert({
      'card_print_id': normalizedCardPrintId,
      'vault_item_id': normalizedVaultItemId,
      'sender_user_id': user.id,
      'receiver_user_id': receiverUserId,
      'message': normalizedMessage,
    });

    try {
      await client.from('card_signals').insert({
        'user_id': user.id,
        'card_print_id': normalizedCardPrintId,
        'signal_type': 'interaction',
      });
    } catch (_) {}

    return CardInteractionSendResult(
      ok: true,
      status: CardInteractionSendStatus.created,
      message:
          'Message sent to ${ownerDisplayName.isEmpty ? 'collector' : ownerDisplayName}.',
    );
  }

  static Future<List<CardInteractionThreadSummary>> fetchThreadSummaries({
    required SupabaseClient client,
    required String userId,
  }) async {
    final normalizedUserId = _clean(userId);
    if (normalizedUserId.isEmpty) {
      return const [];
    }

    final interactions = await client
        .from('card_interactions')
        .select(
          'id,card_print_id,vault_item_id,sender_user_id,receiver_user_id,message,status,created_at',
        )
        .or(
          'sender_user_id.eq.$normalizedUserId,receiver_user_id.eq.$normalizedUserId',
        )
        .order('created_at', ascending: false)
        .limit(200);

    final interactionRows = (interactions as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();

    if (interactionRows.isEmpty) {
      return const [];
    }

    final cardPrintIds = interactionRows
        .map((row) => _clean(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final counterpartUserIds = interactionRows
        .expand(
          (row) => [
            _clean(row['sender_user_id']),
            _clean(row['receiver_user_id']),
          ],
        )
        .where((value) => value.isNotEmpty && value != normalizedUserId)
        .toSet()
        .toList();

    final lookups = await Future.wait<dynamic>([
      cardPrintIds.isEmpty
          ? Future.value(<dynamic>[])
          : client
                .from('card_prints')
                .select(
                  'id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)',
                )
                .inFilter('id', cardPrintIds),
      counterpartUserIds.isEmpty
          ? Future.value(<dynamic>[])
          : client
                .from('public_profiles')
                .select('user_id,slug,display_name')
                .inFilter('user_id', counterpartUserIds),
      client
          .from('card_interaction_group_states')
          .select(
            'card_print_id,counterpart_user_id,has_unread,archived_at,closed_at,latest_message_at',
          )
          .eq('user_id', normalizedUserId),
    ]);

    final cardById = <String, Map<String, dynamic>>{};
    for (final rawRow in lookups[0] as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final id = _clean(row['id']);
      if (id.isNotEmpty) {
        cardById[id] = row;
      }
    }

    final profileById = <String, Map<String, dynamic>>{};
    for (final rawRow in lookups[1] as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final id = _clean(row['user_id']);
      if (id.isNotEmpty) {
        profileById[id] = row;
      }
    }

    final stateByKey = <String, Map<String, dynamic>>{};
    for (final rawRow in lookups[2] as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final cardPrintId = _clean(row['card_print_id']);
      final counterpartUserId = _clean(row['counterpart_user_id']);
      if (cardPrintId.isEmpty || counterpartUserId.isEmpty) {
        continue;
      }
      stateByKey['$cardPrintId:$counterpartUserId'] = row;
    }

    final grouped = <String, _ThreadAccumulator>{};
    for (final row in interactionRows) {
      final cardPrintId = _clean(row['card_print_id']);
      final senderUserId = _clean(row['sender_user_id']);
      final receiverUserId = _clean(row['receiver_user_id']);
      final vaultItemId = _nullable(row['vault_item_id']);
      final message = _clean(row['message']);
      if (cardPrintId.isEmpty ||
          senderUserId.isEmpty ||
          receiverUserId.isEmpty ||
          message.isEmpty) {
        continue;
      }

      final direction = senderUserId == normalizedUserId ? 'sent' : 'received';
      final counterpartUserId = direction == 'sent'
          ? receiverUserId
          : senderUserId;
      final card = cardById[cardPrintId];
      if (card == null) {
        continue;
      }

      final key = '$cardPrintId:$counterpartUserId';
      final stateRow = stateByKey[key];
      final counterpartProfile = profileById[counterpartUserId];
      final setRecord = switch (card['sets']) {
        List<dynamic> rows when rows.isNotEmpty => Map<String, dynamic>.from(
          rows.first as Map,
        ),
        Map<String, dynamic> row => row,
        _ => null,
      };

      final accumulator = grouped.putIfAbsent(
        key,
        () => _ThreadAccumulator(
          groupKey: key,
          cardPrintId: cardPrintId,
          gvId: _clean(card['gv_id']).isEmpty
              ? cardPrintId
              : _clean(card['gv_id']),
          cardName: _clean(card['name']).isEmpty
              ? 'Unknown card'
              : _clean(card['name']),
          setName: _clean(setRecord?['name']).isEmpty
              ? (_clean(card['set_code']).isEmpty
                    ? 'Unknown set'
                    : _clean(card['set_code']))
              : _clean(setRecord?['name']),
          number: _clean(card['number']).isEmpty ? '—' : _clean(card['number']),
          imageUrl: _bestImageUrl(card['image_url'], card['image_alt_url']),
          vaultItemId: vaultItemId,
          counterpartDisplayName:
              _clean(counterpartProfile?['display_name']).isEmpty
              ? 'Collector'
              : _clean(counterpartProfile?['display_name']),
          counterpartUserId: counterpartUserId,
          counterpartSlug: _nullable(counterpartProfile?['slug']),
          startedByCurrentUser: direction == 'sent',
          hasUnread: stateRow?['has_unread'] == true || direction == 'received',
          isClosed: _nullable(stateRow?['closed_at']) != null,
          isArchived: _nullable(stateRow?['archived_at']) != null,
          latestCreatedAt: DateTime.tryParse(
            _clean(stateRow?['latest_message_at']).isNotEmpty
                ? _clean(stateRow?['latest_message_at'])
                : _clean(row['created_at']),
          ),
          latestMessage: message,
          messageCount: 0,
        ),
      );

      accumulator.messageCount += 1;
    }

    final summaries = grouped.values.map((entry) => entry.build()).toList();
    summaries.sort((left, right) {
      final leftStamp = left.latestCreatedAt?.millisecondsSinceEpoch ?? -1;
      final rightStamp = right.latestCreatedAt?.millisecondsSinceEpoch ?? -1;
      return rightStamp.compareTo(leftStamp);
    });
    return summaries;
  }

  static Future<List<CardInteractionMessageEntry>> fetchThreadMessages({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required String counterpartUserId,
  }) async {
    final normalizedUserId = _clean(userId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedCounterpartUserId = _clean(counterpartUserId);
    if (normalizedUserId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId.isEmpty) {
      return const [];
    }

    final participantFilter = [
      'and(sender_user_id.eq.$normalizedUserId,receiver_user_id.eq.$normalizedCounterpartUserId)',
      'and(sender_user_id.eq.$normalizedCounterpartUserId,receiver_user_id.eq.$normalizedUserId)',
    ].join(',');

    final rows = await client
        .from('card_interactions')
        .select('id,message,status,created_at,sender_user_id,receiver_user_id')
        .eq('card_print_id', normalizedCardPrintId)
        .or(participantFilter)
        .order('created_at', ascending: true)
        .limit(200);

    return (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map((row) {
          final message = _clean(row['message']);
          final senderUserId = _clean(row['sender_user_id']);
          if (message.isEmpty || senderUserId.isEmpty) {
            return null;
          }

          return CardInteractionMessageEntry(
            id: _clean(row['id']),
            message: message,
            direction: senderUserId == normalizedUserId ? 'sent' : 'received',
            status: _clean(row['status']).toLowerCase() == 'closed'
                ? 'closed'
                : 'open',
            createdAt: DateTime.tryParse(_clean(row['created_at'])),
          );
        })
        .whereType<CardInteractionMessageEntry>()
        .toList();
  }

  static Future<CardInteractionSendResult> replyToThread({
    required SupabaseClient client,
    required String vaultItemId,
    required String cardPrintId,
    required String counterpartUserId,
    required String counterpartDisplayName,
    required String message,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.loginRequired,
        message: 'Sign in required.',
      );
    }

    final normalizedVaultItemId = _clean(vaultItemId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedCounterpartUserId = _clean(counterpartUserId);
    final normalizedMessage = _clean(message);

    if (normalizedVaultItemId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId.isEmpty ||
        normalizedMessage.isEmpty) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'A card, collector, and message are required.',
      );
    }

    if (normalizedCounterpartUserId == user.id) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'You cannot reply to yourself.',
      );
    }

    if (normalizedMessage.length > 2000) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'Reply must be 2000 characters or fewer.',
      );
    }

    final participantFilter = [
      'and(sender_user_id.eq.${user.id},receiver_user_id.eq.$normalizedCounterpartUserId)',
      'and(sender_user_id.eq.$normalizedCounterpartUserId,receiver_user_id.eq.${user.id})',
    ].join(',');

    final existingThread = await client
        .from('card_interactions')
        .select('id')
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .or(participantFilter)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (existingThread == null) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.unavailable,
        message: 'That message thread is no longer available for reply.',
      );
    }

    final duplicateWindowStart = DateTime.now()
        .subtract(const Duration(seconds: 15))
        .toUtc()
        .toIso8601String();

    final duplicate = await client
        .from('card_interactions')
        .select('id')
        .eq('sender_user_id', user.id)
        .eq('receiver_user_id', normalizedCounterpartUserId)
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .eq('message', normalizedMessage)
        .gte('created_at', duplicateWindowStart)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (duplicate != null) {
      return CardInteractionSendResult(
        ok: true,
        status: CardInteractionSendStatus.created,
        message:
            'Reply sent to ${counterpartDisplayName.trim().isEmpty ? 'collector' : counterpartDisplayName.trim()}.',
      );
    }

    await client.from('card_interactions').insert({
      'card_print_id': normalizedCardPrintId,
      'vault_item_id': normalizedVaultItemId,
      'sender_user_id': user.id,
      'receiver_user_id': normalizedCounterpartUserId,
      'message': normalizedMessage,
    });

    try {
      await client.from('card_signals').insert({
        'user_id': user.id,
        'card_print_id': normalizedCardPrintId,
        'signal_type': 'interaction',
      });
    } catch (_) {}

    return CardInteractionSendResult(
      ok: true,
      status: CardInteractionSendStatus.created,
      message:
          'Reply sent to ${counterpartDisplayName.trim().isEmpty ? 'collector' : counterpartDisplayName.trim()}.',
    );
  }

  static List<CardInteractionThreadSummary> filterByView(
    List<CardInteractionThreadSummary> groups,
    CardInteractionInboxView view,
  ) {
    switch (view) {
      case CardInteractionInboxView.unread:
        return groups
            .where(
              (group) =>
                  !group.isClosed && !group.isArchived && group.hasUnread,
            )
            .toList();
      case CardInteractionInboxView.sent:
        return groups
            .where(
              (group) =>
                  !group.isClosed &&
                  !group.isArchived &&
                  group.startedByCurrentUser,
            )
            .toList();
      case CardInteractionInboxView.closed:
        return groups
            .where((group) => group.isClosed || group.isArchived)
            .toList();
      case CardInteractionInboxView.inbox:
        return groups
            .where((group) => !group.isClosed && !group.isArchived)
            .toList();
    }
  }

  static String contactButtonLabel(String? intent) {
    switch ((intent ?? '').trim().toLowerCase()) {
      case 'trade':
        return 'Ask to trade';
      case 'sell':
        return 'Ask to buy';
      case 'showcase':
        return 'Contact';
      default:
        return 'Contact owner';
    }
  }

  static String defaultMessage({
    required String ownerDisplayName,
    required String cardName,
    String? intent,
  }) {
    final collectorName = ownerDisplayName.trim().isEmpty
        ? 'there'
        : ownerDisplayName.trim();

    switch ((intent ?? '').trim().toLowerCase()) {
      case 'trade':
        return 'Hi $collectorName, I\'m interested in trading for your $cardName. Is it still available?';
      case 'sell':
        return 'Hi $collectorName, I\'m interested in buying your $cardName. Is it still available?';
      case 'showcase':
        return 'Hi $collectorName, I saw your $cardName in the collector network and wanted to ask about it.';
      default:
        return 'Hi $collectorName, I\'m interested in your $cardName. Is it still available?';
    }
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String? _nullable(dynamic value) {
    final normalized = _clean(value);
    return normalized.isEmpty ? null : normalized;
  }

  static String? _bestImageUrl(dynamic primary, dynamic fallback) {
    final primaryUrl = _normalizeHttp(primary);
    if (primaryUrl != null) {
      return primaryUrl;
    }
    return _normalizeHttp(fallback);
  }

  static String? _normalizeHttp(dynamic value) {
    final normalized = _clean(value);
    if (normalized.isEmpty) {
      return null;
    }
    final uri = Uri.tryParse(normalized);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }
    return normalized;
  }
}

class _ThreadAccumulator {
  _ThreadAccumulator({
    required this.groupKey,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setName,
    required this.number,
    required this.latestMessage,
    required this.counterpartDisplayName,
    required this.counterpartUserId,
    required this.startedByCurrentUser,
    required this.hasUnread,
    required this.isClosed,
    required this.isArchived,
    required this.messageCount,
    this.vaultItemId,
    this.counterpartSlug,
    this.imageUrl,
    this.latestCreatedAt,
  });

  final String groupKey;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setName;
  final String number;
  String latestMessage;
  int messageCount;
  final String counterpartDisplayName;
  final String counterpartUserId;
  final bool startedByCurrentUser;
  final bool hasUnread;
  final bool isClosed;
  final bool isArchived;
  final String? vaultItemId;
  final String? counterpartSlug;
  final String? imageUrl;
  final DateTime? latestCreatedAt;

  CardInteractionThreadSummary build() {
    return CardInteractionThreadSummary(
      groupKey: groupKey,
      cardPrintId: cardPrintId,
      gvId: gvId,
      cardName: cardName,
      setName: setName,
      number: number,
      latestMessage: latestMessage,
      messageCount: messageCount,
      counterpartDisplayName: counterpartDisplayName,
      counterpartUserId: counterpartUserId,
      startedByCurrentUser: startedByCurrentUser,
      hasUnread: hasUnread,
      isClosed: isClosed,
      isArchived: isArchived,
      vaultItemId: vaultItemId,
      counterpartSlug: counterpartSlug,
      imageUrl: imageUrl,
      latestCreatedAt: latestCreatedAt,
    );
  }
}
