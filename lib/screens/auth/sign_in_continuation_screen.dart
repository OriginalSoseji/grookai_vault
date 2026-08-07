import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Focused authentication entry used when a signed-out collector starts a
/// personal action from a public card surface.
class SignInContinuationScreen extends StatefulWidget {
  const SignInContinuationScreen({super.key, required this.destinationLabel});

  final String destinationLabel;

  @override
  State<SignInContinuationScreen> createState() =>
      _SignInContinuationScreenState();
}

class _SignInContinuationScreenState extends State<SignInContinuationScreen> {
  static const String _googleRedirectUri = 'grookaivault://login-callback';

  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  StreamSubscription<AuthState>? _authSubscription;
  bool _loading = false;
  bool _completed = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _authSubscription = _client.auth.onAuthStateChange.listen((event) {
      final session = event.session ?? _client.auth.currentSession;
      if (_completed || session == null || session.isExpired || !mounted) {
        return;
      }
      _completed = true;
      Navigator.of(context).pop(true);
    });
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signInWithEmail() async {
    FocusScope.of(context).unfocus();
    if (_loading) {
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _client.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Sign in is unavailable right now.');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _signInWithGoogle() async {
    FocusScope.of(context).unfocus();
    if (_loading) {
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final launched = await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: _googleRedirectUri,
      );
      if (!launched) {
        throw const AuthException('Google sign in could not be opened.');
      }
    } on AuthException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Google sign in is unavailable right now.');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
          children: [
            Icon(Icons.lock_open_rounded, size: 44, color: scheme.primary),
            const SizedBox(height: 18),
            Text(
              'Continue where you left off',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Sign in to ${widget.destinationLabel}. You will return to this card when sign in completes.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurface.withValues(alpha: 0.68),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: _loading ? null : _signInWithGoogle,
              icon: const Icon(Icons.login_rounded),
              label: Text(_loading ? 'Opening...' : 'Continue with Google'),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.alternate_email_rounded),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _signInWithEmail(),
              decoration: const InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock_outline_rounded),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _signInWithEmail,
              child: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sign in with email'),
            ),
          ],
        ),
      ),
    );
  }
}
