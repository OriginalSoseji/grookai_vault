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
          label: finishLabel,
        );
      }
      final printingGvId = _trimmedVaultPrintingValue(row['printing_gv_id']);
      return VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.exact,
        label: printingGvId ?? 'Variant assigned',
      );
    case 'unassigned':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.unassigned,
        label: 'Variant needed',
      );
    case 'partially_unassigned':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.partiallyUnassigned,
        label: 'Some variants needed',
      );
    case 'mixed':
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.mixed,
        label: 'Mixed variants',
      );
    default:
      return const VaultPrintingIdentityPresentation(
        status: VaultPrintingIdentityStatus.unavailable,
        label: 'Variant unavailable',
      );
  }
}

String? _trimmedVaultPrintingValue(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  return normalized.isEmpty ? null : normalized;
}

String formatVaultVariantLabel(
  dynamic value, {
  String fallback = 'Variant not recorded',
}) {
  var normalized = (value ?? '').toString().trim();
  if (normalized.toLowerCase().startsWith('printing:')) {
    normalized = normalized.substring('printing:'.length).trim();
  }
  return switch (normalized.toLowerCase()) {
    '' => fallback,
    'printing not recorded' => 'Variant not recorded',
    'printing unassigned' => 'Variant needed',
    'printing partially unassigned' => 'Some variants needed',
    'printing status unavailable' => 'Variant unavailable',
    'exact printing assigned' => 'Variant assigned',
    'mixed printings' => 'Mixed variants',
    _ => normalized,
  };
}
