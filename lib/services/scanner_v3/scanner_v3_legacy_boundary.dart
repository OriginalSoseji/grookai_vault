/// Legacy scanner V3 authority boundary.
///
/// The fixed-slot scanner reset keeps these concepts compile-safe for
/// diagnostics and rollback, but they are not the production authority model.
/// Production scanner work should target FIXED_SLOT_CAPTURE_SCANNER_V1.
class ScannerV3LegacyBoundary {
  const ScannerV3LegacyBoundary._();

  static const String productionDirection = 'FIXED_SLOT_CAPTURE_SCANNER_V1';

  static const List<String> legacyNonProductionAuthorities = <String>[
    'dynamic_detector_boundary_identity',
    'tap_selected_live_identity',
    'live_vote_state_lock_authority',
  ];

  static const List<String> preservedInfrastructure = <String>[
    'ann_identity_service',
    'full_db_index_builder',
    'embedding_index_format',
    'latency_harness',
    'crop_transport',
    'scanner_telemetry',
  ];
}
