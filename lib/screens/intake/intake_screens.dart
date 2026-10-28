import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/card_print.dart';
import '../../services/intake/intake_models.dart';
import '../../services/intake/intake_service.dart';
import '../../services/intake/intake_controller.dart';
import '../../services/intake/intake_draft_store.dart';
import '../../services/intake/intake_cost_allocation.dart';
import '../../services/public/public_card_printing_options_service.dart';
import '../../services/public/card_surface_pricing_service.dart';
import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/scanner_v5/scanner_upload_preparation.dart';
import '../scanner_v5/scan_capture_v5_screen.dart';
import '../printing/lot_label_print_screen.dart';

part 'intake_home_screen.dart';
part 'purchase_lot_editor.dart';
part 'intake_batch_screen.dart';
part 'intake_item_editor.dart';
part 'intake_cost_review_screen.dart';
part 'intake_crop_screen.dart';
part 'purchase_lots_screen.dart';
part 'intake_inventory_screen.dart';

void _error(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error.toString().replaceFirst('Bad state: ', ''))),
    );
List<String> _tags(String input) => input
    .split(',')
    .map((s) => s.trim())
    .where((s) => s.isNotEmpty)
    .toSet()
    .take(40)
    .toList();
Widget _field(
  TextEditingController controller,
  String label, {
  bool money = false,
  int lines = 1,
}) => Padding(
  padding: const EdgeInsets.only(bottom: 14),
  child: TextField(
    controller: controller,
    maxLines: lines,
    keyboardType: money
        ? const TextInputType.numberWithOptions(decimal: true)
        : null,
    decoration: InputDecoration(
      labelText: label,
      border: const OutlineInputBorder(),
    ),
  ),
);
