import 'package:flutter/material.dart';
import 'grookai_object.dart';
import 'grookai_object_layout_registry.dart';

/// The single entry point every publish/share/post surface renders through
/// — Memory, Sale, Lot, and any future object type. Takes the generic
/// [GrookaiObject] and looks up its layout in the registry; has NO
/// per-type branching of its own. This is the piece meant to become shared
/// infrastructure — new object types are additive at the registry, not here.
class GrookaiObjectRenderer extends StatelessWidget {
  final GrookaiObject object;
  final bool showFront;

  /// Wired to whatever the object's CTA does (e.g. "Message to Buy" for
  /// sale/lot). Layouts with no CTA (memory) ignore it.
  final VoidCallback? onPrimaryAction;

  const GrookaiObjectRenderer({
    super.key,
    required this.object,
    required this.showFront,
    this.onPrimaryAction,
  });

  @override
  Widget build(BuildContext context) {
    final layout = grookaiObjectLayouts[object.layout];
    if (layout == null) {
      // Forward-compat guard: an object stamped with a layout id this
      // build doesn't know yet (shipped from a newer app version, or an
      // AI-authored future object type not yet registered here) degrades
      // to a placeholder instead of crashing.
      return _UnknownLayoutPlaceholder(layout: object.layout);
    }
    final builder = showFront ? layout.front : layout.back;
    return builder(
      object.skin,
      object.fields,
      onPrimaryAction: onPrimaryAction,
    );
  }
}

class _UnknownLayoutPlaceholder extends StatelessWidget {
  final String layout;
  const _UnknownLayoutPlaceholder({required this.layout});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 400,
      height: 560,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.black12,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        'Unsupported card layout: $layout',
        textAlign: TextAlign.center,
      ),
    );
  }
}
