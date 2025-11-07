import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/app_router_bridge.dart';
import 'package:grookai_vault/dev/dev_overlay.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/theme/thunder_theme.dart';
import 'package:grookai_vault/ui/app/routes.dart';
// Legacy AppShell replaced by ThunderShell as primary shell
import 'package:grookai_vault/features/auth/login_page.dart';
import 'package:grookai_vault/shell/thunder_shell.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    return MaterialApp(
      title: 'Grookai Vault',
      theme: ThunderTheme.materialDark(),
      darkTheme: ThunderTheme.materialDark(),
      themeMode: ThemeMode.dark,
      builder: (context, child) {
        return GVTheme.adaptive(
          child: DevOverlay(
            child: AppRouterBridge(child: child ?? const SizedBox.shrink()),
          ),
        );
      },
      routes: buildAppRoutes(),
      home: StreamBuilder<AuthState>(
        stream: supabase.auth.onAuthStateChange,
        initialData: AuthState(
          AuthChangeEvent.initialSession,
          supabase.auth.currentSession,
        ),
        builder: (context, snapshot) {
          final session = supabase.auth.currentSession;
          if (session == null) return const LoginPage();
          // Thunder is the primary and only shell now
          return const ThunderShell();
        },
      ),
    );
  }
}
