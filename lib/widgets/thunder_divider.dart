import 'package:flutter/material.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';

class ThunderDivider extends StatelessWidget {
  final double height;
  const ThunderDivider({super.key, this.height = 1});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Thunder.accent.withOpacity(0.35),
            Thunder.accent.withOpacity(0.0),
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
    );
  }
}

