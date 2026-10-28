import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_controller.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_photo_cache.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_service.dart';

const owner = 'ef000000-0000-4000-8000-000000000001';
const instance = 'ef000000-0000-4000-8000-000000000002';
const accountId = 'ef000000-0000-4000-8000-000000000003';
const operationId = 'ef000000-0000-4000-8000-000000000004';
Map<String, dynamic> cloned(Map<String, dynamic> value) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(value)) as Map);

class _Backend {
  Map<String, dynamic> saved = {};
  final calls = <Map<String, dynamic>>[];
  final uploads = <String>[];
  bool loseSave = false, losePreparation = false, loseUpload = false;
  int created = 0, preparations = 0;
}

class _Api implements EbaySellerApi {
  _Api(this.backend);
  final _Backend backend;
  @override
  String get ownerId => owner;
  @override
  Future<Map<String, dynamic>> workspace({String? instanceId}) async => {
    'account': {
      'accountId': accountId,
      'linked': true,
      'preparationEnabled': true,
    },
    'copy': {
      'id': instance,
      'name': 'Eevee',
      'number': '173',
      'setCode': 'PR-SV',
      'isGraded': false,
    },
    'drafts': backend.saved.isEmpty ? [] : [cloned(backend.saved)],
  };
  @override
  Future<Map<String, dynamic>> draft(String draftId) async =>
      cloned(backend.saved);
  @override
  Future<String?> photoPreview(String path) async => null;
  @override
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> payload,
  ) async {
    backend.calls.add(cloned({...payload, 'action': action}));
    if (action == 'save') {
      if (backend.saved.isEmpty) backend.created++;
      backend.saved = {
        ...backend.saved,
        'id': payload['draftId'],
        'instanceId': instance,
        'accountId': accountId,
        'revision': 1,
        'state': 'editing',
        'input': cloned(payload['listing'] as Map<String, dynamic>),
        'operations': [],
        'photos': backend.saved['photos'] ?? [],
      };
      if (backend.loseSave) {
        backend.loseSave = false;
        throw StateError(EbaySellerService.uncertainMessage);
      }
      return {'revision': 1, 'state': 'editing'};
    }
    if (action == 'prepare') {
      backend.preparations++;
      backend.saved['state'] = 'preparing';
      backend.saved['operations'] = [
        {
          'id': operationId,
          'requestId': payload['requestId'],
          'kind': 'prepare',
          'status': 'running',
          'continuationReady': true,
          'expectedRevision': 1,
        },
      ];
      if (backend.preparations == 1) {
        return {
          'operationId': operationId,
          'status': 'running',
          'continuationReady': true,
        };
      }
      if (backend.losePreparation) {
        backend.losePreparation = false;
        throw StateError(EbaySellerService.uncertainMessage);
      }
      backend.saved['state'] = 'prepared';
      backend.saved['operations'] = [];
      return {'operationId': operationId, 'status': 'succeeded'};
    }
    if (action == 'photo') {
      backend.saved['revision'] = 2;
      backend.saved['photos'] = [
        {
          'id': payload['photoId'],
          'state': 'awaiting_upload',
          'path': '$owner/${payload['draftId']}/${payload['photoId']}.jpg',
        },
      ];
      return {
        'revision': 2,
        'path': '$owner/${payload['draftId']}/${payload['photoId']}.jpg',
      };
    }
    if (action == 'remove_photo') {
      (backend.saved['photos'] as List).removeWhere(
        (p) => p['id'] == payload['photoId'],
      );
      backend.saved['revision'] = 3;
      return {'revision': 3, 'recovered': false};
    }
    throw StateError('Unsupported synthetic fixture action');
  }

  @override
  Future<void> uploadPhoto({
    required String draftId,
    required String photoId,
    required String path,
    required Uint8List bytes,
    required String contentType,
  }) async {
    backend.uploads.add(path);
    if (backend.loseUpload) {
      backend.loseUpload = false;
      throw StateError('Photo upload unconfirmed');
    }
    (backend.saved['photos'] as List).first['state'] = 'ready';
  }

  @override
  void dispose() {}
}

class _Photos implements EbaySellerPhotoCache {
  final files = <String, Uint8List>{};
  @override
  Future<void> save(String draftId, String photoId, Uint8List bytes) async {
    files['$draftId/$photoId'] = Uint8List.fromList(bytes);
  }

  @override
  Future<Uint8List> read(String draftId, String photoId) async =>
      files['$draftId/$photoId']!;
}

EbaySellerController _controllerFor(_Backend backend, {_Photos? photos}) =>
    EbaySellerController(
      api: _Api(backend),
      initialInstanceId: instance,
      photoCache: photos,
    );

