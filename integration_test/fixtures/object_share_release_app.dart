// Offline physical-device acceptance entry point. Build with --release in an
// isolated bundle; never replace a signed-in app or initialize a backend here.
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';

void main() {
  if (!kReleaseMode) {
    throw StateError('Sharing acceptance must run in release mode.');
  }
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;
  runApp(
    const MaterialApp(
      home: LotPricingScreen(
        source: GrookaiLotListingSource(
          title: 'Release share acceptance',
          items: [
            GrookaiLotListingItemSource(
              cardName: 'Sample copy A',
              cardPrintId: 'offline-same-parent',
              gvviId: 'OFFLINE-COPY-A',
              condition: 'Raw NM',
              price: 12,
              marketPrice: 10,
            ),
            GrookaiLotListingItemSource(
              cardName: 'Sample copy B',
              cardPrintId: 'offline-same-parent',
              gvviId: 'OFFLINE-COPY-B',
              condition: 'Raw LP',
              price: 8,
              marketPrice: 9,
            ),
          ],
        ),
        metadata: {
          'gvvi_ids': ['OFFLINE-COPY-A', 'OFFLINE-COPY-B'],
        },
      ),
    ),
  );
}
