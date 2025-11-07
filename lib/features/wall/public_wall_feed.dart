import 'package:flutter/material.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PublicWallFeed extends StatelessWidget {
  const PublicWallFeed({super.key});

  @override
  Widget build(BuildContext context) {
    Telemetry.log('wall_view');
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fetchWall(Supabase.instance.client),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const LinearProgressIndicator(minHeight: 2);
        }
        final list = snap.data ?? const <Map<String, dynamic>>[];
        if (list.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Community Wall', style: TextStyle(fontWeight: FontWeight.bold)),
              SizedBox(height: 8),
              Text('No posts yet — coming soon.'),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Community Wall', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            for (final r in list.take(5))
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text((r['title'] ?? 'Post').toString()),
                subtitle: Text((r['created_at'] ?? '').toString()),
              ),
          ],
        );
      },
    );
  }
}

Future<List<Map<String, dynamic>>> _fetchWall(SupabaseClient client) async {
  try {
    final data = await client
        .from('wall_feed_view')
        .select('listing_id, card_id, title, price_cents, thumb_url, created_at')
        .limit(10);
    return List<Map<String, dynamic>>.from((data as List?) ?? const []);
  } catch (_) {
    return const <Map<String, dynamic>>[];
  }
}

