class FeedItem {
  final String id;
  final String title;
  final String? thumbUrl3x4;
  final String cardId;
  final bool wishlisted;

  const FeedItem({
    required this.id,
    required this.title,
    required this.cardId,
    this.thumbUrl3x4,
    this.wishlisted = false,
  });

  FeedItem copyWith({bool? wishlisted}) => FeedItem(
        id: id,
        title: title,
        cardId: cardId,
        thumbUrl3x4: thumbUrl3x4,
        wishlisted: wishlisted ?? this.wishlisted,
      );
}

