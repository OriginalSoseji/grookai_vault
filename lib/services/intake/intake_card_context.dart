import '../../models/card_print.dart';
import '../identity/display_identity.dart';
import '../scanner_v5/scanner_v5_identity_service.dart';

/// Display metadata travels with the exact selected parent; finish still needs
/// explicit review against that parent's governed printing options.
ScannerV5Candidate intakeCandidateFromCard(CardPrint card) =>
    ScannerV5Candidate(
      id: card.gvId ?? card.id,
      cardId: card.id,
      gvId: card.gvId,
      name: card.name,
      displayName: resolveCardPrintDisplayIdentity(card).displayName,
      setCode: card.setCode,
      setName: card.setName,
      number: card.number,
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
      imageUrl: card.catalogImageUrl,
    );

String intakeCandidateDisplayName(ScannerV5Candidate? card) {
  if (card == null) return 'Choose a card';
  final displayName = card.displayName?.trim();
  if (displayName != null && displayName.isNotEmpty) return displayName;
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
    setCode: card.setCode,
    number: card.number,
  ).displayName;
}

String intakeCandidateSetLabel(ScannerV5Candidate? card) => [
  card?.setName ?? card?.setCode ?? card?.gvId ?? 'Set unavailable',
  if (card?.number?.isNotEmpty == true) '#${card!.number}',
].join(' · ');
