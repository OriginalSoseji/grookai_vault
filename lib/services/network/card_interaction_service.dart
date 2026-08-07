import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';
import '../identity/catalog_artwork_resolution.dart';
import '../identity/display_identity.dart';
import 'intent_presentation.dart' as intent_presentation;

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
    this.cardPrintId,
    this.cardPrintingId,
    this.vaultItemId,
    this.counterpartUserId,
  });

  final bool ok;
  final CardInteractionSendStatus status;
  final String message;
  final String? cardPrintId;
  final String? cardPrintingId;
  final String? vaultItemId;
  final String? counterpartUserId;
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
    this.cardPrintingId,
    this.printingGvId,
    this.finishKey,
    this.finishLabel,
    this.counterpartSlug,
    this.imageUrl,
    this.fallbackImageUrl,
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
  final String? cardPrintingId;
  final String? printingGvId;
  final String? finishKey;
  final String? finishLabel;
  final String? counterpartSlug;
  final String? imageUrl;
  final String? fallbackImageUrl;
  final DateTime? latestCreatedAt;

  String get printingIdentityLabel {
    if ((cardPrintingId ?? '').trim().isEmpty) {
      return 'Printing not recorded';
    }
    final label = formatFinishLabel(
      finishKey: finishKey,
      finishLabel: finishLabel,
    );
    return 'Printing: ${label ?? printingGvId ?? 'Exact printing'}';
  }

  CardInteractionThreadSummary copyWith({
    String? latestMessage,
    int? messageCount,
    bool? startedByCurrentUser,
    bool? hasUnread,
    bool? isClosed,
    bool? isArchived,
    DateTime? latestCreatedAt,
  }) {
    return CardInteractionThreadSummary(
      groupKey: groupKey,
      cardPrintId: cardPrintId,
      gvId: gvId,
      cardName: cardName,
      setName: setName,
      number: number,
      latestMessage: latestMessage ?? this.latestMessage,
      messageCount: messageCount ?? this.messageCount,
      counterpartDisplayName: counterpartDisplayName,
      counterpartUserId: counterpartUserId,
      startedByCurrentUser: startedByCurrentUser ?? this.startedByCurrentUser,
      hasUnread: hasUnread ?? this.hasUnread,
      isClosed: isClosed ?? this.isClosed,
      isArchived: isArchived ?? this.isArchived,
      vaultItemId: vaultItemId,
      cardPrintingId: cardPrintingId,
      printingGvId: printingGvId,
      finishKey: finishKey,
      finishLabel: finishLabel,
      counterpartSlug: counterpartSlug,
      imageUrl: imageUrl,
      fallbackImageUrl: fallbackImageUrl,
      latestCreatedAt: latestCreatedAt ?? this.latestCreatedAt,
    );
  }
}

class CardInteractionService {
  static Future<CardInteractionSendResult> reportThread({
    required SupabaseClient client,
    required String counterpartUserId,
    required String cardPrintId,
    String reason = 'other',
    String? details,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.loginRequired,
        message: 'Sign in required to report.',
      );
    }

