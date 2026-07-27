-- MARKET-REFERENCE-TCGDEX-RAW-SNAPSHOT-SUPPORT-V1
-- Extends the internal market_reference_* warehouse so TCGdex reference pricing
-- candidates can preserve raw source-card payloads before lifecycle projection.

alter table public.market_reference_acquisition_runs
  drop constraint if exists market_reference_acquisition_runs_source_phase_check;

alter table public.market_reference_acquisition_runs
  add constraint market_reference_acquisition_runs_source_phase_check check (
    source_phase in (
      'MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1',
      'MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1',
      'MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1',
      'MEE-06D_FREE_REFERENCE_COVERAGE_GAP_V1',
      'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1'
    )
  );

alter table public.market_reference_raw_snapshots
  drop constraint if exists market_reference_raw_snapshots_source_check;

alter table public.market_reference_raw_snapshots
  add constraint market_reference_raw_snapshots_source_check check (
    source in (
      'tcgcsv_reference',
      'pokemontcg_io_reference',
      'tcgdex_reference'
    )
  );

alter table public.market_reference_raw_snapshots
  drop constraint if exists market_reference_raw_snapshots_object_type_check;

alter table public.market_reference_raw_snapshots
  add constraint market_reference_raw_snapshots_object_type_check check (
    source_object_type in (
      'tcgcsv_group_products',
      'tcgcsv_group_prices',
      'tcgcsv_product',
      'tcgcsv_price_row',
      'pokemontcg_card',
      'tcgdex_raw_import_card'
    )
  );
