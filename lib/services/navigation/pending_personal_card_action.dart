enum PendingPersonalCardActionKind { addToVault, want }

class PendingPersonalCardActionRequest {
  const PendingPersonalCardActionRequest({
    required this.id,
    required this.kind,
    required this.cardPrintId,
    required this.gvId,
    this.cardPrintingId,
    this.printingGvId,
    this.finishLabel,
  });

  final int id;
  final PendingPersonalCardActionKind kind;
  final String cardPrintId;
  final String gvId;
  final String? cardPrintingId;
  final String? printingGvId;
  final String? finishLabel;
}

/// Preserves one explicit card action while authentication replaces the app
/// root. The request is in-memory only and is consumed by the matching card.
class PendingPersonalCardActionCoordinator {
  PendingPersonalCardActionCoordinator._();

  static int _nextId = 0;
  static PendingPersonalCardActionRequest? _pending;
  static PendingPersonalCardActionRequest? _active;

  static PendingPersonalCardActionRequest? get pending => _pending;
  static bool get hasUnsettledAction => _pending != null || _active != null;

  static PendingPersonalCardActionRequest stage({
    required PendingPersonalCardActionKind kind,
    required String cardPrintId,
    required String gvId,
    String? cardPrintingId,
    String? printingGvId,
    String? finishLabel,
  }) {
    final normalizedCardPrintingId = cardPrintingId?.trim();
    final normalizedPrintingGvId = printingGvId?.trim().toUpperCase();
    final normalizedFinishLabel = finishLabel?.trim();
    final request = PendingPersonalCardActionRequest(
      id: ++_nextId,
      kind: kind,
      cardPrintId: cardPrintId.trim(),
      gvId: gvId.trim().toUpperCase(),
      cardPrintingId:
          normalizedCardPrintingId == null || normalizedCardPrintingId.isEmpty
          ? null
          : normalizedCardPrintingId,
      printingGvId:
          normalizedPrintingGvId == null || normalizedPrintingGvId.isEmpty
          ? null
          : normalizedPrintingGvId,
      finishLabel:
          normalizedFinishLabel == null || normalizedFinishLabel.isEmpty
          ? null
          : normalizedFinishLabel,
    );
    _pending = request;
    _active = null;
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
    _active = request;
    return request;
  }

  static void complete(int requestId) {
    if (_active?.id == requestId) {
      _active = null;
    }
  }

  static void cancel(int requestId) {
    if (_pending?.id == requestId) {
      _pending = null;
    }
  }

  static void clearForTesting() {
    _pending = null;
    _active = null;
    _nextId = 0;
  }
}
