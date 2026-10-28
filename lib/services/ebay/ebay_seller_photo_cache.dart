import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

abstract interface class EbaySellerPhotoCache {
  Future<void> save(String draftId, String photoId, Uint8List bytes);
  Future<Uint8List> read(String draftId, String photoId);
}

class EbaySellerPhotoFiles implements EbaySellerPhotoCache {
  EbaySellerPhotoFiles(this.directory);
  final Directory directory;
  static final _uuid = RegExp(r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$');

  static Future<EbaySellerPhotoFiles> open(String ownerId) async {
    if (!_uuid.hasMatch(ownerId)) throw ArgumentError('Invalid photo owner');
    final base = await getApplicationSupportDirectory();
    final directory = Directory('${base.path}/seller-listing-photos/$ownerId');
    await directory.create(recursive: true);
    return EbaySellerPhotoFiles(directory);
  }

  File _file(String draftId, String photoId) {
    if (!_uuid.hasMatch(draftId) || !_uuid.hasMatch(photoId)) {
      throw ArgumentError('Invalid photo identity');
    }
    return File('${directory.path}/$draftId/$photoId.jpg');
  }

  @override
  Future<void> save(String draftId, String photoId, Uint8List bytes) async {
    if (bytes.isEmpty || bytes.length > 16 * 1024 * 1024) {
      throw StateError('Choose a photo up to 16 MB.');
    }
    final file = _file(draftId, photoId);
    await file.parent.create(recursive: true);
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsBytes(bytes, flush: true);
    await temporary.rename(file.path);
  }

  @override
  Future<Uint8List> read(String draftId, String photoId) async {
    final file = _file(draftId, photoId);
    if (!await file.exists() || await file.length() > 16 * 1024 * 1024) {
      throw StateError(
        'Reselect the same photo to finish its interrupted upload.',
      );
    }
    return file.readAsBytes();
  }
}
