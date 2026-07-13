import 'package:flutter/material.dart';

import 'grookai_object_skin.dart';

class GrookaiObjectSkinPicker extends StatelessWidget {
  const GrookaiObjectSkinPicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final GrookaiObjectSkin selected;
  final ValueChanged<GrookaiObjectSkin> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<GrookaiObjectSkin>(
      showSelectedIcon: false,
      segments: [
        for (final skin in GrookaiObjectSkin.values)
          ButtonSegment<GrookaiObjectSkin>(
            value: skin,
            label: Text(_label(skin)),
            icon: _SkinSwatch(skin: skin),
          ),
      ],
      selected: {selected},
      onSelectionChanged: (selection) => onChanged(selection.single),
    );
  }

  String _label(GrookaiObjectSkin skin) {
    return switch (skin) {
      GrookaiObjectSkin.onyx => 'Onyx',
      GrookaiObjectSkin.ivory => 'Ivory',
      GrookaiObjectSkin.kraft => 'Kraft',
    };
  }
}

class _SkinSwatch extends StatelessWidget {
  const _SkinSwatch({required this.skin});

  final GrookaiObjectSkin skin;

  @override
  Widget build(BuildContext context) {
    final tokens = grookaiObjectTokens[skin]!;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: tokens.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tokens.borderColor),
      ),
      child: SizedBox.square(
        dimension: 14,
        child: Center(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: tokens.accent,
              shape: BoxShape.circle,
            ),
            child: const SizedBox.square(dimension: 5),
          ),
        ),
      ),
    );
  }
}
