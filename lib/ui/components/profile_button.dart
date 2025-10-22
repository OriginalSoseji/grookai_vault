import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';

class ProfileButton extends StatelessWidget {
  const ProfileButton({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final email = user?.email ?? '';
    final md = user?.userMetadata ?? {};
    final url = (md['avatar_url'] ?? '').toString().trim();
    final avatar = url.startsWith('http')
        ? CircleAvatar(radius: 14, backgroundImage: NetworkImage(url))
        : CircleAvatar(
            radius: 14,
            child: Text(
              (email.isNotEmpty ? email[0] : 'U').toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          );
    return IconButton(
      tooltip: 'Profile',
      icon: avatar,
      onPressed: () => _openSheet(context),
    );
  }

  void _openSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _sheetTile(
                context,
                icon: Icons.person,
                label: 'Account',
                onTap: () =>
                    Navigator.of(context).pushNamed(RouteNames.account),
              ),
              if (GV_FEATURE_ALERTS)
                _sheetTile(
                  context,
                  icon: Icons.notifications,
                  label: 'Alerts',
                  onTap: () =>
                      Navigator.of(context).pushNamed(RouteNames.alerts),
                ),
              _sheetTile(
                context,
                icon: Icons.workspace_premium,
                label: 'Subscription (Coming Soon)',
              ),
              _sheetTile(
                context,
                icon: Icons.settings,
                label: 'Settings (Coming Soon)',
              ),
              _sheetTile(
                context,
                icon: Icons.gavel,
                label: 'Legal (Coming Soon)',
              ),
              const Divider(height: 1),
              _sheetTile(
                context,
                icon: Icons.logout,
                label: 'Sign out',
                onTap: () async {
                  await Supabase.instance.client.auth.signOut();
                  if (context.mounted) Navigator.pop(context);
                },
              ),
              const SizedBox(height: GVSpacing.s8),
            ],
          ),
        );
      },
    );
  }

  Widget _sheetTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      onTap: () {
        Navigator.pop(context);
        if (onTap != null) onTap();
      },
    );
  }
}
