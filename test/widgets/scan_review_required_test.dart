import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/widgets/scan_review_sheet.dart';
import 'package:grookai_vault/data/scans/scan_draft.dart';
import 'dart:ui' as ui;

Future<ui.Image> _makeImage() async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  canvas.drawRect(const Rect.fromLTWH(0, 0, 10, 10), Paint()..color = const Color(0xFF0000FF));
  final pic = recorder.endRecording();
  return pic.toImage(10, 10);
}

void main() {
  testWidgets('requires explicit confirm to save', (tester) async {
    final img = await _makeImage();
    final out = const _FakeOut();
    final draft = ScanDraft(image: img, out: out as dynamic, createdAt: DateTime.now());
    var confirmed = false;
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      return Scaffold(
        body: Center(
          child: TextButton(
            onPressed: () => showModalBottomSheet(
              context: context,
              builder: (_) => ScanReviewSheet(
                draft: draft,
                onConfirm: () async { confirmed = true; },
                onReject: () {},
              ),
            ),
            child: const Text('Open'),
          ),
        ),
      );
    })));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(confirmed, false);
    await tester.tap(find.text('Add to Vault'));
    await tester.pumpAndSettle();
    expect(confirmed, true);
  });
}

class _FakeOut {
  final String? setId = 'SV2';
  final int? cardNo = 49;
  final int? setSize = 203;
  final int? year = 2021;
  final _FakeVariant variant = const _FakeVariant();
  final dynamic condition = null;
  const _FakeOut();
}

class _FakeVariant {
  final String variantTag = 'NONE';
  final bool hasOverlay = false;
  final double? stampConfidence = 0.1;
  const _FakeVariant();
}
