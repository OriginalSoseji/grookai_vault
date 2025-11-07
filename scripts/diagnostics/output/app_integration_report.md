# App Integration Audit

## Inventory
### image_best.dart usages
lib\widgets\big_card_image.dart:3:import "image_best.dart";
lib\widgets\big_card_image.dart.bak_20251004_134356:2:import "image_best.dart";
lib\widgets\thumb_from_row.dart:3:import "image_best.dart";
lib\widgets\thumb_from_row.dart.bak_20251004_134356:2:import "image_best.dart";


### thumb_url references
lib\features\wall\create_listing_page.dart:117:      final thumbUrl = (fn.data is Map && (fn.data as Map)['thumb_url'] != null)
lib\features\wall\create_listing_page.dart:118:          ? (fn.data as Map)['thumb_url'] as String
lib\features\wall\create_listing_page.dart:125:        'thumb_url': thumbUrl,
lib\models\wall_feed_item.dart:63:      thumbUrl: m['thumb_url']?.toString(),
lib\widgets\image_best.dart:33:    row['thumb_url'] ?? row['image_best'] ?? row['image_url'] ?? row['photo_url'] ?? row['image'],

### GlowChip / GlowButton usages
lib\features\home\home_page.dart:95:                          GlowChip(
lib\ui\widgets\glow_chip.dart:3:class GlowChip extends StatelessWidget {
lib\ui\widgets\glow_chip.dart:7:  const GlowChip({super.key, required this.label, this.selected = false, this.onTap});

lib\features\dev\diagnostics_page.dart:40:                  ? GlowButton(
lib\ui\widgets\glow_button.dart:3:class GlowButton extends StatelessWidget {
lib\ui\widgets\glow_button.dart:7:  const GlowButton({super.key, required this.child, this.onPressed, this.focused = false});

### kUseGlowWidgets imports
lib\features\scan\scan_entry.dart:2:import 'package:grookai_vault/config/flags.dart';
lib\features\pricing\card_detail_page.dart:14:import 'package:grookai_vault/config/flags.dart';
lib\ui\app\routes.dart:20:import '../../config/flags.dart';
lib\ui\components\profile_button.dart:3:import 'package:grookai_vault/config/flags.dart';
lib\ui\components\app_nav.dart:10:import 'package:grookai_vault/config/flags.dart';
lib\services\scan_metrics.dart:2:import '../config/flags.dart';
lib\features\scanner\scan_controller.dart:9:import '../../config/flags.dart';
lib\features\dev\diagnostics_page.dart:6:import 'package:grookai_vault/config/flags.dart';
lib\features\home\home_page.dart:5:import 'package:grookai_vault/config/flags.dart';
lib\features\dev\diagnostics\pricing_health_chip.dart:4:import 'package:grookai_vault/config/flags.dart';
lib\features\search\unified_search_sheet.dart:14:import 'package:grookai_vault/config/flags.dart';

lib\config\flags.dart:52:const bool kUseGlowWidgets = true;
lib\features\dev\diagnostics_page.dart:39:              child: (kUseGlowWidgets
lib\features\home\home_page.dart:94:                        if (kUseGlowWidgets)

### Create Listing page routing
lib\ui\app\routes.dart:28:import '../../features/wall/create_listing_page.dart';
lib\features\explore\explore_feed_page.dart:13:import '../wall/create_listing_page.dart';

lib\features\debug\dev_admin_page.dart:77:              onPressed: () => Navigator.of(context).pushNamed('/create-listing'),
lib\ui\app\route_names.dart:20:  static const String createListing = '/create-listing';

lib\ui\app\routes.dart:96:    if (kDebugMode || kProfileMode) RouteNames.createListing: (_) => const CreateListingPage(),
lib\features\explore\explore_feed_page.dart:148:                  MaterialPageRoute(builder: (_) => const CreateListingPage()),
lib\features\wall\create_listing_page.dart:9:class CreateListingPage extends StatefulWidget {
lib\features\wall\create_listing_page.dart:10:  const CreateListingPage({super.key});
lib\features\wall\create_listing_page.dart:12:  State<CreateListingPage> createState() => _CreateListingPageState();
lib\features\wall\create_listing_page.dart:15:class _CreateListingPageState extends State<CreateListingPage> {

### Dev overlay long-press / toggle
lib\dev\dev_overlay.dart:6:class DevOverlay extends StatelessWidget {
lib\dev\dev_overlay.dart:9:  const DevOverlay({super.key, required this.child, this.show = true});
lib\dev\dev_overlay.dart:19:      valueListenable: DevOverlay.enabled,
lib\ui\app\app.dart:30:          child: DevOverlay(
lib\ui\components\app_nav.dart:70:          DevOverlay.toggle();

lib\ui\components\app_nav.dart:68:        onLongPress: () {
lib\features\explore\explore_feed_page.dart:130:          onLongPress: () {

### Wall/Feed tile widget
lib\ui\app\routes.dart:24:import '../../features/wall/wall_feed_page.dart';

lib\ui\app\routes.dart:30:import '../../features/explore/explore_feed_page.dart';

lib\features\explore\explore_feed_page.dart:183:        return CardFrame(
lib\features\explore\widgets\card_frame.dart:6:class CardFrame extends StatelessWidget {
lib\features\explore\widgets\card_frame.dart:11:  const CardFrame({


### pubspec.yaml dep hints (not modified)
name: grookai_vault
description: "A new Flutter project."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: ^3.9.0

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  supabase_flutter: ^2.10.1
  http: ^1.5.0
  image_picker: ^1.2.0
  camera: ^0.11.0
  google_mlkit_text_recognition: ^0.14.0
  image: ^4.2.0
  path_provider: ^2.1.4
  permission_handler: ^11.3.1
  fl_chart: ^1.1.0
  intl: ^0.20.2
  package_info_plus: ^9.0.0
  cached_network_image: ^3.4.1
  flutter_dotenv: ^5.1.0
  shared_preferences: ^2.3.2
  url_launcher: ^6.3.0
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.4
  flutter_lints: ^6.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/kit_placeholder.png
    - .env


## Changes Applied
- lib/ui/components/app_nav.dart: AppBar title long-press toggles DevOverlay
- lib/dev/dev_overlay.dart: added static toggle ValueNotifier and wiring
- lib/models/wall_feed_item.dart: added thumbUrl support; prefer thumb via toImageUrl
- lib/services/image_resolver.dart: toImageUrl tries public and listing-photos buckets
- lib/features/dev/diagnostics_page.dart: uses GlowButton when kUseGlowWidgets
- .vscode/tasks.json: added Flutter run task for device R5CY71V9ETR

## What to expect in-app
- Wall/Explore feed prefers thumbnails when available (falls back to TCGDex)
- Home movers show GlowChip for =5% (already wired)
- Long-press title toggles dev overlay (Material app bar)
- FAB on Explore and Dev Admin button open Create Listing form (debug/profile)

## Pricing & Comps Wiring
- Backend: added guarded views and grants in supabase/migrations/20251103_pricing_contract.sql (latest_card_prices_v, sold_comps_v, card_index_history())
- Flutter: PriceService already wired to views and ebay_sold_engine; CardDetailVM loads prices, floors, GV baseline, history, and sold5.
- UI: CardDetail shows PriceCard + RecentSalesList; Home movers use GlowChip (kUseGlowWidgets).

What to expect in-app:
- Card Detail shows current price + trend.
- Recent Sales list displays up to 5 eBay comps.
- Home movers reflect the same price source.


- CardDetail: added 'View all' to open RecentSalesSheet (full comps)
