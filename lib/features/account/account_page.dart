import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});
  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  final supabase = Supabase.instance.client;
  late final TextEditingController _name;
  late final TextEditingController _avatar;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = supabase.auth.currentUser;
    final md = user?.userMetadata ?? {};
    _name = TextEditingController(text: (md['full_name'] ?? md['name'] ?? '').toString());
    _avatar = TextEditingController(text: (md['avatar_url'] ?? '').toString());
    _avatar.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _avatar.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await supabase.auth.updateUser(
        UserAttributes(data: {
          'full_name': _name.text.trim(),
          'avatar_url': _avatar.text.trim(),
        }),
      );
      // Refresh session to pull updated user metadata into currentUser
      await supabase.auth.refreshSession();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } on AuthException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Update failed: ${e.message}')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    final email = supabase.auth.currentUser?.email ?? '(unknown)';
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(title: Text('My Account', style: gv.typography.title.copyWith(color: gv.colors.textPrimary))),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(GVSpacing.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Signed in as', style: gv.typography.caption.copyWith(color: gv.colors.textSecondary)),
                const SizedBox(height: GVSpacing.s4),
                SelectableText(email, style: gv.typography.body),
                const SizedBox(height: GVSpacing.s16),
                if (_avatar.text.trim().isNotEmpty) ...[
                  Row(
                    children: [
                      CircleAvatar(radius: 28, backgroundImage: NetworkImage(_avatar.text.trim())),
                      const SizedBox(width: GVSpacing.s12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 96,
                          height: 96,
                          child: AsyncImage(_avatar.text.trim(), width: 96, height: 96, fit: BoxFit.cover),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: GVSpacing.s12),
                ],
                TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Display name', prefixIcon: Icon(Icons.person)),
                ),
                const SizedBox(height: GVSpacing.s12),
                TextField(
                  controller: _avatar,
                  decoration: const InputDecoration(labelText: 'Avatar URL', prefixIcon: Icon(Icons.image)),
                ),
                const SizedBox(height: GVSpacing.s20),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save),
                  label: const Text('Save changes'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
