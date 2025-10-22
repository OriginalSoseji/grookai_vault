import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'package:grookai_vault/services/edge_warmup.dart';
import 'package:grookai_vault/ui/components/app_nav.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _lifecycleObserver = _AppLifecycleWarmup();
  final supabase = Supabase.instance.client;
  StreamSubscription<AuthState>? _authSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(_lifecycleObserver);
    // Rebuild when auth state/user metadata changes (e.g., avatar_url updated)
    _authSub = supabase.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(_lifecycleObserver);
    _authSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Delegate to platform-aware AppNav. Profile lives top-right per platform.
    return const AppNav();
  }
}

class _AppLifecycleWarmup extends WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      EdgeWarmup.warm();
    }
  }
}

// Avatar now lives in ProfileButton
