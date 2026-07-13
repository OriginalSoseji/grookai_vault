import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

GrookaiObject memoryCardFixture(GrookaiObjectSkin skin) {
  final data = MemoryCardData(
    skin: skin,
    card: const CardObjectRef(
      cardName: 'Umbreon VMAX',
      setLine: 'Evolving Skies - Secret Rare',
    ),
    listingNo: '001',
    date: DateTime.utc(2026, 7, 12),
    location: 'Denver card show',
    storyText: 'Pulled this after one last pack at closing time.',
    authorName: 'Cesar',
  );
  return GrookaiObject(
    type: 'memory',
    skin: skin,
    layout: 'memory.v1',
    fields: data.toFields(),
    metadata: const {'fixture': true},
  );
}

GrookaiObject saleCardFixture(GrookaiObjectSkin skin) {
  final data = SaleListingData(
    skin: skin,
    card: const CardObjectRef(
      cardName: 'Charizard ex',
      setLine: '151 - Special Illustration Rare',
    ),
    listingNo: '014',
    price: 185,
    firm: true,
    condition: 'Raw NM',
    quantity: 1,
    sellerHandle: 'grookai',
    sellerRating: 4.9,
    sellerTradeCount: 37,
    allowDms: true,
  );
  return GrookaiObject(
    type: 'sale',
    skin: skin,
    layout: 'sale.v1',
    fields: data.toFields(),
    metadata: const {'fixture': true},
  );
}

GrookaiObject lotCardFixture(GrookaiObjectSkin skin) {
  final data = LotListingData(
    skin: skin,
    listingNo: '027',
    title: 'Mixed SIR Lot',
    items: const [
      LotItem(cardName: 'Pikachu ex', condition: 'Raw NM', price: 120),
      LotItem(cardName: 'Mew ex', condition: 'Raw LP', price: 82),
      LotItem(cardName: 'Gardevoir ex', condition: 'Raw NM', price: 64),
      LotItem(cardName: 'Zapdos ex', condition: 'Raw NM', price: 58),
      LotItem(cardName: 'Erika Invitation', condition: 'Raw LP', price: 45),
      LotItem(cardName: 'Blastoise ex', condition: 'Raw NM', price: 70),
      LotItem(cardName: 'Venusaur ex', condition: 'Raw NM', price: 66),
      LotItem(cardName: 'Alakazam ex', condition: 'Raw NM', price: 40),
      LotItem(cardName: 'Charmander', condition: 'Raw LP', price: 32),
    ],
    bundlePrice: 475,
    sellerHandle: 'grookai',
    sellerRating: 4.9,
    sellerTradeCount: 37,
  );
  return GrookaiObject(
    type: 'lot',
    skin: skin,
    layout: 'lot.v1',
    fields: data.toFields(),
    metadata: const {'fixture': true},
  );
}
