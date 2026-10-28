import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:uuid/uuid.dart';
import 'ebay_seller_draft_store.dart';
import 'ebay_seller_photo_cache.dart';
import 'ebay_seller_service.dart';

Map<String, dynamic> sellerMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<Map<String, dynamic>> sellerRows(dynamic value) => value is List
    ? value.whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList()
    : <Map<String, dynamic>>[];

/// Presentation and recovery controller. Every operation transition and all
/// listing/condition/fee authority remain on the authenticated server.
class EbaySellerController extends ChangeNotifier {
  EbaySellerController({
    required this.api,
    EbaySellerDraftStore? store,
    this.photoCache,
    this.initialInstanceId,
    this.initialDraftId,
  }) : store = store ?? EbaySellerDraftStore(),
       _selectedDraftId = initialDraftId;
  final EbaySellerApi api;
  final EbaySellerDraftStore store;
  EbaySellerPhotoCache? photoCache;
  final String? initialInstanceId, initialDraftId;
  String? _selectedDraftId;
  Map<String, dynamic> workspace = {}, draft = {}, metadata = {};
  final Map<String, String> photoUrls = {};
  EbaySellerLocalDraft? local;
  String? busy, error, notice;
  bool _disposed = false;
  Future<void> _persistQueue = Future<void>.value();
  static const _uuid = Uuid();

  Map<String, dynamic> get account => sellerMap(workspace['account']);
  Map<String, dynamic> get copy => sellerMap(workspace['copy']);
  bool get editable =>
      copy['isArchived'] != true &&
      (draft.isEmpty || draft['state'] == 'editing');
  List<Map<String, dynamic>> get operations => sellerRows(draft['operations']);
  void _changed() {
    if (!_disposed) notifyListeners();
  }

  Future<void> run(String label, Future<void> Function() action) async {
    if (busy != null || _disposed) return;
    busy = label;
    error = null;
    notice = null;
    _changed();
    try {
      await action();
    } catch (failure) {
      error = failure is StateError
          ? failure.message.toString()
          : EbaySellerService.uncertainMessage;
    } finally {
      busy = null;
      _changed();
    }
  }

  Future<void> _retain(EbaySellerLocalDraft value) async {
    local = value;
    final next = _persistQueue
        .catchError((_) {})
        .then((_) => store.save(value));
    _persistQueue = next;
    await next;
  }

  Future<void> refresh() => run('Loading eBay listings', _refresh);
  Future<void> _refresh() async {
    Map<String, dynamic> selected = {};
    if (_selectedDraftId != null) selected = await api.draft(_selectedDraftId!);
    final selectedInstance =
        selected['instanceId'] as String? ??
        initialInstanceId ??
        local?.instanceId;
    workspace = await api.workspace(instanceId: selectedInstance);
    final currentCopy = copy;
    if (currentCopy['id'] is! String) {
      _changed();
      return;
    }
    final instanceId = currentCopy['id'] as String;
    final saved = await store.load(api.ownerId, instanceId);
    final preferred = _selectedDraftId ?? local?.draftId ?? saved?.draftId;
    final summaries = sellerRows(workspace['drafts']);
    final matches = summaries.where((d) => d['id'] == preferred);
    final active = matches.isNotEmpty
        ? matches.first
        : summaries.cast<Map<String, dynamic>?>().firstWhere(
            (d) => ![
              'withdrawn',
              'ended',
              'sold',
              'abandoned',
            ].contains(d?['state']),
            orElse: () => null,
          );
    if (selected.isEmpty && active != null) {
      selected = await api.draft(active['id'] as String);
    }
    draft = selected;
    final retained =
        saved != null && (selected.isEmpty || saved.draftId == selected['id'])
        ? saved
        : null;
    if (retained != null &&
        retained.dirty &&
        (selected.isEmpty || selected['state'] == 'editing')) {
      await _retain(
        retained.copyWith(
          revision: selected['revision'] as int? ?? retained.revision,
        ),
      );
      if (selected.isNotEmpty) {
        notice =
            'Your local edits are retained. Save the draft to update its saved version.';
      }
    } else {
      await _retain(
        EbaySellerLocalDraft(
          ownerId: api.ownerId,
          instanceId: instanceId,
          draftId: selected['id'] as String? ?? retained?.draftId ?? _uuid.v4(),
          input: selected['input'] is Map
              ? sellerMap(selected['input'])
              : retained?.input ??
                    {
                      'title':
                          [
                                currentCopy['name'],
                                currentCopy['number'],
                                currentCopy['setCode'],
                              ]
                              .whereType<String>()
                              .where((v) => v.isNotEmpty)
                              .join(' ')
                              .characters
                              .take(80)
                              .toString(),
                      'description': '',
                      'categoryId': '',
                      'priceCents': 0,
                      'locationKey': '',
                      'policies': {
                        'fulfillment': '',
                        'payment': '',
                        'return': '',
                      },
                      'aspects': <String, dynamic>{},
                      'condition': {
                        'conditionId': '',
                        'description': '',
                        'descriptors': <dynamic>[],
                      },
                    },
          revision: selected['revision'] as int? ?? 0,
          dirty: selected.isEmpty,
          pending: retained?.pending,
          pendingPhoto: retained?.pendingPhoto,
        ),
      );
    }
    for (final photo in sellerRows(draft['photos'])) {
      final id = photo['id'];
      final path = photo['path'];
      if (id is String && path is String) {
        api
            .photoPreview(path)
            .then((url) {
              if (!_disposed && url != null) {
                photoUrls[id] = url;
                _changed();
              }
            })
            .catchError((_) {});
      }
    }
    _changed();
  }

