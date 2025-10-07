import "package:flutter/widgets.dart";
import "package:grookai_vault/widgets/smart_card_image.dart";

class CardImageFill extends StatelessWidget {
  const CardImageFill.network(
    this.url, {
    super.key,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  final String url;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final w = c.maxWidth.isFinite ? c.maxWidth : null;
      final h = c.maxHeight.isFinite ? c.maxHeight : null;
      Widget child = SmartCardImage.network(url, width: w, height: h, fit: fit);
      if (borderRadius != null) child = ClipRRect(borderRadius: borderRadius!, child: child);
      return SizedBox(width: w, height: h, child: child);
    });
  }
}
