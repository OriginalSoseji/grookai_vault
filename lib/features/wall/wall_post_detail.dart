import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';

class WallPostDetail extends StatelessWidget {
  final String id;
  const WallPostDetail({super.key, required this.id});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Post')),
      body: FutureBuilder<Map<String, dynamic>?>(
        future: _fetchPost(Supabase.instance.client, id),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final r = snap.data;
          if (r == null) return const Center(child: Text('Not found'));
          final title = (r['title'] ?? 'Post').toString();
          final body = (r['summary'] ?? r['body'] ?? '').toString();
          final img = (r['thumb_url'] ?? r['image_url'] ?? '').toString();
          final owner = (r['owner_id'] ?? r['owner'] ?? '').toString();
          final ts = (r['created_at'] ?? '').toString();
          return ListView(
            padding: const EdgeInsets.all(GVSpacing.s16),
            children: [
              Text(title,
                  style: gv.typography.title
                      .copyWith(color: gv.colors.textPrimary)),
              const SizedBox(height: GVSpacing.s8),
              Text('$owner • $ts',
                  style: gv.typography.caption
                      .copyWith(color: gv.colors.textSecondary)),
              const SizedBox(height: GVSpacing.s16),
              if (img.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(img, fit: BoxFit.cover),
                ),
              const SizedBox(height: GVSpacing.s16),
              Text(body, style: gv.typography.body),
            ],
          );
        },
      ),
    );
  }
}

Future<Map<String, dynamic>?> _fetchPost(SupabaseClient client, String id) async {
  try {
    final r = await client
        .from('wall_feed_view')
        .select('listing_id, owner_id, card_id, title, price_cents, thumb_url, created_at')
        .eq('listing_id', id)
        .maybeSingle();
    if (r != null) return Map<String, dynamic>.from(r);
  } catch (_) {}
  return null;
}
