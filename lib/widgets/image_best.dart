import 'package:flutter/material.dart';
import 'package:grookai_vault/widgets/smart_card_image.dart';

/// Drop-in replacement for any old image helper:
/// - For tcgdex URLs, this will auto-parse setCode/number and use FixCardImage with fallbacks.
/// - For all other URLs, it uses CachedNetworkImage under the hood.
/// Keep your existing calls: imageBest(url, width:..., height:..., ...)
Widget imageBest(
  String url, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  BorderRadius? borderRadius,
  bool logFailures = true, // set false to silence fallback logs in release
}) {
  return SmartCardImage.network(
    url,
    width: width,
    height: height,
    fit: fit,
    borderRadius: borderRadius,
    logFailures: logFailures,
  );
}

/// Picks the best available image URL from a heterogeneous row.
/// Tries common keys first; if absent, builds a TCGDex URL from set_code + number.
String imageBestFromRow(Map row) {
  String s1(dynamic v) => (v ?? '').toString().trim();

  // Direct URL fields commonly found
  final direct = s1(
    row['thumb_url'] ?? row['image_best'] ?? row['image_url'] ?? row['photo_url'] ?? row['image'],
  );
  if (direct.isNotEmpty &&
      (direct.startsWith('http://') || direct.startsWith('https://'))) {
    return direct;
  }

  // Some rows have relative path; return as-is for upstream resolvers to handle
  final path = s1(row['image_path']);
  if (path.isNotEmpty &&
      (path.startsWith('http://') || path.startsWith('https://'))) {
    return path;
  }

  // Build from set code + number via TCGDex convention
  final setCode = s1(
    row['set_code'] ?? row['set'] ?? row['set_name'],
  ).toLowerCase();
  final number = s1(row['number'] ?? row['collector_number']).toLowerCase();
  if (setCode.isNotEmpty && number.isNotEmpty) {
    String series;
    if (setCode.startsWith('sv')) {
      series = 'sv';
    } else if (setCode.startsWith('swsh')) {
      series = 'swsh';
    } else if (setCode.startsWith('sm')) {
      series = 'sm';
    } else if (setCode.startsWith('xy')) {
      series = 'xy';
    } else if (setCode.startsWith('bw')) {
      series = 'bw';
    } else if (setCode.startsWith('dp')) {
      series = 'dp';
    } else if (setCode.startsWith('ex')) {
      series = 'ex';
    } else if (setCode.startsWith('base')) {
      series = 'base';
    } else {
      series = setCode.replaceAll(RegExp(r'[^a-z]'), '');
    }
    return 'https://assets.tcgdex.net/en/$series/$setCode/$number/high.png';
  }

  return '';
}

class _ShimmerBox extends StatefulWidget {
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  const _ShimmerBox({this.width, this.height, this.borderRadius});
  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  }
  @override
  void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(8),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                Colors.grey.shade300,
                Colors.grey.shade200,
                Colors.grey.shade300,
              ],
              stops: [0.0, (_c.value * 0.6) + 0.2, 1.0],
            ),
          ),
        );
      },
    );
  }
}

Widget imageBestPlaceholder({double? width, double? height, BorderRadius? borderRadius}) {
  return _ShimmerBox(width: width, height: height, borderRadius: borderRadius);
}
