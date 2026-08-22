import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:share_plus/share_plus.dart';

import '../../widgets/grookai_objects/grookai_object.dart';

enum GrookaiObjectExportDestination {
  instagramFeed,
  story,
  ebayListing,
  saveImage;

  String get label {
    switch (this) {
      case GrookaiObjectExportDestination.instagramFeed:
        return 'Instagram Feed';
      case GrookaiObjectExportDestination.story:
        return 'Story';
      case GrookaiObjectExportDestination.ebayListing:
        return 'eBay Listing';
      case GrookaiObjectExportDestination.saveImage:
        return 'Save Image';
    }
  }

  String get slug {
    switch (this) {
      case GrookaiObjectExportDestination.instagramFeed:
        return 'instagram-feed';
      case GrookaiObjectExportDestination.story:
        return 'story';
      case GrookaiObjectExportDestination.ebayListing:
        return 'ebay-listing';
      case GrookaiObjectExportDestination.saveImage:
        return 'save-image';
    }
  }
}

class GrookaiObjectExportService {
  const GrookaiObjectExportService();

  static bool isDestinationAvailableFor(
    GrookaiObject object,
    GrookaiObjectExportDestination destination,
  ) {
    if (destination == GrookaiObjectExportDestination.ebayListing) {
      return object.type == 'sale' || object.type == 'lot';
    }
    return true;
  }

  static List<GrookaiObjectExportDestination> destinationsFor(
    GrookaiObject object,
  ) {
    return GrookaiObjectExportDestination.values
        .where((destination) => isDestinationAvailableFor(object, destination))
        .toList(growable: false);
  }

  static void validateDestination(
    GrookaiObject object,
    GrookaiObjectExportDestination destination,
  ) {
    if (!isDestinationAvailableFor(object, destination)) {
      throw ArgumentError.value(
        destination,
        'destination',
        '${destination.label} is not available for ${object.type} objects.',
      );
    }
  }

  Future<Uint8List> capturePng(
    GlobalKey repaintBoundaryKey, {
    double pixelRatio = 3,
  }) async {
    for (var frame = 0; frame < 2; frame += 1) {
      WidgetsBinding.instance.ensureVisualUpdate();
      await WidgetsBinding.instance.endOfFrame.timeout(
        const Duration(seconds: 2),
        onTimeout: () => throw StateError(
          'Grookai object export frame did not finish rendering.',
        ),
      );
    }
    final context = repaintBoundaryKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderRepaintBoundary) {
      throw StateError('Grookai object export boundary is not ready.');
    }
    if (renderObject.debugNeedsPaint) {
      throw StateError('Grookai object export boundary is not painted yet.');
    }

    final image = await renderObject.toImage(pixelRatio: pixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    if (data == null) {
      throw StateError('Grookai object export did not produce PNG data.');
    }
    return data.buffer.asUint8List();
  }

  Future<Uint8List> exportObjectPng({
    required GrookaiObject object,
    required GrookaiObjectExportDestination destination,
    required GlobalKey repaintBoundaryKey,
    double pixelRatio = 3,
  }) {
    validateDestination(object, destination);
    return capturePng(repaintBoundaryKey, pixelRatio: pixelRatio);
  }

  Future<ShareResult> sharePng({
    required Uint8List bytes,
    required String fileName,
    String? text,
    String? subject,
    Rect? sharePositionOrigin,
  }) {
    return sharePngs(
      bytes: [bytes],
      fileNames: [fileName],
      text: text,
      subject: subject,
      sharePositionOrigin: sharePositionOrigin,
    );
  }

  Future<ShareResult> sharePngs({
    required List<Uint8List> bytes,
    required List<String> fileNames,
    String? text,
    String? subject,
    Rect? sharePositionOrigin,
  }) {
    if (bytes.isEmpty || bytes.length != fileNames.length) {
      throw ArgumentError(
        'PNG bytes and file names must be non-empty and have equal lengths.',
      );
    }
    return SharePlus.instance.share(
      ShareParams(
        files: [
          for (var index = 0; index < bytes.length; index += 1)
            XFile.fromData(
              bytes[index],
              mimeType: 'image/png',
              name: fileNames[index],
            ),
        ],
        fileNameOverrides: fileNames,
        text: text,
        subject: subject,
        sharePositionOrigin: sharePositionOrigin,
      ),
    );
  }

  static Rect sharePositionOriginFor(BuildContext context) {
    final renderObject = context.findRenderObject();
    if (renderObject is RenderBox && renderObject.hasSize) {
      final origin = renderObject.localToGlobal(Offset.zero);
      final size = renderObject.size;
      if (size.width > 0 && size.height > 0) {
        return origin & size;
      }
    }

    final mediaSize = MediaQuery.sizeOf(context);
    return Rect.fromCenter(
      center: mediaSize.center(Offset.zero),
      width: 1,
      height: 1,
    );
  }

  static String fileNameFor({required String type, required String title}) {
    final slug = _slug(title);
    final typeSlug = _slug(type);
    return 'grookai-$typeSlug-${slug.isEmpty ? 'card' : slug}.png';
  }

  static String sidedFileNameFor({
    required String type,
    required String title,
    required String side,
  }) {
    final baseName = fileNameFor(type: type, title: title);
    final normalizedSide = _slug(side);
    final suffix = normalizedSide.isEmpty ? 'side' : normalizedSide;
    return baseName.replaceFirst(RegExp(r'\.png$'), '-$suffix.png');
  }

  static String _slug(String value) {
    final lower = value.trim().toLowerCase();
    final normalized = lower.replaceAll(RegExp(r'[^a-z0-9]+'), '-');
    return normalized.replaceAll(RegExp(r'^-+|-+$'), '');
  }
}