  Future<void> updateInput(Map<String, dynamic> patch) async {
    if (busy != null || local == null || !editable) return;
    final updated = local!.copyWith(
      input: {...local!.input, ...patch},
      dirty: true,
    );
    try {
      await _retain(updated);
    } catch (_) {
      error =
          'Could not retain local recovery. Keep this screen open and restore device storage before saving.';
    }
    _changed();
  }

  Future<void> save() => run('Saving draft', _save);
  Future<void> _save() async {
    final current = local;
    if (current == null || account['accountId'] is! String) {
      throw StateError('Connect your eBay seller account first.');
    }
    await _retain(current);
    final result = await api.call('save', {
      'draftId': current.draftId,
      'instanceId': current.instanceId,
      'accountId': account['accountId'],
      'revision': current.revision,
      'listing': current.input,
    });
    if (result['revision'] is! int) {
      throw StateError(EbaySellerService.uncertainMessage);
    }
    await _retain(
      current.copyWith(revision: result['revision'] as int, dirty: false),
    );
    await _refresh();
  }

  Future<void> loadMetadata() => run('Loading selling options', () async {
    if (copy['id'] is! String || account['accountId'] is! String) return;
    metadata = await api.call('metadata', {
      'instanceId': copy['id'],
      'accountId': account['accountId'],
    });
    final current = local;
    if (current != null) {
      final condition = sellerMap(current.input['condition']);
      final useDefaults =
          sellerRows(condition['descriptors']).isEmpty &&
          (condition['description'] ?? '') == '';
      await _retain(
        current.copyWith(
          input: {
            ...current.input,
            'categoryId': metadata['categoryId'],
            'condition': useDefaults
                ? sellerMap(metadata['suggestedCondition'])
                : condition,
          },
          dirty: true,
        ),
      );
    }
    _changed();
  });

  Future<void> uploadPhoto({
    required String filename,
    required Uint8List bytes,
    required String contentType,
  }) => run('Uploading your private copy photo', () async {
    if (local == null) return;
    if (bytes.isEmpty ||
        bytes.length > 16 * 1024 * 1024 ||
        !['image/jpeg', 'image/png'].contains(contentType)) {
      throw StateError('Choose a JPEG or PNG photo up to 16 MB.');
    }
    if (local!.dirty || draft.isEmpty) await _save();
    final current = local!;
    final digest = sha256.convert(bytes).toString();
    final pending =
        current.pendingPhoto ??
        {'id': _uuid.v4(), 'filename': filename, 'sha256': digest};
    if (pending['sha256'] != digest) {
      throw StateError(
        'Reselect ${pending['filename']} to finish the interrupted upload.',
      );
    }
    photoCache ??= await EbaySellerPhotoFiles.open(api.ownerId);
    await photoCache!.save(current.draftId, pending['id'] as String, bytes);
    await _retain(
      current.copyWith(pendingPhoto: {...pending, 'contentType': contentType}),
    );
    await _uploadPending(bytes, contentType);
  });

  Future<void> _uploadPending(Uint8List bytes, String contentType) async {
    final current = local!;
    final pending = current.pendingPhoto!;
    final photoId = pending['id'] as String;
    final registration = await api.call('photo', {
      'draftId': current.draftId,
      'photoId': photoId,
      'revision': current.revision,
    });
    final expectedPath = '${api.ownerId}/${current.draftId}/$photoId.jpg';
    if (registration['path'] != expectedPath ||
        registration['revision'] is! int) {
      throw StateError(EbaySellerService.uncertainMessage);
    }
    await _retain(current.copyWith(revision: registration['revision'] as int));
    await api.uploadPhoto(
      draftId: current.draftId,
      photoId: photoId,
      path: expectedPath,
      bytes: bytes,
      contentType: contentType,
    );
    await _retain(local!.copyWith(clearPhoto: true));
    await _refresh();
  }

