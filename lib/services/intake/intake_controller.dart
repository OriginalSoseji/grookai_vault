import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../scanner_v5/scanner_v5_identity_service.dart';
import '../scanner_v5/scanner_v5_error_copy.dart';
import '../public/card_surface_pricing_service.dart';
import 'intake_models.dart';
import 'intake_service.dart';
import 'intake_draft_store.dart';

class IntakeController extends ChangeNotifier {
  IntakeController({
    required this.batch,
    required this.store,
    required this.service,
    ScannerV5IdentityService? scanner,
  }) : scanner = scanner ?? ScannerV5IdentityService();
  final IntakeBatch batch;
  final IntakeDraftStore store;
  final IntakeService service;
  final ScannerV5IdentityService scanner;
  Future<void> _writes = Future.value();
  bool _working = false, _closed = false, busy = false;
  Completer<void>? _idle;
  String? message;
  void _notify() {
    if (!_closed) notifyListeners();
  }

  Future<void> persist() {
    // Freeze the snapshot at enqueue time, before any later UI mutation.
    final snapshot = IntakeBatch.fromJson(batch.toJson());
    final write = _writes
        .catchError((Object _) {})
        .then((_) => store.save(snapshot));
    _writes = write;
    return write;
  }

  Future<void> changed() async {
    batch.allocationReviewed = false;
    await persist();
    _notify();
  }

  Future<void> capture(Uint8List bytes, {bool multiple = false}) async {
    if (batch.pendingCount >= 30 || batch.copyCount >= 500) {
      throw StateError('Review the queue before scanning more cards.');
    }
    if (batch.state == 'saved') {
      throw StateError('Start a new scan batch for more cards.');
    }
    final id = newIntakeId();
    final path = await store.image(batch.id, id, bytes);
    batch.jobs.add(
      IntakeCaptureJob(id: id, imagePath: path, multiple: multiple),
    );
    await changed();
    unawaited(process());
  }

  Future<void> resume() async {
    for (final job in batch.jobs) {
      if (job.state == 'processing') job.state = 'pending';
    }
    await persist();
    unawaited(process());
  }

  Future<void> process() async {
    if (_working) {
      await _idle!.future;
      return;
    }
    if (_closed) return;
    _working = true;
    _idle = Completer<void>();
    try {
      while (!_closed) {
        final pending = batch.jobs.where((j) => j.state == 'pending').toList();
        if (pending.isEmpty) break;
        final job = pending.first;
        job.state = 'processing';
        await persist();
        _notify();
        try {
          final bytes = await imageBytes(job.imagePath, job.remotePath);
          final results =
              <({Uint8List image, ScannerV5IdentifyResult result})>[];
          if (job.multiple) {
            final client = http.Client();
            try {
              final uri = Uri.parse(
                scanner.endpoint.replaceFirst(
                  RegExp(r'/identify$'),
                  '/identify-multiple',
                ),
              );
              final response = await client
                  .post(
                    uri,
                    headers: {'content-type': 'image/jpeg'},
                    body: bytes,
                  )
                  .timeout(const Duration(seconds: 90));
              if (response.statusCode != 200) {
                throw StateError(
                  'Multi-card scan unavailable (${response.statusCode}). Retry or use continuous scanning.',
                );
              }
              final data = jsonDecode(response.body) as Map;
              if (data['ok'] != true ||
                  data['regions'] is! List ||
                  (data['regions'] as List).length > 12 ||
                  response.bodyBytes.length > 16777216) {
                throw const FormatException('Invalid multi-card response');
              }
              for (final region in data['regions'] as List) {
                final result = ScannerV5IdentifyResult.fromJson(
                  Map<String, dynamic>.from(region['result'] as Map),
                );
                if (!result.ok ||
                    !{
                      'ocr_exact',
                      'fused',
                      'embedding_only',
                      'unreadable',
                    }.contains(result.mode) ||
                    ((result.mode == 'unreadable') !=
                        result.candidates.isEmpty) ||
                    result.candidates.any(
                      (c) =>
                          c.cardId == null ||
                          !RegExp(
                            r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                          ).hasMatch(c.cardId!),
                    )) {
                  throw const FormatException('Invalid multi-card match');
                }
                results.add((
                  image: base64Decode(region['image_base64'] as String),
                  result: result,
                ));
              }
              if (results.isEmpty) {
                throw StateError(
                  'No separated cards found. Use a clear, spaced photo or continuous scan.',
                );
              }
              message = data['review_hint'] as String?;
            } finally {
              client.close();
            }
          } else {
            results.add((image: bytes, result: await scanner.identify(bytes)));
          }
          final added = <IntakeItem>[];
          for (var n = 0; n < results.length; n++) {
            // Stable per-capture region IDs are persisted together with job done.
            final result = results[n];
            final id = newIntakeId();
            final path = job.multiple
                ? await store.image(batch.id, id, result.image)
                : job.imagePath;
            added.add(
              IntakeItem(
                id: id,
                captureId: job.id,
                imagePath: path,
                candidates: result.result.candidates,
                selected: result.result.candidates.isEmpty
                    ? null
                    : result.result.candidates.first,
              ),
            );
          }
          batch.items.removeWhere((i) => i.captureId == job.id && !i.isSaved);
          batch.items.addAll(added);
          job.state = 'done';
          job.error = null;
          await changed();
        } catch (error) {
          job.state = 'failed';
          job.error =
              '${scannerV5UserFacingError(error).message} Your photo is retained in this draft.';
          await persist();
          _notify();
        }
      }
    } catch (_) {
      message =
          'Draft storage could not be updated. Free device space and retry. Existing photos are retained.';
      for (final job in batch.jobs.where((j) => j.state == 'processing')) {
        job.state = 'failed';
        job.error = message;
      }
    } finally {
      _working = false;
      _idle!.complete();
      _notify();
    }
  }

