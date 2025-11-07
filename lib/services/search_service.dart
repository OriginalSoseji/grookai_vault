import 'package:grookai_vault/services/cards_service.dart';
import 'package:grookai_vault/services/search_gateway.dart';

class SearchParams {
  final String query;
  const SearchParams(this.query);
}

class SearchResult {
  final List<Map<String, dynamic>> rows;
  const SearchResult(this.rows);
}

class SearchService {
  final _gateway = SearchGateway();
  final _cards = CardsService();

  Future<SearchResult> search(SearchParams p) async {
    final q = p.query.trim();
    if (q.isEmpty) return const SearchResult([]);
    // Try DB-first via CardsService paths
    List<Map<String, dynamic>> rows = await _cards.search(q, limit: 20);
    if (rows.isEmpty) {
      // Fallback to gateway
      final r = await _gateway.searchResult(q);
      rows = r.data ?? const [];
    }
    return SearchResult(rows);
  }
}
