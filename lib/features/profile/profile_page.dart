import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/features/account/account_page.dart';
import 'package:grookai_vault/core/telemetry.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  @override
  void initState() {
    super.initState();
    Telemetry.log('profile_view');
  }

  Future<void> _signOut(BuildContext context) async {
    await Supabase.instance.client.auth.signOut();
    if (context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Signed out')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(
        title: Text(
          'Profile',
          style: gv.typography.title.copyWith(color: gv.colors.textPrimary),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
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
