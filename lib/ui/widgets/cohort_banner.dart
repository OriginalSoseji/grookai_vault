import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher_string.dart';

class CohortBanner extends StatefulWidget {
  final bool visible;
  const CohortBanner({super.key, required this.visible});
  @override
  State<CohortBanner> createState() => _CohortBannerState();
}

class _CohortBannerState extends State<CohortBanner> {
  bool _hide = false;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async { final p = await SharedPreferences.getInstance(); setState(() => _hide = p.getBool('hide_scanner_rollout_banner') == true); }
  Future<void> _dismiss() async { final p = await SharedPreferences.getInstance(); await p.setBool('hide_scanner_rollout_banner', true); if (mounted) setState(() => _hide = true); }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible || _hide) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)),
      child: Row(
        children: [
          const Icon(Icons.info_outline),
          const SizedBox(width: 8),
          const Expanded(child: Text("Scanner is rolling out gradually. You're not in the beta cohort yet.")),
          TextButton(
            onPressed: () async {
              // [ROLL] request_access
              // ignore: avoid_print
              // debug log only; do not persist PII
              // open a mailto or feedback link
              final url = 'mailto:support@grookai.example?subject=Scanner%20Beta%20Access';
              await launchUrlString(url);
            },
            child: const Text('Request access'),
          ),
          IconButton(onPressed: _dismiss, icon: const Icon(Icons.close)),
        ],
      ),
    );
  }
}

