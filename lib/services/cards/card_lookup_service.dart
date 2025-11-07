class CardLookupService {
  Future<List<Map<String, dynamic>>> suggestBySetAndNumber({String? setId, int? cardNo}) async {
    // TODO: query Supabase REST (rpc or view) for candidates.
    // Return [{ 'name': 'Pikachu', 'set': 'SV2', 'no': 15, 'rarity': '★' }, ...]
    return const [];
  }
}

