import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/app_router_bridge.dart';
import 'package:grookai_vault/dev/dev_overlay.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/app/routes.dart';
import 'package:grookai_vault/ui/app/app_shell.dart';
import 'package:grookai_vault/features/auth/login_page.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    return MaterialApp(
      title: 'Grookai Vault',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF00A2FF),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xFF00A2FF),
      ),
      themeMode: ThemeMode.system,
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
          return session == null ? const LoginPage() : const AppShell();
        },
      ),
    );
  }
}
