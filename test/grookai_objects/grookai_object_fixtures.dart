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

GrookaiObject fourImageLotFixture(GrookaiObjectSkin skin) {
  final data = LotListingData(
    skin: skin,
    listingNo: 'DRAFT',
    title: 'Four Card Test Lot',
    items: const [
      LotItem(
        cardName: 'Dunsparce',
        condition: 'Raw NM',
        price: 5,
        imageUrl: 'https://example.test/dunsparce.webp',
      ),
      LotItem(
        cardName: 'Pikachu',
        condition: 'Raw NM',
        price: 12,
        imageUrl: 'https://example.test/pikachu.webp',
      ),
      LotItem(
        cardName: 'Charizard ex',
        condition: 'Raw NM',
        price: 20,
        imageUrl: 'https://example.test/charizard.webp',
      ),
      LotItem(
        cardName: 'Cosmic Eclipse Pikachu',
        condition: 'Raw LP',
        price: 18,
        imageUrl: 'https://example.test/cosmic-pikachu.webp',
      ),
    ],
    bundlePrice: 45,
    sellerHandle: 'Collector',
    sellerRating: 0,
    sellerTradeCount: 0,
  );
  return GrookaiObject(
    type: 'lot',
    skin: skin,
    layout: 'lot.v1',
    fields: data.toFields(),
    metadata: const {'fixture': true},
  );
}

GrookaiObject twelveImageLotFixture(GrookaiObjectSkin skin) {
  final data = LotListingData(
    skin: skin,
    listingNo: 'LOT12',
    title: '12-Card Vault Lot',
    items: [
      for (var index = 0; index < 12; index += 1)
        LotItem(
          cardName: 'Card ${index + 1}',
          condition: index.isEven ? 'Raw NM' : 'Raw LP',
          price: index + 1,
          imageUrl: 'https://example.test/card-${index + 1}.webp',
        ),
    ],
    bundlePrice: 78,
    sellerHandle: 'Collector',
    sellerRating: 0,
    sellerTradeCount: 0,
  );
  return GrookaiObject(
    type: 'lot',
    skin: skin,
    layout: 'lot.v1',
    fields: data.toFields(),
    metadata: const {'fixture': true},
  );
}
