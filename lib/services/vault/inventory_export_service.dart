import 'package:supabase_flutter/supabase_flutter.dart';
import 'inventory_export.dart';

class InventoryExportService {
  InventoryExportService(this.client);
  final SupabaseClient client;
  String? get ownerId => client.auth.currentUser?.id;
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);

  Future<InventoryExport> read(String expectedOwner) async {
    if (ownerId != expectedOwner) throw StateError('owner_changed');
    final data = await client.rpc('vault_inventory_export_v1');
    if (ownerId != expectedOwner) throw StateError('owner_changed');
    return InventoryExport.parse(expectedOwner, data);
  }

  static String errorMessage(Object error) {
    if (error is PostgrestException) {
      if (error.message.contains('inventory_export_too_many_copies')) {
        return 'This collection exceeds the current export limit of 20,000 copies. No file was created.';
      }
      if (error.message.contains('inventory_export_too_large')) {
        return 'This collection exceeds the current export file size limit. No file was created.';
      }
      if (error.code == 'PGRST202' || error.code == '42883') {
        return 'Inventory export is not available on this server yet.';
      }
    }
    return 'Your complete inventory could not be loaded. Please retry; no file was created.';
  }
}
