import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class EbaySellerLocalDraft {
  const EbaySellerLocalDraft({
    required this.ownerId,
    required this.instanceId,
    required this.draftId,
    required this.input,
    this.revision = 0,
    this.dirty = true,
    this.pending,
    this.pendingPhoto,
  });

  final String ownerId, instanceId, draftId;
  final Map<String, dynamic> input;
  final int revision;
  final bool dirty;
  final Map<String, dynamic>? pending, pendingPhoto;

  EbaySellerLocalDraft copyWith({
    Map<String, dynamic>? input,
    int? revision,
    bool? dirty,
    Map<String, dynamic>? pending,
    Map<String, dynamic>? pendingPhoto,
    bool clearPending = false,
    bool clearPhoto = false,
  }) => EbaySellerLocalDraft(
    ownerId: ownerId,
    instanceId: instanceId,
    draftId: draftId,
    input: input ?? this.input,
    revision: revision ?? this.revision,
    dirty: dirty ?? this.dirty,
    pending: clearPending ? null : pending ?? this.pending,
    pendingPhoto: clearPhoto ? null : pendingPhoto ?? this.pendingPhoto,
  );

  Map<String, dynamic> toJson() => {
    'version': 1,
    'ownerId': ownerId,
    'instanceId': instanceId,
    'draftId': draftId,
    'revision': revision,
    'dirty': dirty,
    'input': input,
    if (pending != null)
      'pending': {
        for (final key in const [
          'action',
          'requestId',
          'operationId',
          'revision',
          'reviewHash',
          'salePriceCents',
        ])
          if (pending!.containsKey(key)) key: pending![key],
      },
    if (pendingPhoto != null)
      'pendingPhoto': {
        for (final key in const ['id', 'filename', 'sha256', 'localPath'])
          if (pendingPhoto!.containsKey(key)) key: pendingPhoto![key],
      },
  };
}

/// Stores only this owner's draft input and stable operation IDs. Provider
/// credentials, launch capabilities and authorization codes are never stored.
class EbaySellerDraftStore {
  static final _uuid = RegExp(r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$');
  String key(String ownerId, String instanceId) {
    if (!_uuid.hasMatch(ownerId) || !_uuid.hasMatch(instanceId)) {
      throw StateError('Select an owned copy before saving a listing draft.');
    }
    return 'grookai.ebay.listing.v1.$ownerId.$instanceId';
  }

  Future<EbaySellerLocalDraft?> load(String ownerId, String instanceId) async {
    final raw = (await SharedPreferences.getInstance()).getString(
      key(ownerId, instanceId),
    );
    if (raw == null || raw.length > 200000) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map ||
          value['version'] != 1 ||
          value['ownerId'] != ownerId ||
          value['instanceId'] != instanceId ||
          value['draftId'] is! String ||
          !_uuid.hasMatch(value['draftId'] as String) ||
          value['revision'] is! int ||
          (value['revision'] as int) < 0 ||
          value['input'] is! Map ||
          value['dirty'] is! bool) {
        return null;
      }
      return EbaySellerLocalDraft(
        ownerId: ownerId,
        instanceId: instanceId,
        draftId: value['draftId'] as String,
        input: Map<String, dynamic>.from(value['input'] as Map),
        revision: value['revision'] as int,
        dirty: value['dirty'] as bool,
        pending: value['pending'] is Map
            ? Map<String, dynamic>.from(value['pending'] as Map)
            : null,
        pendingPhoto: value['pendingPhoto'] is Map
            ? Map<String, dynamic>.from(value['pendingPhoto'] as Map)
            : null,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> save(EbaySellerLocalDraft draft) async {
    if (!_uuid.hasMatch(draft.draftId) || draft.revision < 0) {
      throw StateError('This listing draft has an invalid identity.');
    }
    final encoded = jsonEncode(draft.toJson());
    if (encoded.length > 200000) {
      throw StateError('This listing draft is too large to retain locally.');
    }
    final saved = await (await SharedPreferences.getInstance()).setString(
      key(draft.ownerId, draft.instanceId),
      encoded,
    );
    if (!saved) {
      throw StateError('Could not retain this listing draft locally.');
    }
  }
}
