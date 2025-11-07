import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/feed/controllers/feed_controller.dart';

void main() {
  test('optimistic wishlist toggles and may rollback', () async {
    final c = FeedController();
    await c.refresh();
    final first = c.items.first;
    final before = first.wishlisted;
    await c.toggleWishlist(first);
    expect(c.items.first.wishlisted != before, true);
  });
}

