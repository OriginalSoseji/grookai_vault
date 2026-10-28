import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'intake_models.dart';

/// Owner-scoped files; atomic replacement ensures a killed process cannot leave
/// half a draft. Images are copied before the camera's temporary file is released.
class IntakeDraftStore {
  IntakeDraftStore(this.directory);
  final Directory directory;
  void _checkId(String id) {
    if (!RegExp(r'^[a-zA-Z0-9-]{1,80}$').hasMatch(id)) {
      throw ArgumentError('Invalid draft file identifier');
    }
  }

  static Future<IntakeDraftStore> open(String userId) async {
    if (!RegExp(r'^[a-zA-Z0-9-]+$').hasMatch(userId)) {
      throw ArgumentError('Invalid owner');
    }
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}/intake/$userId');
    await dir.create(recursive: true);
    return IntakeDraftStore(dir);
  }

  Future<String> image(String batchId, String imageId, Uint8List bytes) async {
    _checkId(batchId);
    _checkId(imageId);
    final dir = Directory('${directory.path}/$batchId');
    await dir.create(recursive: true);
    final file = File('${dir.path}/$imageId.jpg');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  Future<void> save(IntakeBatch batch) async {
    _checkId(batch.id);
    await directory.create(recursive: true);
    final file = File('${directory.path}/${batch.id}.json');
    final temp = File('${file.path}.tmp');
    await temp.writeAsString(jsonEncode(batch.toJson()), flush: true);
    // File.rename replaces the existing file atomically on supported platforms.
    await temp.rename(file.path);
  }

  Future<void> preserveRecovery(String id) async {
    _checkId(id);
    final file = File('${directory.path}/$id.json');
    if (await file.exists()) {
      await file.copy(
        '${file.path}.${DateTime.now().microsecondsSinceEpoch}.recovery',
      );
    }
  }

  Future<List<IntakeBatch>> list() async {
    if (!await directory.exists()) return [];
    final drafts = <IntakeBatch>[];
    await for (final entity in directory.list()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      try {
        drafts.add(
          IntakeBatch.fromJson(
            Map<String, dynamic>.from(
              jsonDecode(await entity.readAsString()) as Map,
            ),
          ),
        );
      } catch (_) {
        /* Leave corrupt files for recovery, never delete. */
      }
    }
    drafts.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return drafts;
  }
}
