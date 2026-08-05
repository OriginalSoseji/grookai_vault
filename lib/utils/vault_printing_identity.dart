enum VaultPrintingIdentityStatus {
  exact,
  unassigned,
  partiallyUnassigned,
  mixed,
  unavailable,
}

class VaultPrintingIdentityPresentation {
  const VaultPrintingIdentityPresentation({
    required this.status,
    required this.label,
  });

  final VaultPrintingIdentityStatus status;
  final String label;

  bool get isExact => status == VaultPrintingIdentityStatus.exact;
}

String vaultCardArtworkLabel(
  String cardName,
  VaultPrintingIdentityPresentation printingIdentity,
) {
  final normalizedName = cardName.trim();
  return normalizedName.isEmpty
      ? printingIdentity.label
      : '$normalizedName · ${printingIdentity.label}';
}

VaultPrintingIdentityPresentation resolveVaultPrintingIdentityPresentation(
  Map<String, dynamic> row,
) {
  final status = (row['printing_identity_status'] ?? '')
      .toString()
      .trim()
      .toLowerCase();

  switch (status) {
    case 'exact':
      final finishLabel = _trimmedVaultPrintingValue(row['finish_label']);
      if (finishLabel != null) {
        return VaultPrintingIdentityPresentation(
          status: VaultPrintingIdentityStatus.exact,
          label: 'Printing: $finishLabel',
        );
      }
      final printingGvId = _trimmedVaultPrintingValue(row['printing_gv_id']);
      return VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.exact,
        label: printingGvId == null
            ? 'Exact printing assigned'
            : 'Printing: $printingGvId',
      );
    case 'unassigned':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.unassigned,
        label: 'Printing unassigned',
      );
    case 'partially_unassigned':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.partiallyUnassigned,
        label: 'Printing partially unassigned',
      );
    case 'mixed':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.mixed,
        label: 'Mixed printings',
      );
    default:
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.unavailable,
        label: 'Printing status unavailable',
      );
  }
}

String? _trimmedVaultPrintingValue(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  return normalized.isEmpty ? null : normalized;
}
