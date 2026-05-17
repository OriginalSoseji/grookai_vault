import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

enum ScannerV3ExportImageFormat { grayscale8, rgba8888 }

class ScannerV3ExportImage {
  const ScannerV3ExportImage({
    required this.bytes,
    required this.width,
    required this.height,
    this.format = ScannerV3ExportImageFormat.grayscale8,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final ScannerV3ExportImageFormat format;
}

class ScannerV3LockArtifactExportResult {
  const ScannerV3LockArtifactExportResult({
    required this.success,
    this.outputDirectory,
    this.error,
  });

  final bool success;
  final String? outputDirectory;
  final Object? error;
}

Future<ScannerV3LockArtifactExportResult> exportLockArtifacts({
  required ScannerV3ExportImage rawFrameGray,
  required ScannerV3ExportImage normalizedFullCardGray,
  required ScannerV3ExportImage artworkRegionGray,
  required ScannerV3ExportImage bottomBandGray,
  ScannerV3ExportImage? normalizedFullCardColor,
  ScannerV3ExportImage? artworkRegionColor,
  ScannerV3ExportImage? bottomBandColor,
  Map<String, ScannerV3ExportImage>? debugArtifacts,
  required Map<String, Object?> metrics,
}) async {
  try {
    final timestamp =
        metrics['timestamp']?.toString() ??
        DateTime.now().toUtc().toIso8601String();
    final baseDir = await _resolveWritableBaseDirectory();
    final lockDir = Directory(
      _joinPath(baseDir.path, 'lock_${_safeTimestamp(timestamp)}'),
    );
    await lockDir.create(recursive: true);

    // Flutter exposes a built-in PNG encoder but no built-in JPEG encoder.
    // Use explicit PNG names so diagnostic artifacts match their encoding.
    final grayscaleArtifactPaths = <String, String>{};
    final colorArtifactPaths = <String, String>{};
    final debugArtifactPaths = <String, String>{};

    Future<void> writeArtifact(
      String filename,
      ScannerV3ExportImage image,
      Map<String, String> paths,
    ) async {
      final path = _joinPath(lockDir.path, filename);
      await File(path).writeAsBytes(await _encodePng(image), flush: true);
      paths[filename] = path;
    }

    await writeArtifact(
      'raw_frame_gray.png',
      rawFrameGray,
      grayscaleArtifactPaths,
    );
    await writeArtifact(
      'normalized_full_card_gray.png',
      normalizedFullCardGray,
      grayscaleArtifactPaths,
    );
    await writeArtifact(
      'artwork_region_gray.png',
      artworkRegionGray,
      grayscaleArtifactPaths,
    );
    await writeArtifact(
      'bottom_band_gray.png',
      bottomBandGray,
      grayscaleArtifactPaths,
    );

    if (normalizedFullCardColor != null &&
        artworkRegionColor != null &&
        bottomBandColor != null) {
      await writeArtifact(
        'normalized_full_card_color.png',
        normalizedFullCardColor,
        colorArtifactPaths,
      );
      await writeArtifact(
        'artwork_region_color.png',
        artworkRegionColor,
        colorArtifactPaths,
      );
      await writeArtifact(
        'bottom_band_color.png',
        bottomBandColor,
        colorArtifactPaths,
      );
    }

    for (final entry in (debugArtifacts ?? {}).entries) {
      await writeArtifact(entry.key, entry.value, debugArtifactPaths);
    }

    final exportMetrics = <String, Object?>{
      ...metrics,
      'artifact_encoding': 'png',
      'artifact_output_dir': lockDir.path,
      'grayscale_artifact_paths': grayscaleArtifactPaths,
      'color_artifact_paths': colorArtifactPaths,
      'debug_artifact_paths': debugArtifactPaths,
    };
    await File(_joinPath(lockDir.path, 'metrics.json')).writeAsString(
      const JsonEncoder.withIndent('  ').convert(exportMetrics),
      flush: true,
    );

    return ScannerV3LockArtifactExportResult(
      success: true,
      outputDirectory: lockDir.path,
    );
  } catch (error) {
    return ScannerV3LockArtifactExportResult(success: false, error: error);
  }
}

Future<Directory> _resolveWritableBaseDirectory() async {
  final candidates = <String>[
    '/storage/emulated/0/Download/grookai_scanner_v3',
    '/storage/emulated/0/Android/data/com.example.grookai_vault/files/grookai_scanner_v3',
    '/data/user/0/com.example.grookai_vault/files/grookai_scanner_v3',
    _joinPath(Directory.systemTemp.path, 'grookai_scanner_v3'),
  ];

  Object? lastError;
  for (final candidate in candidates) {
    try {
      final directory = Directory(candidate);
      await directory.create(recursive: true);
      final writeProbe = File(_joinPath(directory.path, '.write_test'));
      await writeProbe.writeAsString('ok', flush: true);
      await writeProbe.delete();
      return directory;
    } catch (error) {
      lastError = error;
    }
  }

  throw StateError(
    'No writable Scanner V3 artifact export directory. Last error: $lastError',
  );
}

Future<Uint8List> _encodePng(ScannerV3ExportImage image) async {
  if (image.width <= 0 || image.height <= 0) {
    throw ArgumentError('Image dimensions must be positive');
  }
  final pixelCount = image.width * image.height;
  final expectedBytes = switch (image.format) {
    ScannerV3ExportImageFormat.grayscale8 => pixelCount,
    ScannerV3ExportImageFormat.rgba8888 => pixelCount * 4,
  };
  if (image.bytes.length < expectedBytes) {
    throw ArgumentError('Image byte length is smaller than expected');
  }

  final rgba = switch (image.format) {
    ScannerV3ExportImageFormat.grayscale8 => _grayscaleToRgba(
      image,
      pixelCount,
    ),
    ScannerV3ExportImageFormat.rgba8888 =>
      image.bytes.length == expectedBytes
          ? image.bytes
          : Uint8List.sublistView(image.bytes, 0, expectedBytes),
  };

  final completer = Completer<ui.Image>();
  ui.decodeImageFromPixels(
    rgba,
    image.width,
    image.height,
    ui.PixelFormat.rgba8888,
    completer.complete,
  );
  final decoded = await completer.future;
  final pngBytes = await decoded.toByteData(format: ui.ImageByteFormat.png);
  decoded.dispose();
  if (pngBytes == null) {
    throw StateError('Failed to encode Scanner V3 artifact image');
  }
  return pngBytes.buffer.asUint8List(
    pngBytes.offsetInBytes,
    pngBytes.lengthInBytes,
  );
}

Uint8List _grayscaleToRgba(ScannerV3ExportImage image, int pixelCount) {
  final rgba = Uint8List(pixelCount * 4);
  for (var i = 0; i < pixelCount; i += 1) {
    final value = image.bytes[i];
    final base = i * 4;
    rgba[base] = value;
    rgba[base + 1] = value;
    rgba[base + 2] = value;
    rgba[base + 3] = 255;
  }
  return rgba;
}

String _safeTimestamp(String timestamp) {
  return timestamp.replaceAll(RegExp(r'[^0-9A-Za-z_-]+'), '_');
}

String _joinPath(String left, String right) {
  if (left.endsWith('/') || left.endsWith(r'\')) {
    return '$left$right';
  }
  return '$left${Platform.pathSeparator}$right';
}
