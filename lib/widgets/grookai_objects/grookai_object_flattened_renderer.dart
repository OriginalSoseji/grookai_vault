import 'package:flutter/material.dart';

import 'grookai_object_frame.dart';
import 'grookai_object.dart';
import 'grookai_object_renderer.dart';

class GrookaiObjectFlattenedRenderer extends StatelessWidget {
  const GrookaiObjectFlattenedRenderer({
    super.key,
    required this.repaintBoundaryKey,
    required this.object,
    required this.showFront,
    this.onPrimaryAction,
  });

  final GlobalKey repaintBoundaryKey;
  final GrookaiObject object;
  final bool showFront;
  final VoidCallback? onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: repaintBoundaryKey,
      child: SizedBox(
        width: GrookaiObjectFrame.width,
        height: GrookaiObjectFrame.height,
        child: GrookaiObjectRenderer(
          object: object,
          showFront: showFront,
          onPrimaryAction: onPrimaryAction,
        ),
      ),
    );
  }
}
