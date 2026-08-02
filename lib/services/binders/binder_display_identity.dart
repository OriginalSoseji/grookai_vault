import '../../models/binders/binder_models.dart';
import '../identity/display_identity.dart';

ResolvedDisplayIdentity resolveBinderChecklistItemIdentity(
  BinderChecklistItem item,
) {
  return resolveDisplayIdentityFromFields(
    name: item.name,
    variantKey: item.variantKey,
    printedIdentityModifier: item.printedIdentityModifier,
    finishLabel: item.finishLabel,
  );
}

ResolvedDisplayIdentity resolveBinderCatalogCardIdentity(
  BinderCatalogCard card,
) {
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
  );
}

ResolvedDisplayIdentity resolveBinderEligibleCopyIdentity(
  BinderEligibleCopy copy,
) {
  return resolveDisplayIdentityFromFields(
    name: copy.name,
    variantKey: copy.variantKey,
    printedIdentityModifier: copy.printedIdentityModifier,
    finishLabel: copy.finishLabel,
  );
}
