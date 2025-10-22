import 'package:supabase_flutter/supabase_flutter.dart';

Future<List<Map<String, dynamic>>> fetchCardsByName(String q) async {
  final supa = Supabase.instance.client;

  final rows = await supa
      .from('v_card_search')
      .select('id, set_code, number, name, rarity, image_best')
      .ilike('name', '%$q%')
      .limit(50);

  return (rows as List).cast<Map<String, dynamic>>();
}
