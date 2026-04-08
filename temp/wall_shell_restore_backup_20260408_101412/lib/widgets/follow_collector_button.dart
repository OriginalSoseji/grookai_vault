import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/public/collector_follow_service.dart';

enum FollowCollectorButtonVariant { standard, compact }

class FollowCollectorButton extends StatefulWidget {
  const FollowCollectorButton({
    required this.collectorUserId,
    required this.initialIsFollowing,
    this.onChanged,
    this.variant = FollowCollectorButtonVariant.standard,
    super.key,
  });

  final String collectorUserId;
  final bool initialIsFollowing;
  final ValueChanged<bool>? onChanged;
  final FollowCollectorButtonVariant variant;

  @override
  State<FollowCollectorButton> createState() => _FollowCollectorButtonState();
}

class _FollowCollectorButtonState extends State<FollowCollectorButton> {
  bool _isFollowing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _isFollowing = widget.initialIsFollowing;
  }

  @override
  void didUpdateWidget(covariant FollowCollectorButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialIsFollowing != widget.initialIsFollowing) {
      _isFollowing = widget.initialIsFollowing;
    }
  }

  Future<void> _toggle() async {
    if (_saving) {
      return;
    }

    final client = Supabase.instance.client;
    if (client.auth.currentUser == null) {
      _showMessage('Sign in required.');
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      final result = _isFollowing
          ? await CollectorFollowService.unfollowCollector(
              client: client,
              followedUserId: widget.collectorUserId,
            )
          : await CollectorFollowService.followCollector(
              client: client,
              followedUserId: widget.collectorUserId,
            );

      if (!mounted) {
        return;
      }

      setState(() {
        _saving = false;
        if (result.ok) {
          _isFollowing = result.isFollowing;
        }
      });

      if (result.ok) {
        widget.onChanged?.call(result.isFollowing);
      } else {
        _showMessage(result.message);
      }
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _saving = false;
      });
      _showMessage(
        _isFollowing
            ? 'Collector could not be unfollowed.'
            : 'Collector could not be followed.',
      );
    }
  }

  void _showMessage(String message) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = Supabase.instance.client.auth.currentUser?.id;
    if (currentUserId != null && currentUserId == widget.collectorUserId) {
      return const SizedBox.shrink();
    }

    final label = _saving
        ? 'Saving...'
        : _isFollowing
        ? 'Following'
        : 'Follow';

    switch (widget.variant) {
      case FollowCollectorButtonVariant.standard:
        if (_isFollowing) {
          return OutlinedButton(
            onPressed: _saving ? null : _toggle,
            child: Text(label),
          );
        }
        return FilledButton(
          onPressed: _saving ? null : _toggle,
          child: Text(label),
        );
      case FollowCollectorButtonVariant.compact:
        if (_isFollowing) {
          return OutlinedButton(
            onPressed: _saving ? null : _toggle,
            style: OutlinedButton.styleFrom(
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(label),
          );
        }
        return FilledButton(
          onPressed: _saving ? null : _toggle,
          style: FilledButton.styleFrom(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(label),
        );
    }
  }
}
