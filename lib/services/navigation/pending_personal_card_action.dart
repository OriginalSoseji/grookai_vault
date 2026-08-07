enum PendingPersonalCardActionKind { addToVault, want }

class PendingPersonalCardActionRequest {
  const PendingPersonalCardActionRequest({
    required this.id,
    required this.kind,
    required this.cardPrintId,
    required this.gvId,
  });

  final int id;
  final PendingPersonalCardActionKind kind;
  final String cardPrintId;
  final String gvId;
}

/// Preserves one explicit card action while authentication replaces the app
/// root. The request is in-memory only and is consumed by the matching card.
class PendingPersonalCardActionCoordinator {
  PendingPersonalCardActionCoordinator._();

  static int _nextId = 0;
  static PendingPersonalCardActionRequest? _pending;

  static PendingPersonalCardActionRequest? get pending => _pending;

  static PendingPersonalCardActionRequest stage({
    required PendingPersonalCardActionKind kind,
    required String cardPrintId,
    required String gvId,
  }) {
    final request = PendingPersonalCardActionRequest(
      id: ++_nextId,
      kind: kind,
      cardPrintId: cardPrintId.trim(),
      gvId: gvId.trim().toUpperCase(),
    );
    _pending = request;
    return request;
  }

  static PendingPersonalCardActionRequest? takeForCard({
    required String cardPrintId,
    required String gvId,
  }) {
    final request = _pending;
    if (request == null) {
      return null;
    }
    final normalizedCardPrintId = cardPrintId.trim();
    final normalizedGvId = gvId.trim().toUpperCase();
    final cardPrintMatches =
        request.cardPrintId.isNotEmpty &&
        request.cardPrintId == normalizedCardPrintId;
    final gvIdMatches =
        request.gvId.isNotEmpty && request.gvId == normalizedGvId;
    if (!cardPrintMatches && !gvIdMatches) {
      return null;
    }
    _pending = null;
    return request;
  }

  static void cancel(int requestId) {
    if (_pending?.id == requestId) {
      _pending = null;
    }
  }

  static void clearForTesting() {
    _pending = null;
    _nextId = 0;
  }
}