  Future<Uint8List> imageBytes(String path, String? remote) async {
    final file = File(path);
    if (path.isNotEmpty && await file.exists()) {
      final root = (await store.directory.resolveSymbolicLinks()).replaceAll(
        '\\',
        '/',
      );
      final resolved = (await file.resolveSymbolicLinks()).replaceAll(
        '\\',
        '/',
      );
      final ownerRoot = Platform.isWindows ? root.toLowerCase() : root;
      final photoPath = Platform.isWindows ? resolved.toLowerCase() : resolved;
      if (photoPath.startsWith('$ownerRoot/')) {
        return File(resolved).readAsBytes();
      }
      // A cloud snapshot never grants access to arbitrary device files or to
      // another account's local drafts, even when a local path happens to exist.
    }
    if (remote == null) {
      throw StateError(
        'This photo has not synced. Resume on the original device or retake it.',
      );
    }
    return service.download(remote);
  }

  Future<void> retry(IntakeCaptureJob job) async {
    if (batch.items.any((i) => i.captureId == job.id && i.isSaved)) {
      throw StateError(
        'This capture already contains saved copies. Start a new capture to avoid duplicating them.',
      );
    }
    job.state = 'pending';
    job.error = null;
    await persist();
    unawaited(process());
  }

  Future<void> reference(IntakeItem item) async {
    if (item.selected == null) return;
    final selectedId = item.selected!.cardId!;
    final printingId = item.cardPrintingId;
    item.referenceValueCents = null;
    item.referenceSource = null;
    item.referenceAt = null;
    // The published feed is USD. Other currencies require explicit manual values.
    if (batch.currency != 'USD') {
      await changed();
      return;
    }
    final values = item.cardPrintingId == null
        ? await CardSurfacePricingService.fetchByCardPrintIds(
            client: service.client,
            cardPrintIds: [selectedId],
          )
        : await CardSurfacePricingService.fetchByCardPrintingIds(
            client: service.client,
            cardPrintingIds: [printingId!],
          );
    if (item.selected?.cardId != selectedId ||
        item.cardPrintingId != printingId) {
      return;
    }
    final price = values[printingId ?? selectedId];
    if (price?.visibleValue != null) {
      item.referenceValueCents = (price!.visibleValue! * 100).round();
      item.referenceSource = price.compactLabel;
      item.referenceAt = price.observedAt;
    }
    await changed();
  }

  Future<void> sync() async {
    if (service.userId != batch.userId) {
      throw StateError('Sign in as the draft owner.');
    }
    for (final job in batch.jobs) {
      if (job.remotePath == null) {
        final remote = '${batch.userId}/${batch.id}/${job.id}.jpg';
        await service.upload(remote, await imageBytes(job.imagePath, null));
        job.remotePath = remote;
      }
    }
    for (final item in batch.items.where(
      (i) => i.remotePath == null && i.imagePath.isNotEmpty,
    )) {
      final job = batch.jobs
          .where((j) => j.id == item.captureId && j.imagePath == item.imagePath)
          .firstOrNull;
      if (job != null) {
        item.remotePath = job.remotePath;
      } else {
        final remote = '${batch.userId}/${batch.id}/${item.id}.jpg';
        await service.upload(remote, await imageBytes(item.imagePath, null));
        item.remotePath = remote;
      }
    }
    final response = await service.saveBatch(batch);
    batch.revision = (response['revision'] as num).toInt();
    batch.state = response['state'] as String;
    await persist();
  }

  void reconcile(Map<String, dynamic> response) {
    final row = Map<String, dynamic>.from(
      response['batch'] as Map? ?? response,
    );
    batch.revision = (row['revision'] as num).toInt();
    batch.state = row['state'] as String;
    for (final saved in response['saved_items'] as List? ?? []) {
      final item = batch.items
          .where((i) => i.id == saved['item_id'])
          .firstOrNull;
      if (item != null) {
        item.savedInstanceIds = List<String>.from(saved['instance_ids']);
        item.state = 'saved';
      }
    }
  }

  Future<void> saveToVault() async {
    if (busy) return;
    if (batch.pendingCount > 0) {
      throw StateError('Wait for queued scans to finish.');
    }
    if (!batch.allocationReviewed) {
      throw StateError('Review intake costs before saving.');
    }
    busy = true;
    _notify();
    try {
      // Recovery first: a previous response may have been lost after committing.
      if (batch.revision > 0) {
        final remote = await service.getBatch(batch.id);
        final remoteSnapshot = Map<String, dynamic>.from(
          remote['snapshot'] as Map? ?? {},
        )..remove('revision');
        final localSnapshot = batch.toJson()..remove('revision');
        if (remote['revision'] != batch.revision &&
            remote['state'] != 'saved' &&
            !intakeJsonEqual(remoteSnapshot, localSnapshot)) {
          throw StateError(
            'This cloud draft has a newer revision. Your local draft is retained. Open its cloud version from Batch intake before continuing.',
          );
        }
        reconcile(remote);
      }
      if (batch.state != 'saved') {
        await sync();
        reconcile(await service.commit(batch));
      }
      await persist();
      message = 'Saved to Vault. Every copy has its own intake history.';
    } catch (error) {
      message = 'Save incomplete. Your draft is retained. $error';
      rethrow;
    } finally {
      busy = false;
      _notify();
    }
  }

  @override
  void dispose() {
    _closed = true;
    scanner.dispose();
    super.dispose();
  }
}
