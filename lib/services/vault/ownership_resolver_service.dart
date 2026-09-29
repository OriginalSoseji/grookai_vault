import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/ownership_state.dart';
import '../public/public_collector_service.dart';
import 'vault_card_service.dart';
import 'owned_copy_read_service.dart';
import 'vault_gvvi_service.dart';

class OwnershipResolverService {
  static const bool _kOwnershipResolverDiagnostics = false;

  const OwnershipResolverService({required this.client});

  final SupabaseClient client;

  Future<Map<String, OwnershipState>> resolveMany({
    required Iterable<String> cardPrintIds,
    String? subjectUserId,
  }) async {
    final normalizedIds = cardPrintIds
        .map(_clean)
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final currentUserId = _clean(client.auth.currentUser?.id);
    final normalizedSubjectUserId = _clean(subjectUserId);
    final isSelfContext = _isSelfContext(
      currentUserId: currentUserId,
      subjectUserId: normalizedSubjectUserId,
    );

    if (normalizedIds.isEmpty) {
      _trace('batch missing card_print_ids; returning empty states');
      return const <String, OwnershipState>{};
    }

    _trace(
      'batch start count=${normalizedIds.length} '
      'subject_user_id=${normalizedSubjectUserId.isEmpty ? 'self' : normalizedSubjectUserId} '
      'is_self=$isSelfContext',
    );

    if (isSelfContext) {
      return _resolveSelfContextBatch(cardPrintIds: normalizedIds);
    }

    return _resolvePublicContextBatch(
      cardPrintIds: normalizedIds,
      subjectUserId: normalizedSubjectUserId,
    );
  }

  Future<OwnershipState> resolve({
    required String cardPrintId,
    String? subjectUserId,
  }) async {
    final normalizedCardPrintId = _clean(cardPrintId);
    final currentUserId = _clean(client.auth.currentUser?.id);
    final normalizedSubjectUserId = _clean(subjectUserId);
    final isSelfContext =
        normalizedSubjectUserId.isEmpty ||
        (currentUserId.isNotEmpty && normalizedSubjectUserId == currentUserId);

    if (normalizedCardPrintId.isEmpty) {
      _trace('card_print_id missing; returning empty state');
      return OwnershipState.empty(isSelfContext: isSelfContext);
    }
    final states = await resolveMany(
      cardPrintIds: <String>[normalizedCardPrintId],
      subjectUserId: subjectUserId,
    );
    return states[normalizedCardPrintId] ??
        OwnershipState.empty(isSelfContext: isSelfContext);
  }

  Future<OwnershipState> _resolvePublicContext({
    required String cardPrintId,
    required String subjectUserId,
  }) async {
    if (subjectUserId.isEmpty) {
      _trace('public context missing subject user; returning empty');
      return const OwnershipState.empty(isSelfContext: false);
    }

    final snapshot =
        await PublicCollectorService.resolvePublicOwnershipSnapshot(
          client: client,
          ownerUserId: subjectUserId,
          cardPrintId: cardPrintId,
        );

    PublicGvviData? publicGvvi;
    final snapshotGvviId = _clean(snapshot.primaryGvviId);
    if (snapshotGvviId.isNotEmpty) {
      publicGvvi = await VaultGvviService.loadPublic(
        client: client,
        gvviId: snapshotGvviId,
      );
    }

    final primaryGvviId = snapshotGvviId.isNotEmpty
        ? snapshotGvviId
        : _clean(publicGvvi?.gvviId).isNotEmpty
        ? _clean(publicGvvi?.gvviId)
        : null;
    final primaryVaultItemId = _clean(snapshot.primaryVaultItemId).isNotEmpty
        ? _clean(snapshot.primaryVaultItemId)
        : _clean(publicGvvi?.vaultItemId).isNotEmpty
        ? _clean(publicGvvi?.vaultItemId)
        : null;
    final onWall = snapshot.onWall || publicGvvi?.isDiscoverable == true;
    final inPlay =
        snapshot.inPlay ||
        _clean(publicGvvi?.intent) == 'trade' ||
        _clean(publicGvvi?.intent) == 'sell' ||
        _clean(publicGvvi?.intent) == 'showcase';

    _trace(
      'public resolved card_print_id=$cardPrintId '
      'subject_user_id=$subjectUserId '
      'ownedCount=${snapshot.ownedCount} '
      'gvvi=$primaryGvviId '
      'onWall=$onWall '
      'inPlay=$inPlay',
    );

    return OwnershipState(
      owned: snapshot.ownedCount > 0,
      ownedCount: snapshot.ownedCount,
      primaryVaultItemId: primaryVaultItemId,
      primaryGvviId: primaryGvviId,
      hasExactCopy: primaryGvviId != null,
      onWall: onWall,
      inPlay: inPlay,
      isSelfContext: false,
      bestAction: OwnershipAction.none,
    );
  }

