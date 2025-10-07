import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Reads: pubspec version + build, and a dart-define BUILD_TAG (e.g., dev-20250907-121314)
class VersionBadge extends StatefulWidget {
  const VersionBadge({super.key});

  @override
  State<VersionBadge> createState() => _VersionBadgeState();
}

class _VersionBadgeState extends State<VersionBadge> {
  String _label = '…';

  // Compile-time tag from --dart-define=BUILD_TAG=...
  static const _buildTag = String.fromEnvironment('BUILD_TAG', defaultValue: 'dev-local');

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final info = await PackageInfo.fromPlatform();
    final version = '${info.version}+${info.buildNumber}';
    final label = 'v$version • $_buildTag';
    // Print to console too so you can see it in logs
    // ignore: avoid_print
    print('GrookaiVault Build => $label');
    if (mounted) {
      setState(() => _label = label);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.9),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Text(
        _label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}