    final normalizedCounterpartUserId = _clean(counterpartUserId);
    final normalizedCardPrintId = _clean(cardPrintId);
    if (normalizedCounterpartUserId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId == user.id) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'This thread cannot be reported.',
      );
    }

    await client.from('trust_reports').insert({
      'reporter_user_id': user.id,
      'reported_user_id': normalizedCounterpartUserId,
      'surface': 'message',
      'surface_id': normalizedCardPrintId,
      'reason': _normalizeTrustReason(reason),
      'details': _nullable(details),
    });

    return const CardInteractionSendResult(
      ok: true,
      status: CardInteractionSendStatus.created,
      message: 'Report submitted.',
    );
  }

  static Future<CardInteractionSendResult> blockCollector({
    required SupabaseClient client,
    required String counterpartUserId,
    String? cardPrintId,
    String? cardPrintingId,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.loginRequired,
        message: 'Sign in required to block.',
      );
    }

    final normalizedCounterpartUserId = _clean(counterpartUserId);
    if (normalizedCounterpartUserId.isEmpty ||
        normalizedCounterpartUserId == user.id) {
      return const CardInteractionSendResult(
        ok: false,
        status: CardInteractionSendStatus.validationError,
        message: 'This collector cannot be blocked.',
      );
    }

    await client.from('trust_blocks').upsert({
      'user_id': user.id,
      'blocked_user_id': normalizedCounterpartUserId,
    }, onConflict: 'user_id,blocked_user_id');

    final normalizedCardPrintId = _clean(cardPrintId);
    if (normalizedCardPrintId.isNotEmpty) {
      final normalizedCardPrintingId = _clean(cardPrintingId);
      final now = DateTime.now().toUtc().toIso8601String();
      await client.from('card_interaction_group_states').upsert(
        {
          'user_id': user.id,
          'card_print_id': normalizedCardPrintId,
          'card_printing_id': normalizedCardPrintingId.isEmpty
              ? null
              : normalizedCardPrintingId,
          'counterpart_user_id': normalizedCounterpartUserId,
          'has_unread': false,
          'last_read_at': now,
          'latest_message_at': now,
          'archived_at': now,
          'closed_at': null,
          'updated_at': now,
        },
        onConflict:
            'user_id,card_print_id,card_printing_id,counterpart_user_id',
      );
    }

    return const CardInteractionSendResult(
      ok: true,
      status: CardInteractionSendStatus.created,
      message: 'Collector blocked.',
    );
  }

  static Future<CardInteractionSendResult> sendMessage({
    required SupabaseClient client,
    String? vaultItemInstanceId,
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
    final normalizedRequestedInstanceId = _nullable(vaultItemInstanceId);
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

    var targetQuery = client
        .from('v_card_contact_targets_v1')
        .select(
          'instance_id,vault_item_id,owner_user_id,owner_display_name,card_print_id,card_printing_id,intent,created_at',
        )
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId);
    if (normalizedRequestedInstanceId != null) {
      targetQuery = targetQuery.eq(
        'instance_id',
        normalizedRequestedInstanceId,
      );
    }
    final target = await targetQuery
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    final targetRow = target == null ? null : Map<String, dynamic>.from(target);
    final receiverUserId = _clean(targetRow?['owner_user_id']);
    final ownerDisplayName = _clean(targetRow?['owner_display_name']);
    final cardPrintingId = _nullable(targetRow?['card_printing_id']);
    final resolvedVaultItemInstanceId = _clean(targetRow?['instance_id']);

    if (receiverUserId.isEmpty ||
        resolvedVaultItemInstanceId.isEmpty ||
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

    var duplicateQuery = client
        .from('card_interactions')
        .select('id')
        .eq('sender_user_id', user.id)
        .eq('receiver_user_id', receiverUserId)
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('vault_item_instance_id', resolvedVaultItemInstanceId)
        .eq('card_print_id', normalizedCardPrintId)
        .eq('message', normalizedMessage);
    duplicateQuery = cardPrintingId == null
        ? duplicateQuery.isFilter('card_printing_id', null)
        : duplicateQuery.eq('card_printing_id', cardPrintingId);
    final duplicate = await duplicateQuery
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
        cardPrintId: normalizedCardPrintId,
        cardPrintingId: cardPrintingId,
        vaultItemId: normalizedVaultItemId,
        counterpartUserId: receiverUserId,
      );
    }

    await client.from('card_interactions').insert({
      'vault_item_instance_id': resolvedVaultItemInstanceId,
      'card_print_id': normalizedCardPrintId,
      'card_printing_id': cardPrintingId,
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
      cardPrintId: normalizedCardPrintId,
      cardPrintingId: cardPrintingId,
      vaultItemId: normalizedVaultItemId,
      counterpartUserId: receiverUserId,
    );
  }

  static Future<CardInteractionThreadSummary?> fetchThreadSummaryForContact({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required String counterpartUserId,
    String? cardPrintingId,
  }) async {
    final normalizedUserId = _clean(userId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedCounterpartUserId = _clean(counterpartUserId);
    final normalizedCardPrintingId = _clean(cardPrintingId);
    if (normalizedUserId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId.isEmpty) {
      return null;
    }

    final summaries = await fetchThreadSummaries(
      client: client,
      userId: normalizedUserId,
    );
    for (final summary in summaries) {
      if (summary.cardPrintId == normalizedCardPrintId &&
          summary.counterpartUserId == normalizedCounterpartUserId &&
          (normalizedCardPrintingId.isEmpty
              ? summary.cardPrintingId == null
              : summary.cardPrintingId == normalizedCardPrintingId)) {
        return summary;
      }
    }
    return null;
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
          'id,card_print_id,card_printing_id,vault_item_id,sender_user_id,receiver_user_id,message,status,created_at',
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
    final cardPrintingIds = interactionRows
        .map((row) => _clean(row['card_printing_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    final lookups = await Future.wait<dynamic>([
      cardPrintIds.isEmpty
          ? Future.value(<dynamic>[])
          : client
                .from('card_prints')
                .select(
                  'id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,representative_image_url,sets(name)',
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
            'card_print_id,card_printing_id,counterpart_user_id,has_unread,archived_at,closed_at,latest_message_at',
          )
          .eq('user_id', normalizedUserId),
      cardPrintingIds.isEmpty
          ? Future.value(<dynamic>[])
          : client
                .from('card_printings')
                .select(
                  'id,card_print_id,printing_gv_id,finish_key,image_path,finish_keys(label)',
                )
                .inFilter('id', cardPrintingIds),
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
      final cardPrintingId = _clean(row['card_printing_id']);
      final counterpartUserId = _clean(row['counterpart_user_id']);
      if (cardPrintId.isEmpty || counterpartUserId.isEmpty) {
        continue;
      }
      stateByKey['$cardPrintId:${cardPrintingId.isEmpty ? 'unrecorded' : cardPrintingId}:$counterpartUserId'] =
          row;
    }

    final printingById = <String, Map<String, dynamic>>{};
    for (final rawRow in lookups[3] as List<dynamic>) {
      final row = Map<String, dynamic>.from(rawRow as Map);
      final id = _clean(row['id']);
      if (id.isNotEmpty) {
        printingById[id] = row;
      }
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

      final requestedCardPrintingId = _clean(row['card_printing_id']);
      final requestedPrinting = printingById[requestedCardPrintingId];
      final printing =
          requestedPrinting != null &&
              _clean(requestedPrinting['card_print_id']) == cardPrintId
          ? requestedPrinting
          : null;
      final cardPrintingId = printing == null ? null : _clean(printing['id']);
      final key =
          '$cardPrintId:${cardPrintingId ?? 'unrecorded'}:$counterpartUserId';
      final stateRow = stateByKey[key];
      final counterpartProfile = profileById[counterpartUserId];
      final gvId = _clean(card['gv_id']).isEmpty
          ? cardPrintId
          : _clean(card['gv_id']);
      final parentArtwork = resolveCatalogArtwork(
        gvId: gvId,
        providerImageUrl: _displayImageUrl(card),
      );
      final printingGvId = _nullable(printing?['printing_gv_id']);
      final exactArtworkUrl = buildCanonicalCardImageUrl(printingGvId);
      final imageUrl = exactArtworkUrl ?? parentArtwork.primaryImageUrl;
      final fallbackImageUrl =
          exactArtworkUrl != null &&
              exactArtworkUrl != parentArtwork.primaryImageUrl
          ? parentArtwork.primaryImageUrl
          : parentArtwork.fallbackImageUrl;
      final finishRecord = switch (printing?['finish_keys']) {
        List<dynamic> rows when rows.isNotEmpty => Map<String, dynamic>.from(
          rows.first as Map,
        ),
        Map<dynamic, dynamic> row => Map<String, dynamic>.from(row),
        _ => null,
      };
      final finishKey = _nullable(printing?['finish_key']);
      final finishLabel = formatFinishLabel(
        finishKey: finishKey,
        finishLabel: _nullable(finishRecord?['label']),
      );
      final setRecord = switch (card['sets']) {
        List<dynamic> rows when rows.isNotEmpty => Map<String, dynamic>.from(
          rows.first as Map,
        ),
        Map<String, dynamic> row => row,
        _ => null,
      };
      final cardDisplayName = resolveDisplayIdentityFromFields(
        name: _clean(card['name']).isEmpty
            ? 'Unknown card'
            : _clean(card['name']),
        variantKey: _nullable(card['variant_key']),
        printedIdentityModifier: _nullable(card['printed_identity_modifier']),
      ).displayName;

      final accumulator = grouped.putIfAbsent(
        key,
        () => _ThreadAccumulator(
          groupKey: key,
          cardPrintId: cardPrintId,
          gvId: gvId,
          cardName: cardDisplayName,
          setName: _clean(setRecord?['name']).isEmpty
              ? (_clean(card['set_code']).isEmpty
                    ? 'Unknown set'
                    : _clean(card['set_code']))
              : _clean(setRecord?['name']),
          number: _clean(card['number']).isEmpty ? '—' : _clean(card['number']),
          imageUrl: imageUrl,
          fallbackImageUrl: fallbackImageUrl,
          vaultItemId: vaultItemId,
          cardPrintingId: cardPrintingId,
          printingGvId: printingGvId,
          finishKey: finishKey,
          finishLabel: finishLabel,
          counterpartDisplayName:
              _clean(counterpartProfile?['display_name']).isEmpty
              ? 'Collector'
              : _clean(counterpartProfile?['display_name']),
          counterpartUserId: counterpartUserId,
          counterpartSlug: _nullable(counterpartProfile?['slug']),
          startedByCurrentUser: direction == 'sent',
          hasUnread: stateRow != null
              ? stateRow['has_unread'] == true
              : direction == 'received',
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
      accumulator.startedByCurrentUser = direction == 'sent';
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
    String? cardPrintingId,
  }) async {
    final normalizedUserId = _clean(userId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedCounterpartUserId = _clean(counterpartUserId);
    final normalizedCardPrintingId = _clean(cardPrintingId);
    if (normalizedUserId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId.isEmpty) {
      return const [];
    }

    final participantFilter = [
      'and(sender_user_id.eq.$normalizedUserId,receiver_user_id.eq.$normalizedCounterpartUserId)',
      'and(sender_user_id.eq.$normalizedCounterpartUserId,receiver_user_id.eq.$normalizedUserId)',
    ].join(',');

    var query = client
        .from('card_interactions')
        .select('id,message,status,created_at,sender_user_id,receiver_user_id')
        .eq('card_print_id', normalizedCardPrintId)
        .or(participantFilter);
    query = normalizedCardPrintingId.isEmpty
        ? query.isFilter('card_printing_id', null)
        : query.eq('card_printing_id', normalizedCardPrintingId);
    final rows = await query.order('created_at', ascending: true).limit(200);

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
    String? cardPrintingId,
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
    final normalizedCardPrintingId = _clean(cardPrintingId);
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

    var existingThreadQuery = client
        .from('card_interactions')
        .select('id,card_printing_id,vault_item_instance_id')
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .or(participantFilter);
    existingThreadQuery = normalizedCardPrintingId.isEmpty
        ? existingThreadQuery.isFilter('card_printing_id', null)
        : existingThreadQuery.eq('card_printing_id', normalizedCardPrintingId);
    final existingThread = await existingThreadQuery
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
    final resolvedCardPrintingId = _nullable(
      existingThread['card_printing_id'],
    );
    final resolvedVaultItemInstanceId = _nullable(
      existingThread['vault_item_instance_id'],
    );

    final duplicateWindowStart = DateTime.now()
        .subtract(const Duration(seconds: 15))
        .toUtc()
        .toIso8601String();

    var duplicateQuery = client
        .from('card_interactions')
        .select('id')
        .eq('sender_user_id', user.id)
        .eq('receiver_user_id', normalizedCounterpartUserId)
        .eq('vault_item_id', normalizedVaultItemId)
        .eq('card_print_id', normalizedCardPrintId)
        .eq('message', normalizedMessage);
    duplicateQuery = resolvedVaultItemInstanceId == null
        ? duplicateQuery.isFilter('vault_item_instance_id', null)
        : duplicateQuery.eq(
            'vault_item_instance_id',
            resolvedVaultItemInstanceId,
          );
    duplicateQuery = resolvedCardPrintingId == null
        ? duplicateQuery.isFilter('card_printing_id', null)
        : duplicateQuery.eq('card_printing_id', resolvedCardPrintingId);
    final duplicate = await duplicateQuery
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
        cardPrintId: normalizedCardPrintId,
        cardPrintingId: resolvedCardPrintingId,
        vaultItemId: normalizedVaultItemId,
        counterpartUserId: normalizedCounterpartUserId,
      );
    }

    await client.from('card_interactions').insert({
      'vault_item_instance_id': resolvedVaultItemInstanceId,
      'card_print_id': normalizedCardPrintId,
      'card_printing_id': resolvedCardPrintingId,
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
      cardPrintId: normalizedCardPrintId,
      cardPrintingId: resolvedCardPrintingId,
      vaultItemId: normalizedVaultItemId,
      counterpartUserId: normalizedCounterpartUserId,
    );
  }

  static Future<void> markThreadRead({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required String counterpartUserId,
    String? cardPrintingId,
    DateTime? readAt,
  }) async {
    final normalizedUserId = _clean(userId);
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedCardPrintingId = _clean(cardPrintingId);
    final normalizedCounterpartUserId = _clean(counterpartUserId);
    if (normalizedUserId.isEmpty ||
        normalizedCardPrintId.isEmpty ||
        normalizedCounterpartUserId.isEmpty) {
      return;
    }

    final readStamp = (readAt ?? DateTime.now()).toUtc().toIso8601String();
    final updatedAt = DateTime.now().toUtc().toIso8601String();

    // MESSAGE_READ_STATE_V1
    // mark-read trigger: thread open after message load
    // refresh trigger: inbox reloads when thread route returns
    // expected status transition: New/Unread -> Active
    var query = client
        .from('card_interaction_group_states')
        .update({
          'has_unread': false,
          'last_read_at': readStamp,
          'updated_at': updatedAt,
        })
        .eq('user_id', normalizedUserId)
        .eq('card_print_id', normalizedCardPrintId)
        .eq('counterpart_user_id', normalizedCounterpartUserId);
    query = normalizedCardPrintingId.isEmpty
        ? query.isFilter('card_printing_id', null)
        : query.eq('card_printing_id', normalizedCardPrintingId);
    await query.eq('has_unread', true);
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
    // LOCK: Contact language must stay calm, clear, and product-facing.
    return intent_presentation.getVaultIntentActionLabel(intent);
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
        return 'Hi $collectorName, I saw your $cardName and wanted to ask about a trade.';
      case 'sell':
        return 'Hi $collectorName, I saw your $cardName and wanted to ask about buying it.';
      case 'showcase':
        return 'Hi $collectorName, I saw your $cardName and wanted to ask about it.';
      default:
        return 'Hi $collectorName, I saw your $cardName and wanted to ask about it.';
    }
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String _normalizeTrustReason(String value) {
    switch (value.trim().toLowerCase()) {
      case 'spam':
      case 'harassment':
      case 'scam':
      case 'inappropriate':
        return value.trim().toLowerCase();
      default:
        return 'other';
    }
  }

  static String? _nullable(dynamic value) {
    final normalized = _clean(value);
    return normalized.isEmpty ? null : normalized;
  }

  static String? _displayImageUrl(Map<String, dynamic> row) {
    return resolveDisplayImageUrlFromRow(row);
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
    this.cardPrintingId,
    this.printingGvId,
    this.finishKey,
    this.finishLabel,
    this.counterpartSlug,
    this.imageUrl,
    this.fallbackImageUrl,
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
  bool startedByCurrentUser;
  final bool hasUnread;
  final bool isClosed;
  final bool isArchived;
  final String? vaultItemId;
  final String? cardPrintingId;
  final String? printingGvId;
  final String? finishKey;
  final String? finishLabel;
  final String? counterpartSlug;
  final String? imageUrl;
  final String? fallbackImageUrl;
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
      cardPrintingId: cardPrintingId,
      printingGvId: printingGvId,
      finishKey: finishKey,
      finishLabel: finishLabel,
      counterpartSlug: counterpartSlug,
      imageUrl: imageUrl,
      fallbackImageUrl: fallbackImageUrl,
      latestCreatedAt: latestCreatedAt,
    );
  }
}
