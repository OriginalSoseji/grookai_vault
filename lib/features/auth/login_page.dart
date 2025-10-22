import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/config/env.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;

  SupabaseClient get supabase => Supabase.instance.client;

  Future<void> _signIn() async {
    setState(() => _loading = true);
    try {
      await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException catch (e) {
      _snack('Login failed: ${e.message}');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signUp() async {
    setState(() => _loading = true);
    try {
      await supabase.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
      );
      _snack('Account created. Verify email if enabled.');
    } on AuthException catch (e) {
      _snack('Sign up failed: ${e.message}');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _signInWithGoogle() async {
    setState(() => _loading = true);
    try {
      // Uses Supabase OAuth. On web, omit redirectTo so Supabase uses current origin/Site URL.
      if (kIsWeb) {
        await supabase.auth.signInWithOAuth(OAuthProvider.google);
      } else {
        await supabase.auth.signInWithOAuth(OAuthProvider.google, redirectTo: Env.oauthRedirectUrl);
      }
    } on AuthException catch (e) {
      _snack('Google sign-in failed: ${e.message}');
    } catch (e) {
      _snack('Google sign-in error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(title: Text('Sign in', style: gv.typography.title.copyWith(color: gv.colors.textPrimary))),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(GVSpacing.s16),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email)),
              ),
              const SizedBox(height: GVSpacing.s12),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock)),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _signIn,
                child: _loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Sign in'),
              ),
              const SizedBox(height: GVSpacing.s8),
              TextButton(onPressed: _loading ? null : _signUp, child: const Text('Create account')),
              const SizedBox(height: GVSpacing.s16),
              Row(children: const [Expanded(child: Divider()), SizedBox(width: GVSpacing.s8), Text('OR'), SizedBox(width: GVSpacing.s8), Expanded(child: Divider())]),
              const SizedBox(height: GVSpacing.s12),
              OutlinedButton.icon(
                onPressed: _loading ? null : _signInWithGoogle,
                icon: const Icon(Icons.login),
                label: const Text('Continue with Google'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