void main() {
  test(
    'removing an interrupted upload clears its recovery entry only after acknowledgement',
    () async {
      SharedPreferences.setMockInitialValues({});
      final backend = _Backend()..loseUpload = true;
      final model = _controllerFor(backend, photos: _Photos());
      addTearDown(model.dispose);
      await model.refresh();
      await model.uploadPhoto(
        filename: 'my-copy.jpg',
        bytes: Uint8List.fromList([0xff, 0xd8, 0xff, 1, 2]),
        contentType: 'image/jpeg',
      );
      final photoId = model.local!.pendingPhoto!['id'] as String;
      await model.removePhoto(photoId);
      expect(model.error, isNull);
      expect(model.local!.pendingPhoto, isNull);
      expect(model.draft['photos'], isEmpty);
      expect(backend.calls.last['photoId'], photoId);
      expect(backend.calls.last['revision'], 2);
    },
  );
  test(
    'a discarded draft can start fresh and retain its new ID through restart',
    () async {
      SharedPreferences.setMockInitialValues({});
      final backend = _Backend();
      final first = _controllerFor(backend);
      await first.refresh();
      await first.save();
      final oldId = first.local!.draftId;
      backend.saved['state'] = 'abandoned';
      await first.refresh();
      await first.startNewDraft();
      final newId = first.local!.draftId;
      expect(newId, isNot(oldId));
      expect(first.local!.revision, 0);
      expect(first.draft, isEmpty);
      first.dispose();
      final second = _controllerFor(backend);
      addTearDown(second.dispose);
      await second.refresh();
      expect(second.local!.draftId, newId);
      expect(second.draft, isEmpty);
      expect(
        backend.created,
        1,
        reason: 'Starting fresh saves locally before any explicit server save.',
      );
    },
  );
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'a committed save with a lost acknowledgement keeps the same draft through cold recovery',
    () async {
      final backend = _Backend()..loseSave = true;
      final first = _controllerFor(backend);
      await first.refresh();
      await first.updateInput({
        'description': 'Owner retained description',
        'priceCents': 1234,
      });
      final draftId = first.local!.draftId;
      await first.save();
      expect(first.error, EbaySellerService.uncertainMessage);
      expect(backend.created, 1);
      first.dispose();
      final second = _controllerFor(backend);
      addTearDown(second.dispose);
      await second.refresh();
      expect(second.local!.draftId, draftId);
      expect(second.local!.input['description'], 'Owner retained description');
      await second.save();
      expect(second.error, isNull);
      expect(backend.created, 1);
      expect(
        backend.calls
            .where((c) => c['action'] == 'save')
            .map((c) => c['draftId'])
            .toSet(),
        {draftId},
      );
    },
  );
  test(
    'preparation resumes only an acknowledged durable handoff after a cold restart',
    () async {
      final backend = _Backend()..losePreparation = true;
      final first = _controllerFor(backend);
      await first.refresh();
      await first.save();
      await first.operate('prepare');
      expect(first.error, EbaySellerService.uncertainMessage);
      final requestId = first.local!.pending!['requestId'];
      expect(first.local!.pending!['operationId'], operationId);
      expect(backend.preparations, 2);
      first.dispose();
      final second = _controllerFor(backend);
      addTearDown(second.dispose);
      await second.refresh();
      expect(
        backend.preparations,
        2,
        reason: 'Refresh does not replay a provider operation.',
      );
      await second.operate('prepare');
      expect(second.error, isNull);
      expect(second.draft['state'], 'prepared');
      final attempts = backend.calls
          .where((c) => c['action'] == 'prepare')
          .toList();
      expect(attempts.map((c) => c['requestId']).toSet(), {requestId});
      expect(attempts.last['operationId'], operationId);
      expect(second.local!.pending, isNull);
    },
  );
  test(
    'private photo retry survives restart with the same registered ID and retained bytes',
    () async {
      final backend = _Backend()..loseUpload = true;
      final photos = _Photos();
      final first = _controllerFor(backend, photos: photos);
      await first.refresh();
      await first.uploadPhoto(
        filename: 'physical-copy.jpg',
        bytes: Uint8List.fromList([0xff, 0xd8, 0xff, 1, 2]),
        contentType: 'image/jpeg',
      );
      expect(first.error, 'Photo upload unconfirmed');
      final photoId = first.local!.pendingPhoto!['id'];
      first.dispose();
      final second = _controllerFor(backend, photos: photos);
      addTearDown(second.dispose);
      await second.refresh();
      expect(second.local!.pendingPhoto!['id'], photoId);
      await second.retryPhotoUpload();
      expect(second.error, isNull);
      expect(second.local!.pendingPhoto, isNull);
      expect(backend.uploads.length, 2);
      expect(backend.uploads.toSet().length, 1);
      expect(
        backend.calls
            .where((c) => c['action'] == 'photo')
            .map((c) => c['photoId'])
            .toSet(),
        {photoId},
      );
    },
  );
}
