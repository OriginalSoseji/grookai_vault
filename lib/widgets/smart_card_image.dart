import 'package:flutter/widgets.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:grookai_vault/widgets/fix_card_image.dart';

/// A drop-in image widget:
/// - If [url] is a tcgdex URL, it extracts (setCode, number) and uses FixCardImage (multi-source fallback + cache)
/// - Otherwise it uses CachedNetworkImage (cache) with optional placeholder/error
class SmartCardImage extends StatelessWidget {
  const SmartCardImage._({
    this.setCode,
    this.number,
    this.url,
    this.width,
    this.height,
    this.fit,
    this.borderRadius,
    this.tcgDexBuilder,
    this.logFailures = true,
    this.placeholder,
    this.errorBuilder,
  });

  /// Factory for URL-based images. Accepts optional [placeholder] and [errorBuilder]
  /// similar to Image.network to be compatible with prior usage.
  factory SmartCardImage.network(
    String url, {
    double? width,
    double? height,
    BoxFit? fit,
    BorderRadius? borderRadius,
    TcgdexUrlBuilder? tcgDexBuilder,
    bool logFailures = true,
    WidgetBuilder? placeholder, // placeholder-only builder (context) => widget
    Widget Function(BuildContext context, Object error, StackTrace?)? errorBuilder,
  }) {
    final parsed = _parseTcgdex(url);
    if (parsed != null) {
      return SmartCardImage._(
        setCode: parsed.$1,
        number: parsed.$2,
        width: width,
        height: height,
        fit: fit,
        borderRadius: borderRadius,
        tcgDexBuilder: tcgDexBuilder,
        logFailures: logFailures,
        placeholder: placeholder,
        errorBuilder: errorBuilder,
      );
    }
    return SmartCardImage._(
      url: url,
      width: width,
      height: height,
      fit: fit,
      borderRadius: borderRadius,
      logFailures: logFailures,
      placeholder: placeholder,
      errorBuilder: errorBuilder,
    );
  }

  final String? setCode;
  final String? number;
  final String? url;
  final double? width;
  final double? height;
  final BoxFit? fit;
  final BorderRadius? borderRadius;
  final TcgdexUrlBuilder? tcgDexBuilder;
  final bool logFailures;
  final WidgetBuilder? placeholder;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  @override
  Widget build(BuildContext context) {
    Widget child;

    if (setCode != null && number != null) {
      child = FixCardImage(
        setCode: setCode!,
        number: number!,
        width: width,
        height: height,
        fit: fit ?? BoxFit.cover,
        borderRadius: borderRadius,
        tcgDexBuilder: tcgDexBuilder,
        logFailures: logFailures,
      );
    } else if (url != null && url!.isNotEmpty) {
      child = CachedNetworkImage(
        imageUrl: url!,
        width: width,
        height: height,
        fit: fit ?? BoxFit.cover,
        placeholder: (context, _) =>
            placeholder?.call(context) ??
            Container(width: width, height: height, color: const Color(0x1F000000)),
        errorWidget: (context, failedUrl, error) =>
            errorBuilder?.call(context, error, null) ??
            Container(
              width: width,
              height: height,
              alignment: Alignment.center,
              color: const Color(0x1F000000),
            ),
      );
    } else {
      child = Container(
        width: width, height: height, alignment: Alignment.center, color: const Color(0x1F000000),
      );
    }

    if (borderRadius != null) {
      child = ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}

(String, String)? _parseTcgdex(String url) {
  Uri? u; try { u = Uri.parse(url); } catch (_) { return null; }
  if (u.host.isEmpty || !u.host.contains('tcgdex.net')) return null;
  final segs = u.path.split('/').where((s) => s.isNotEmpty).toList();
  if (segs.length < 4) return null; // ["en","<series>","<setCode>","<number>"]
  final setCode = segs[2];
  final number = segs[3];
  if (setCode.isEmpty || number.isEmpty) return null;
  // Avoid routing alias/invalid families like 'me01' into FixCardImage
  if (setCode.toLowerCase().startsWith('me')) return null;
  return (setCode, number);
}