  Future<Map<String, OwnershipState>> _resolveSelfContextBatch({
    required List<String> cardPrintIds,
  }) async {
    final currentUserId = _clean(client.auth.currentUser?.id);
    if (currentUserId.isEmpty) {
      _trace('self batch requested without current user; returning empty');
      return <String, OwnershipState>{
        for (final cardPrintId in cardPrintIds)
          cardPrintId: const OwnershipState.empty(isSelfContext: true),
      };
    }

    final states = <String, OwnershipState>{};
    // Bounded concurrency; every parent is checked, including slab-only parents
    // that the older raw-only counts RPC cannot represent.
    for (var offset = 0; offset < cardPrintIds.length; offset += 8) {
      final ids = cardPrintIds.sublist(
        offset,
        (offset + 8).clamp(0, cardPrintIds.length),
      );
      final sharedStates = await VaultCardService.getSharedStatesByCardPrintIds(
        client: client,
        cardPrintIds: ids,
      );
      final copiesByCard = await Future.wait(
        ids.map(
          (id) => OwnedCopyReadService.load(client: client, cardPrintId: id),
        ),
      );
      if (_clean(client.auth.currentUser?.id) != currentUserId) {
        throw StateError('Account changed while resolving ownership.');
      }
      for (var index = 0; index < ids.length; index++) {
        final copies = copiesByCard[index];
        Map<String, dynamic>? primary;
        for (final copy in copies) {
          if (_clean(copy['gv_vi_id']).isNotEmpty) {
            primary = copy;
            break;
          }
        }
        final anchor = primary == null
            ? (copies.isEmpty ? null : copies.first['legacy_vault_item_id'])
            : primary['legacy_vault_item_id'];
        states[ids[index]] = _buildSelfState(
          ownedCount: copies.length,
          primaryVaultItemId: _clean(anchor),
          primaryGvviId: _clean(primary?['gv_vi_id']),
          onWall:
              copies.isNotEmpty && sharedStates[ids[index]]?.isShared == true,
          inPlay: copies.any(
            (copy) => const {
              'sell',
              'trade',
              'showcase',
            }.contains(_clean(copy['intent'])),
          ),
        );
      }
    }
    return states;
  }

  Future<Map<String, OwnershipState>> _resolvePublicContextBatch({
    required List<String> cardPrintIds,
    required String subjectUserId,
  }) async {
    final entries = await Future.wait(
      cardPrintIds.map((cardPrintId) async {
        final state = await _resolvePublicContext(
          cardPrintId: cardPrintId,
          subjectUserId: subjectUserId,
        );
        return MapEntry(cardPrintId, state);
      }),
    );

    final states = <String, OwnershipState>{
      for (final entry in entries) entry.key: entry.value,
    };
    _trace(
      'public batch resolved count=${states.length} '
      'subject_user_id=$subjectUserId',
    );
    return states;
  }

  OwnershipState _buildSelfState({
    required int ownedCount,
    required String? primaryVaultItemId,
    required String? primaryGvviId,
    required bool onWall,
    required bool inPlay,
  }) {
    final normalizedVaultItemId = _clean(primaryVaultItemId).isEmpty
        ? null
        : _clean(primaryVaultItemId);
    final normalizedGvviId = _clean(primaryGvviId).isEmpty
        ? null
        : _clean(primaryGvviId);
    final hasExactCopy = normalizedGvviId != null;

    return OwnershipState(
      owned: ownedCount > 0,
      ownedCount: ownedCount,
      primaryVaultItemId: normalizedVaultItemId,
      primaryGvviId: normalizedGvviId,
      hasExactCopy: hasExactCopy,
      onWall: onWall,
      inPlay: inPlay,
      isSelfContext: true,
      bestAction: _computeBestAction(
        isSelfContext: true,
        ownedCount: ownedCount,
        hasExactCopy: hasExactCopy,
        hasVaultItem: normalizedVaultItemId != null,
      ),
    );
  }

  OwnershipAction _computeBestAction({
    required bool isSelfContext,
    required int ownedCount,
    required bool hasExactCopy,
    required bool hasVaultItem,
  }) {
    if (!isSelfContext) {
      return OwnershipAction.none;
    }
    if (ownedCount <= 0) {
      return OwnershipAction.addToVault;
    }
    if (!hasExactCopy && hasVaultItem) {
      return OwnershipAction.openManageCard;
    }
    if (ownedCount == 1 && hasExactCopy) {
      return OwnershipAction.viewYourCopy;
    }
    if (ownedCount > 1) {
      return OwnershipAction.addAnotherCopy;
    }
    return OwnershipAction.none;
  }

  void _trace(String message) {
    if (kDebugMode && _kOwnershipResolverDiagnostics) {
      debugPrint('OWNERSHIP_RESOLVER_V1 $message');
    }
  }

  bool _isSelfContext({
    required String currentUserId,
    required String subjectUserId,
  }) {
    return subjectUserId.isEmpty ||
        (currentUserId.isNotEmpty && subjectUserId == currentUserId);
  }

  String _clean(dynamic value) => (value ?? '').toString().trim();
}
