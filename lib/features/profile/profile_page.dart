import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/features/account/account_page.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/config/env.dart';
import 'package:grookai_vault/services/search_service_unified.dart';
import 'package:url_launcher/url_launcher.dart';
// DEV/DEMO FEATURES ARE ALWAYS VISIBLE (INTENTIONAL)
// Before public release, re-introduce a single feature flag or environment check if needed.
import 'package:grookai_vault/dev/dev_launcher.dart';
import 'package:grookai_vault/dev/scanner_dev_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  int _devTapCount = 0;
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _signingUp = false;
  @override
  void initState() {
    super.initState();
    Telemetry.log('profile_view');
  }

  Future<void> _signOut(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    await Supabase.instance.client.auth.signOut();
    if (!mounted) return;
    messenger.showSnackBar(const SnackBar(content: Text('Signed out')));
  }

  Future<void> _testUnifiedSearch(BuildContext context) async {
    final api = GVSearchApi(Env.supabaseUrl, Env.supabaseAnonKey);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final rows = await api.searchCardsUnified('Pikachu 049/203', limit: 25);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text('Unified search OK: ${rows.length} results')),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text('Unified search failed: $e')),
      );
    }
  }

  Future<void> _refreshWall(BuildContext context) async {
    final api = GVSearchApi(Env.supabaseUrl, Env.supabaseAnonKey);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final ok = await api.refreshWall();
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(ok ? 'Wall refresh: ok' : 'Wall refresh: failed')),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text('Wall refresh error: $e')),
      );
    }
  }

  Future<void> _signUpLocal(BuildContext context) async {
    final email = _emailCtrl.text.trim();
    final password = _passCtrl.text;
    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Enter email and password')));
      return;
    }
    setState(() => _signingUp = true);
    try {
      final auth = Supabase.instance.client.auth;
      final res = await auth.signUp(email: email, password: password);
      if (!mounted) return;
      if (res.user == null && res.session == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Check Mailpit to confirm your email, then sign in.')));
      } else if (res.session != null) {
        final u = res.user?.email ?? 'user';
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Signed in as $u')));
      } else {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Signup complete.')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Signup error: $e')));
    } finally {
      if (mounted) setState(() => _signingUp = false);
    }
  }

  Future<void> _openMailpit() async {
    final uri = Uri.parse('http://127.0.0.1:54324');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(
        title: GestureDetector(
          onTap: () {
            _devTapCount++;
            if (_devTapCount >= 5) {
              _devTapCount = 0;
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ScannerDevPage()),
              );
            }
          },
          child: Text(
            'Profile',
            style: gv.typography.title.copyWith(color: gv.colors.textPrimary),
          ),
        ),
        actions: [
          const DevLauncher(),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
          // Environment line
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline),
              title: Text('ENV: ${Env.envName}'),
              subtitle: Text('URL: ${Env.supabaseUrl}'),
            ),
          ),
          const SizedBox(height: GVSpacing.s16),
          if (Env.envName == 'local')
            Card(
              child: Padding(
                padding: const EdgeInsets.all(GVSpacing.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Local Auth Tools', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: GVSpacing.s8),
                    TextField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                    ),
                    const SizedBox(height: GVSpacing.s8),
                    TextField(
                      controller: _passCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password'),
                    ),
                    const SizedBox(height: GVSpacing.s12),
                    Row(
                      children: [
                        FilledButton.icon(
                          onPressed: _signingUp ? null : () => _signUpLocal(context),
                          icon: const Icon(Icons.person_add_alt),
                          label: const Text('Create Local Test User'),
                        ),
                        const SizedBox(width: GVSpacing.s12),
                        OutlinedButton.icon(
                          onPressed: _openMailpit,
                          icon: const Icon(Icons.mail_outline),
                          label: const Text('Open Mailpit'),
                        ),
                      ],
                    ),
                    const SizedBox(height: GVSpacing.s8),
                    const Text(
                      'Tip: If no session returns on signup, confirm the email in Mailpit, then sign in.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          if (Env.envName == 'local') const SizedBox(height: GVSpacing.s16),
          // Pro upsell
          Card(
            color: gv.colors.card,
            child: ListTile(
              leading: Icon(Icons.workspace_premium, color: gv.colors.accent),
              title: const Text('Go Pro'),
              subtitle: const Text('Live portfolio updates + rarity alerts'),
              onTap: () {
                Telemetry.log('pro_click');
              },
            ),
          ),
          const SizedBox(height: GVSpacing.s16),
          // Links section
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.history),
                  title: const Text('Scan History'),
                  onTap: () =>
                      Navigator.of(context).pushNamed(RouteNames.scanHistory),
                ),
                const Divider(height: 1),
                if (gvFeatureAlerts) ...[
                  ListTile(
                    leading: const Icon(Icons.notifications),
                    title: const Text('Alerts'),
                    onTap: () =>
                        Navigator.of(context).pushNamed(RouteNames.alerts),
                  ),
                  const Divider(height: 1),
                ],
                ListTile(
                  leading: const Icon(Icons.chat_bubble_outline),
                  title: const Text('Join Discord'),
                  onTap: () {
                    // TODO: Deep link to Discord when available
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.storefront_outlined),
                  title: const Text('Link eBay'),
                  onTap: () {
                    // TODO: Link eBay auth when token plumbing exists
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined),
                  title: const Text('Settings'),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AccountPage()),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: GVSpacing.s16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.camera_enhance),
                  title: const Text('Advanced Scanner (Dev)'),
                  onTap: () => Navigator.of(context).pushNamed('/scanner-advanced'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.add_box_outlined),
                  title: const Text('Create Listing (Dev)'),
                  onTap: () => Navigator.of(context).pushNamed(RouteNames.createListing),
                ),
              ],
            ),
          ),
          const SizedBox(height: GVSpacing.s16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.view_module),
                  title: const Text('RC Feed Demo'),
                  onTap: () => Navigator.of(context).pushNamed('/rc-feed'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.search),
                  title: const Text('RC Search Demo'),
                  onTap: () => Navigator.of(context).pushNamed('/rc-search'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.style),
                  title: const Text('RC Detail Demo'),
                  onTap: () => Navigator.of(context).pushNamed('/rc-detail'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.search),
                  title: const Text('Test Unified Search (RPC)'),
                  subtitle: const Text('Calls public.search_cards via PostgREST'),
                  onTap: () => _testUnifiedSearch(context),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.refresh),
                  title: const Text('Refresh Wall (MV)'),
                  subtitle: const Text('Calls rpc_refresh_wall to refresh wall_thumbs_3x4'),
                  onTap: () => _refreshWall(context),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.build),
                  title: const Text('Open Scanner (Dev)'),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ScannerDevPage()),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: GVSpacing.s16),
          FilledButton.icon(
            onPressed: () => _signOut(context),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

