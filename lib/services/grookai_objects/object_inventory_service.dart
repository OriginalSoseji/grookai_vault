import 'package:supabase_flutter/supabase_flutter.dart';
import '../gvvi/vendor_pricing_workspace_service.dart';

/// Reuses the existing owner-scoped, paginated exact inventory read. This does
/// not require Vendor Mode, publish copies, or create a separate inventory.
class ObjectInventoryService {
  const ObjectInventoryService({this.inventory});
  final VendorPricingWorkspaceService? inventory;

  Future<List<Map<String, dynamic>>> load(SupabaseClient client) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null) return const [];
    final data =
        await (inventory ??
                VendorPricingWorkspaceService(
                  client: client,
                  includeSections: false,
                  toleratePriceFailure: true,
                ))
            .load();
    if (client.auth.currentUser?.id != userId) {
      throw StateError('Account changed while loading Objects.');
    }
    return data.rows
        .map(
          (copy) => <String, dynamic>{
            'instance_id': copy.instanceId,
            'gv_vi_id': copy.gvviId,
            'vault_item_id': copy.vaultItemId,
            'card_id': copy.cardPrintId,
            'card_printing_id': copy.isGraded ? null : copy.cardPrintingId,
            'gv_id': copy.gvId,
            'name': copy.displayName,
            'set_name': copy.setName,
            'set_code': copy.setCode,
            'number': copy.number,
            'image_url': copy.imageUrl,
            'image_alt_url': copy.fallbackImageUrl,
            'condition_label': copy.isGraded
                ? [
                    copy.gradeCompany,
                    copy.gradeLabel,
                  ].whereType<String>().join(' ').trim()
                : copy.conditionLabel,
            'printing_identity_status': copy.isGraded
                ? 'unavailable'
                : copy.cardPrintingId == null
                ? 'unassigned'
                : 'exact',
            'finish_label': copy.isGraded ? null : copy.printingLabel,
            'market_price': copy.isGraded ? null : copy.marketPrice,
            'asking_price_amount': copy.askingPrice,
            'asking_price_note': copy.askingPriceNote,
            'is_graded': copy.isGraded,
            'owned_count': 1,
          },
        )
        .toList(growable: false);
  }
}
