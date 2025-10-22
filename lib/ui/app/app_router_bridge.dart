// lib/ui/app/app_router_bridge.dart
import 'package:flutter/widgets.dart';

/// Bridge widget to wrap the existing router/navigation setup without changing it.
/// Use this to insert app-wide theming or observers around your current MaterialApp/CupertinoApp.
class AppRouterBridge extends StatelessWidget {
  final Widget child;
  const AppRouterBridge({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // Keep this lean: just returns the child. Add observers/glue here if needed later.
    return child;
  }
}