  Future<void> retryPhotoUpload() => run('Finishing photo upload', () async {
    if (local?.pendingPhoto == null) return;
    photoCache ??= await EbaySellerPhotoFiles.open(api.ownerId);
    final pending = local!.pendingPhoto!;
    final bytes = await photoCache!.read(
      local!.draftId,
      pending['id'] as String,
    );
    if (sha256.convert(bytes).toString() != pending['sha256']) {
      throw StateError('Reselect the same photo to finish its upload.');
    }
    final png = bytes.length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50;
    await _uploadPending(bytes, png ? 'image/png' : 'image/jpeg');
  });

  Future<void> operate(
    String action, {
    bool confirmed = false,
    int? salePriceCents,
    Map<String, dynamic>? continuation,
  }) => run(
    action == 'prepare'
        ? 'Preparing your listing'
        : action == 'publish'
        ? 'Publishing on eBay'
        : 'Updating listing status',
    () async {
      if (local == null) return;
      if (action == 'prepare' && local!.dirty) await _save();
      final current = local!;
      var pending = continuation != null
          ? Map<String, dynamic>.from(continuation)
          : current.pending?['action'] == action
          ? Map<String, dynamic>.from(current.pending!)
          : {
              'action': action,
              'requestId': _uuid.v4(),
              'revision': current.revision,
              if (action == 'publish') 'reviewHash': draft['reviewHash'],
              if (action == 'record_sale') 'salePriceCents': salePriceCents,
            };
      if (action == 'prepare') {
        final previous = operations.where(
          (op) =>
              op['requestId'] == pending['requestId'] &&
              op['status'] == 'running',
        );
        if (previous.isNotEmpty) pending['operationId'] = previous.first['id'];
      }
      await _retain(local!.copyWith(pending: pending));
      for (var step = 0; step < 20; step++) {
        final result = await api.call(action, {
          ...pending,
          'draftId': current.draftId,
          'confirmed': confirmed,
        });
        if (action != 'prepare' ||
            result['continuationReady'] != true ||
            result['operationId'] is! String) {
          break;
        }
        pending = {...pending, 'operationId': result['operationId']};
        await _retain(local!.copyWith(pending: pending));
      }
      await _retain(local!.copyWith(clearPending: true));
      await _refresh();
    },
  );

  Future<void> startNewDraft() => run('Starting a new listing', () async {
    if (local == null ||
        copy['isArchived'] == true ||
        !['withdrawn', 'ended', 'abandoned'].contains(draft['state'])) {
      return;
    }
    final next = EbaySellerLocalDraft(
      ownerId: api.ownerId,
      instanceId: local!.instanceId,
      draftId: _uuid.v4(),
      input: local!.input,
    );
    await _retain(next);
    _selectedDraftId = null;
    draft = {};
    metadata = {};
    photoUrls.clear();
  });

  Future<void> removePhoto(String photoId) =>
      run('Removing listing photo', () async {
        if (local == null || !editable) return;
        if (local!.dirty) await _save();
        final result = await api.call('remove_photo', {
          'draftId': local!.draftId,
          'photoId': photoId,
          'revision': local!.revision,
        });
        if (result['revision'] is! int) {
          throw StateError(EbaySellerService.uncertainMessage);
        }
        await _retain(
          local!.copyWith(
            revision: result['revision'] as int,
            clearPhoto: local!.pendingPhoto?['id'] == photoId,
          ),
        );
        photoUrls.remove(photoId);
        await _refresh();
      });

  Future<Uri?> startLink() async {
    Uri? launch;
    await run('Connecting eBay', () async {
      final result = await api.call('link', {});
      final parsed = Uri.tryParse(result['launchUrl']?.toString() ?? '');
      if (parsed == null ||
          parsed.origin != 'https://grookaivault.com' ||
          parsed.path != '/api/ebay/seller/oauth/launch' ||
          parsed.userInfo.isNotEmpty ||
          parsed.hasFragment) {
        throw StateError('Could not confirm the eBay connection destination.');
      }
      launch = parsed;
    });
    return launch;
  }

  @override
  void dispose() {
    _disposed = true;
    api.dispose();
    super.dispose();
  }
}
