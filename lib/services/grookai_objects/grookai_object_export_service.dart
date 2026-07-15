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
    WidgetsBinding.instance.ensureVisualUpdate();
    await WidgetsBinding.instance.endOfFrame.timeout(
      const Duration(milliseconds: 250),
      onTimeout: () {},
    );
    final context = repaintBoundaryKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderRepaintBoundary) {
      throw StateError('Grookai object export boundary is not ready.');
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
  }) {
    return SharePlus.instance.share(
      ShareParams(
        files: [XFile.fromData(bytes, mimeType: 'image/png', name: fileName)],
        fileNameOverrides: [fileName],
        text: text,
        subject: subject,
      ),
    );
  }

  static String fileNameFor({required String type, required String title}) {
    final slug = _slug(title);
    final typeSlug = _slug(type);
    return 'grookai-$typeSlug-${slug.isEmpty ? 'card' : slug}.png';
  }

  static String _slug(String value) {
    final lower = value.trim().toLowerCase();
    final normalized = lower.replaceAll(RegExp(r'[^a-z0-9]+'), '-');
    return normalized.replaceAll(RegExp(r'^-+|-+$'), '');
  }
}
