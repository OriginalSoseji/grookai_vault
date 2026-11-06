import "server-only";

import {
  resolveCanonImageV1,
  type CanonImageLike,
} from "@/lib/canon/resolveCanonImageV1";
import { selectCatalogProviderFallbackV1 } from "@/lib/canon/catalogProviderFallbackV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

export type CardDisplayImageKind =
  | "exact"
  | "representative"
  | "missing_variant_visual"
  | "missing"
  | "blocked";

export type CardImageLike = CanonImageLike & {
  id?: string | null;
  card_print_id?: string | null;
  gv_id?: string | null;
  printing_gv_id?: string | null;
  name?: string | null;
  number?: string | null;
  number_plain?: string | null;
  set_code?: string | null;
  variant_key?: string | null;
  printed_identity_modifier?: string | null;
  representative_image_url?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

export type ResolvedCardImageFieldsV1 = {
  image_url: string | null;
  external_image_fallback_url: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  image_source: string | null;
  display_image_url: string | null;
  display_image_kind: CardDisplayImageKind;
  image_path: string | null;
  exact_image_source: "identity" | "external" | "none";
};

const TARGET_IMAGE_STATUSES = new Set([
  "exact",
  "representative_shared",
  "representative_shared_collision",
  "representative_shared_stamp",
  "missing_variant_visual",
  "representative_missing_variant_visual",
  "blocked",
  "missing",
  "unresolved",
]);

const STATUSES_THAT_BLOCK_EXACT_URL = new Set([
  "blocked",
  "missing",
  "unresolved",
]);

const LEGENDARY_TREASURES_RC5_CARD_PRINT_ID =
  "efa15a49-a1f9-46b0-bd69-85111388328e";
const LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS = [
  "00484a4e28a235d9f4a8edcc",
  "images.pokemontcg.io/bw11/5_hires.png",
];
const LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_NOTE =
  "Image blocked: known mismatched Legendary Treasures RC5 Torchic image candidate resolves to Carnivine.";
const KNOWN_BROKEN_TCGDEX_IMAGE_NOTE =
  "Image blocked: known upstream TCGdex asset URL returns 404 and needs a verified replacement.";
const KNOWN_BASE_SET_NORMAL_STAMPED_IMAGE_NOTE =
  "Image withheld: the cataloged Base Set asset is a 1st Edition stamped reference, not verified normal Base Set artwork.";
const POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES: Record<string, string> = {
  "tk-ex-latia": "tk1a",
  "tk-ex-latio": "tk1b",
  "tk-ex-m": "tk2b",
  "tk-ex-p": "tk2a",
  tk2b: "tk2b",
};
const MALIE_TRAINER_KIT_SET_IMAGE_PLANS: Record<
  string,
  { series: string; code: string; folder: string }
> = {
  "tk-bw-z": { series: "BW", code: "TK5A", folder: "TK_Zoroark" },
  "tk-bw-e": { series: "BW", code: "TK5B", folder: "TK_Excadrill" },
  "tk-xy-n": { series: "XY", code: "TK6A", folder: "TK_Noivern" },
  "tk-xy-sy": { series: "XY", code: "TK6B", folder: "TK_Sylveon" },
  "tk-xy-b": { series: "XY", code: "TK7A", folder: "TK_Bisharp" },
  "tk-xy-w": { series: "XY", code: "TK7B", folder: "TK_Wigglytuff" },
  "tk-xy-latio": { series: "XY", code: "TK8A", folder: "TK_Latios" },
  "tk-xy-latia": { series: "XY", code: "TK8B", folder: "TK_Latias" },
  "tk-xy-p": { series: "XY", code: "TK9A", folder: "TK_PikachuLibre" },
  "tk-xy-su": { series: "XY", code: "TK9B", folder: "TK_Suicune" },
  "tk-sm-l": { series: "SM", code: "TK10A", folder: "TK_Lycanroc" },
  "tk-sm-r": { series: "SM", code: "TK10B", folder: "TK_AlolanRaichu" },
};
const TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS: Record<
  string,
  Record<string, string>
> = {
  "tk-dp-l": {
    "1": "https://static.tcgcollector.com/content/images/93/16/8d/93168dd5a846add1c3cb102f8a6f77ff8f9c1aab4885151da791a58248d87ba9.jpg",
    "2": "https://static.tcgcollector.com/content/images/ef/b9/02/efb902c49990f5975121559159a3f4d1fd74a4cea5a9a9257be8856fd3693ba2.jpg",
    "3": "https://static.tcgcollector.com/content/images/b3/a3/0a/b3a30aabb684331e0dcf77938e48f38824e512b1c8ac57d528549eb4a2c4aa2f.jpg",
    "4": "https://static.tcgcollector.com/content/images/eb/39/d1/eb39d12f1690546838338c7e97eff8e5f16e4f26fe405187766f8a60be282ed6.jpg",
    "5": "https://static.tcgcollector.com/content/images/90/8f/9b/908f9b744a59f41c2126f109b27397c0049bf8612e07f52607ac86fef59aa258.jpg",
    "6": "https://static.tcgcollector.com/content/images/49/27/91/49279116e712e0b16f02847c5dc3354916add33110accea1bbe32b937a0ee7a5.jpg",
    "7": "https://static.tcgcollector.com/content/images/bb/98/e1/bb98e184e7e48cd9620650e821fcc0241fe7d2a4b5f816122411936fb1056bb0.jpg",
    "8": "https://static.tcgcollector.com/content/images/a8/55/d1/a855d14fb345de77b171e51b20ce74f635bf10f188143fe3c9b30f74962c1044.jpg",
    "9": "https://static.tcgcollector.com/content/images/25/77/46/257746f616f3977b577257231919e358d49b9b840b7fd89266f417dd98d56748.jpg",
    "10": "https://static.tcgcollector.com/content/images/e2/e9/50/e2e95036f95fae4d7c165194a57082c2cad59cd0e5b8a3d37f0ff6c341a0323f.jpg",
    "11": "https://static.tcgcollector.com/content/images/a1/ce/08/a1ce08c821befe062de15577892f75c460f8d6cdf05f32121d84dd8e390e3278.jpg",
  },
  "tk-dp-m": {
    "1": "https://static.tcgcollector.com/content/images/f3/b8/b6/f3b8b66529d080a6a929725a18cbc16da8c450e165eb4dfe0711c27a55779857.jpg",
    "2": "https://static.tcgcollector.com/content/images/52/62/46/5262464272705ad039f0bf93f591851ed4bb2be8e0d788bf459a6dfabf038aec.jpg",
    "3": "https://static.tcgcollector.com/content/images/0b/21/5d/0b215d49b514b815fc0ff225ac5736a4a82e218fa4ce14cb4fe627b25b79f9ef.jpg",
    "4": "https://static.tcgcollector.com/content/images/86/33/7e/86337e4b3228e16682d288fca2dfffeb71915a6a29249b14465961c89b5f1ae2.jpg",
    "5": "https://static.tcgcollector.com/content/images/05/aa/eb/05aaeb129e27e1e2baefb17bb34fd534dfe264d6fbada0f163deff8deb8f6374.jpg",
    "6": "https://static.tcgcollector.com/content/images/04/d4/0f/04d40fad994ac8ee95301512f4502883852e9dd194ab28304947d5a5bdac2082.jpg",
    "7": "https://static.tcgcollector.com/content/images/2a/48/9d/2a489d5bfcfd30881d065fb1f853a02c508e574fdf982a2fecfec97dc650ae2e.jpg",
    "8": "https://static.tcgcollector.com/content/images/7a/66/ba/7a66baab8e91c12cf8bce2a97a318d91021fd977cdc16fdfb060ef0d1a1c5c09.jpg",
    "9": "https://static.tcgcollector.com/content/images/10/2b/b4/102bb4502de579a480dd7fc584f4c2dca034a4b6c305c6ef50f3f2020e5dcdb2.jpg",
    "10": "https://static.tcgcollector.com/content/images/03/3f/07/033f07092a580df9b082e7112456d568e0585d8e7eee23f0467ec4b8e2a21b90.jpg",
    "11": "https://static.tcgcollector.com/content/images/e8/79/cd/e879cde72f570f31d00039df520d4242cf437a885f1d85e55580bf597625aa03.jpg",
    "12": "https://static.tcgcollector.com/content/images/23/df/a7/23dfa7003966804257a9b93b26c995acf3066976a711a1a7b60cee15a38835b7.jpg",
  },
  "tk-hs-g": {
    "1": "https://static.tcgcollector.com/content/images/8a/4f/f8/8a4ff87f4cd76ddbbd8bb0542bac8e07ed18ba63a1d417da387c0576534f8ecf.jpg",
    "2": "https://static.tcgcollector.com/content/images/7d/0d/2e/7d0d2e334b2f0e78e41b0af4f7491012a55858998330d6e30dcfeeeaa5b8525c.jpg",
    "3": "https://static.tcgcollector.com/content/images/0f/84/ba/0f84baa124117513fc40a0a75cb6ef2144c9594864bdf2d629c4beb6062b6e74.jpg",
    "4": "https://static.tcgcollector.com/content/images/2f/cd/9b/2fcd9b9d7e004d544ad7ef9ddd75d0e772b4740fb403a720201223eb9d65f938.jpg",
    "5": "https://static.tcgcollector.com/content/images/41/74/8d/41748da77b49ab9d23d054fa0504f2850cf9aae66ac5681171c846583e3d1c5c.jpg",
    "6": "https://static.tcgcollector.com/content/images/0c/51/40/0c5140e9920afa7b1faa2fef115aa01902d12f7f33341f62f823173821beefbd.jpg",
    "7": "https://static.tcgcollector.com/content/images/f3/44/1c/f3441cd25a1fd906566b1d4d9b52fb29ecfa7ef047f3c7ea79c498bfdb6c8ab4.jpg",
    "8": "https://static.tcgcollector.com/content/images/56/19/72/5619726d0bb57b6ac0bf2622320e579592e67d87d064f4340aad0d6aaaba0929.jpg",
    "9": "https://static.tcgcollector.com/content/images/bf/00/17/bf0017731d930f8ceb6e9fb01b1572d70968569ecc09be87bd1af8d9fcb5d429.jpg",
    "10": "https://static.tcgcollector.com/content/images/51/3e/7e/513e7e65a9746ceddf0ef9f71c89d12166a51d5f72732fa7f6e3e1291e6de8b8.jpg",
    "11": "https://static.tcgcollector.com/content/images/de/e6/65/dee66574db3e6735750632ed12cf59aa8b9f7acdc4d4ab2911d30fb8a0fa2560.jpg",
    "12": "https://static.tcgcollector.com/content/images/64/c4/ff/64c4ff27f0a7a680b8f311b36336383b14c04fbae318afb1d8255b6079c2d136.jpg",
    "13": "https://static.tcgcollector.com/content/images/0c/00/eb/0c00eb09a379db915f8d28dac28450d30e04c145f059c50f6825bc5c6bafbbe6.jpg",
    "14": "https://static.tcgcollector.com/content/images/9b/de/61/9bde6137594bbf192a05ba055b67eb8e9abbe05c615dc3558ab1f1b357679cc1.jpg",
    "15": "https://static.tcgcollector.com/content/images/87/ca/8e/87ca8e610aa1a7545f4ea00c15b7f9a60c05021d8ba47b72a3e2fce19a403c05.jpg",
    "16": "https://static.tcgcollector.com/content/images/21/fc/e6/21fce636e4ae35b51eb93f306c3c5a7019c3d5852f608ee0831af7ee961308b0.jpg",
    "17": "https://static.tcgcollector.com/content/images/36/8f/13/368f1360228a1179aaded4e55b206528e6b1e1c1749ffd9b538922a45786e528.jpg",
    "18": "https://static.tcgcollector.com/content/images/c3/12/2e/c3122eabfbe721d870e51469674f4f2fe80df26096cee7de1361386acfca04f1.jpg",
    "19": "https://static.tcgcollector.com/content/images/7a/ab/16/7aab16ef35c595fd25c08a9e28be2ff4de58b020361afb8f74dbc89bec68cdfc.jpg",
    "20": "https://static.tcgcollector.com/content/images/57/c4/81/57c481f36dcb032ffd7f4dac803b26d5e907bc89b760b405844e742a8209d6e8.jpg",
    "21": "https://static.tcgcollector.com/content/images/50/c4/66/50c466b24f6f0c6fb4a9b577ae0330ed409961fb23a95510af478e3978ac919d.jpg",
    "22": "https://static.tcgcollector.com/content/images/d6/23/62/d6236251c2a17a8fd9a0587952df534826843673d1126a48bd6db7812af3064d.jpg",
    "23": "https://static.tcgcollector.com/content/images/68/d1/41/68d141c1d61b020dc63f2c8a2ca11d942f5c218ba0a50ae83b6c64eba000f23f.jpg",
    "24": "https://static.tcgcollector.com/content/images/b7/f8/b7/b7f8b73e2b4002411b137e40764203a7d2add6ae5f6f220ca36ed0299b45f6df.jpg",
    "25": "https://static.tcgcollector.com/content/images/da/0c/e0/da0ce03e37a242bd2c7762f835d6d80ad7e0907a78ea5524a4e393b9d6005229.jpg",
    "26": "https://static.tcgcollector.com/content/images/10/e8/32/10e832300a5fc1356e3fff88295e1c80b117dfaa3c11c78a5779f9aeb83b440d.jpg",
    "27": "https://static.tcgcollector.com/content/images/9c/f6/7a/9cf67a7010da2c99f0e4316f582765abec4715337af7057a59e08ab5dd99681c.jpg",
    "28": "https://static.tcgcollector.com/content/images/df/64/18/df641865ed28c59f476021559bb970480a8a8b424cd14ae22c0beb80d244b867.jpg",
    "29": "https://static.tcgcollector.com/content/images/5d/c7/33/5dc733902468e566bafc7d53b6cb457d2c1ac2453e072048bb34a75d4fc126bc.jpg",
    "30": "https://static.tcgcollector.com/content/images/bd/10/5e/bd105e357d3fe36e0734fe01897d855fb87c4f326b07162c948845f8d04d56d1.jpg",
  },
  "tk-hs-r": {
    "1": "https://static.tcgcollector.com/content/images/3f/5f/07/3f5f0786c60f959da41b03fa94692e8c2ae29cba7beba2cb16828818f0c9d05c.jpg",
    "2": "https://static.tcgcollector.com/content/images/30/1f/de/301fde5d35e2465c1abf36ba27c4521d6f7eabdc28f5a57a32dd8440dca55184.jpg",
    "3": "https://static.tcgcollector.com/content/images/a0/17/dd/a017dd43d9e717bde2a1a510309c7d5ed9fd78d6b4edf3a06d7eb8ede2893c18.jpg",
    "4": "https://static.tcgcollector.com/content/images/43/8b/ac/438bacfc94e2fd2ed64cec19fec6ec5329f77320eefea061225043952d66b2c7.jpg",
    "5": "https://static.tcgcollector.com/content/images/79/19/93/791993dfdeffe0e87b3b653f37229a31cadb04b707499c3fbab156b9b61f753c.jpg",
    "6": "https://static.tcgcollector.com/content/images/5e/3f/35/5e3f35f8dc968eb2b1f82d070cc7765a0724914874d704e68e9e5f34725ff5d6.jpg",
    "7": "https://static.tcgcollector.com/content/images/64/0c/c5/640cc51c097b17ac75eab37032d567126722a14e8832f184a7c07654ba8bd35b.jpg",
    "8": "https://static.tcgcollector.com/content/images/6e/86/28/6e86286372ecf80d67e9fa5e83235784e3b86c0d169646c1e2a54bf1b6b304ae.jpg",
    "9": "https://static.tcgcollector.com/content/images/f6/cb/a4/f6cba4821074442e68843215cfa28b7b0e14bdc5f4eedf2e210bc4e375489b5d.jpg",
    "10": "https://static.tcgcollector.com/content/images/5b/83/5b/5b835bb3c4f786e85c1f8c8cecc6f43aeb618de41c0fa750486d17518b557e39.jpg",
    "11": "https://static.tcgcollector.com/content/images/a7/50/82/a750829daeeb65178cee9a355242a9d7a70981fad9d436539e0b1bcb46df5677.jpg",
    "12": "https://static.tcgcollector.com/content/images/3a/30/e9/3a30e91475616ef7b0ec6e187bb33e4b242914717d78bc37c0e7796cc17f2c48.jpg",
    "13": "https://static.tcgcollector.com/content/images/8d/3c/82/8d3c8282d7b01bc20837ff8fc78ff8bfe697af4aa679d2170fac43888c7c6c57.jpg",
    "14": "https://static.tcgcollector.com/content/images/d6/e5/88/d6e58885e23cbdf9249101837ed2aa3e4a6a01d40c6f05ea2ce700cf3bb07026.jpg",
    "15": "https://static.tcgcollector.com/content/images/c5/6d/0f/c56d0f834101df66c00a10ac39edb754214ae8493d6edca30a30578d3d9f9bf5.jpg",
    "16": "https://static.tcgcollector.com/content/images/50/00/db/5000dbcd11da4e30ab0f94167fc254cf94dabdeb865f91edb83bcdbd385ce990.jpg",
    "17": "https://static.tcgcollector.com/content/images/90/b6/8c/90b68cb9b8786315735257f7af3e643311d829503541d147cc2a192df3ca6ea7.jpg",
    "18": "https://static.tcgcollector.com/content/images/6e/28/a1/6e28a1411e0c062fe74c6384c359955efec3e4ebd69c31dbb8469137d894e98e.jpg",
    "19": "https://static.tcgcollector.com/content/images/f4/75/e5/f475e52be4dcd901f984a255bd6c05ddff1c73970a5e1fafd9012ed8535865ce.jpg",
    "20": "https://static.tcgcollector.com/content/images/c2/52/34/c2523456db6d3880d16833c747071ef4fabd3758774dfe67d305c07808e1fbd4.jpg",
    "21": "https://static.tcgcollector.com/content/images/40/a4/14/40a414d91e0bbc717fa3704816e93eb26af348c71e601a55a06515d2385c3596.jpg",
    "22": "https://static.tcgcollector.com/content/images/2d/16/80/2d16805d59423cf107d2783b87bc74aad2990d26e255c2a00608da7a73d71d84.jpg",
    "23": "https://static.tcgcollector.com/content/images/9b/d8/f8/9bd8f82861efb3a1b2f71adac22a746748eb9d6a35b1bbfff10a93b7b5f8328f.jpg",
    "24": "https://static.tcgcollector.com/content/images/1e/9c/d6/1e9cd6f1704d73066d2762199a2b023a4a90e1907801a679e9eb0f4072a9e049.jpg",
    "25": "https://static.tcgcollector.com/content/images/54/66/a7/5466a70de0d2a6a1fba47e75061838bafe80650b977a1f57d452052aaa92d684.jpg",
    "26": "https://static.tcgcollector.com/content/images/f7/97/7f/f7977fe9169e4791ae7baa96233d232ff7d37ae39b08ec3722ec1f676293c819.jpg",
    "27": "https://static.tcgcollector.com/content/images/2a/fa/e9/2afae936d92ec1438a2972dc5f95f39cd50bad61aa5d79195721c8101a4d70bb.jpg",
    "28": "https://static.tcgcollector.com/content/images/41/a6/5d/41a65d4be249549a863307286ce1422de67c9d49a89ded59624959dd2c719433.jpg",
    "29": "https://static.tcgcollector.com/content/images/d5/4d/dd/d54dddbf5e17fafe0cbb744f86214ce8fffe133c6566fbd52fb993ab5e8d537c.jpg",
    "30": "https://static.tcgcollector.com/content/images/fe/77/0b/fe770be4ee80bea2314359951eeff5a644bc58098bd2688ed24d08985c200c4c.jpg",
  },
};

type SourceBackedReplacementImage = {
  url: string;
  image_source: string;
  image_status: "exact" | "representative_shared";
  image_note: string;
  display_image_kind: "exact" | "representative";
};

function normalizeTextOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeRepresentativeImageUrl(value: unknown) {
  return getBestPublicCardImageUrl(normalizeTextOrNull(value)) ?? null;
}

function textIncludesAny(value: unknown, patterns: readonly string[]) {
  const normalized = normalizeLowerOrNull(value);
  return normalized
    ? patterns.some((pattern) => normalized.includes(pattern))
    : false;
}

function isLegendaryTreasuresRc5Torchic(
  cardPrint: CardImageLike | null | undefined,
) {
  const id = normalizeLowerOrNull(cardPrint?.id);
  const cardPrintId = normalizeLowerOrNull(cardPrint?.card_print_id);
  const gvId = normalizeLowerOrNull(cardPrint?.gv_id);
  const printingGvId = normalizeLowerOrNull(cardPrint?.printing_gv_id);
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const name = normalizeLowerOrNull(cardPrint?.name);
  const number = normalizeLowerOrNull(cardPrint?.number);

  return (
    id === LEGENDARY_TREASURES_RC5_CARD_PRINT_ID ||
    cardPrintId === LEGENDARY_TREASURES_RC5_CARD_PRINT_ID ||
    gvId === "gv-pk-ltr-rc5" ||
    printingGvId?.startsWith("gv-pk-ltr-rc5-") ||
    (setCode === "bw11" && name === "torchic" && number === "rc5")
  );
}

function hasKnownWrongLegendaryTreasuresRc5ImageReference(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    textIncludesAny(
      cardPrint?.image_path,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.image_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.image_alt_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    ) ||
    textIncludesAny(
      cardPrint?.representative_image_url,
      LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_PATTERNS,
    )
  );
}

function isKnownWrongLegendaryTreasuresRc5Image(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    isLegendaryTreasuresRc5Torchic(cardPrint) &&
    hasKnownWrongLegendaryTreasuresRc5ImageReference(cardPrint)
  );
}

function isKnownStampedNormalBaseSetImage(cardPrint: CardImageLike | null | undefined) {
  return (
    cardPrint?.set_code === "base1" &&
    !normalizeTextOrNull(cardPrint?.variant_key) &&
    !normalizeTextOrNull(cardPrint?.printed_identity_modifier) &&
    (cardPrint?.image_url?.includes("assets.tcgdex.net/en/base/base1/") ?? false)
  );
}

function isKnownBrokenTcgdexImageUrl(value: unknown) {
  const normalized = normalizeLowerOrNull(value);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("assets.tcgdex.net/en/tk/") ||
    normalized.includes("assets.tcgdex.net/en/mc/2021swsh/") ||
    normalized.includes("assets.tcgdex.net/en/ex/ex5.5/")
  );
}

function hasKnownBrokenTcgdexImageReference(
  cardPrint: CardImageLike | null | undefined,
) {
  return (
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_path) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_url) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.image_alt_url) ||
    isKnownBrokenTcgdexImageUrl(cardPrint?.representative_image_url)
  );
}

function getNumericCardNumber(cardPrint: CardImageLike | null | undefined) {
  const number = normalizeTextOrNull(cardPrint?.number);
  if (number && /^\d+$/.test(number)) {
    return String(Number(number));
  }

  const numberPlain = normalizeTextOrNull(cardPrint?.number_plain);
  if (numberPlain && /^\d+$/.test(numberPlain)) {
    return String(Number(numberPlain));
  }

  return null;
}

function getPaddedNumericCardNumber(cardPrint: CardImageLike | null | undefined) {
  const number = getNumericCardNumber(cardPrint);
  return number ? number.padStart(3, "0") : null;
}

function slugForMalieTrainerKitImage(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const slug = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019`]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return slug.length > 0 ? slug : null;
}

function getMalieTrainerKitReplacementImageUrl(
  cardPrint: CardImageLike | null | undefined,
) {
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const plan = setCode ? MALIE_TRAINER_KIT_SET_IMAGE_PLANS[setCode] : null;
  const number = getPaddedNumericCardNumber(cardPrint);
  const nameSlug = slugForMalieTrainerKitImage(cardPrint?.name);

  if (!plan || !number || !nameSlug) {
    return null;
  }

  return `https://cdn.malie.io/file/malie-io/art/cards/jpg/en_US/${encodeURIComponent(plan.series)}/${encodeURIComponent(plan.code)}-${encodeURIComponent(plan.folder)}/en_US-${encodeURIComponent(plan.code)}-${encodeURIComponent(number)}-${encodeURIComponent(nameSlug)}.jpg`;
}

function getTcgCollectorTrainerKitReplacementImageUrl(
  cardPrint: CardImageLike | null | undefined,
) {
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const number = getNumericCardNumber(cardPrint);

  return setCode && number
    ? TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS[setCode]?.[number] ?? null
    : null;
}

function getSourceBackedReplacementImage(
  cardPrint: CardImageLike | null | undefined,
): SourceBackedReplacementImage | null {
  const setCode = normalizeLowerOrNull(cardPrint?.set_code);
  const number = getNumericCardNumber(cardPrint);

  if (
    setCode === "2021swsh" &&
    number &&
    Number(number) >= 1 &&
    Number(number) <= 25
  ) {
    return {
      url: `https://images.pokemontcg.io/mcd21/${encodeURIComponent(number)}_hires.png`,
      image_source: "pokemonapi",
      image_status: "exact",
      image_note:
        "Source-backed replacement: PokemonTCG image used because the TCGdex asset URL returns 404.",
      display_image_kind: "exact",
    };
  }

  const trainerKitPokemonTcgSetCode = setCode
    ? POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES[setCode]
    : null;
  if (trainerKitPokemonTcgSetCode && number) {
    return {
      url: `https://images.pokemontcg.io/${encodeURIComponent(trainerKitPokemonTcgSetCode)}/${encodeURIComponent(number)}_hires.png`,
      image_source: "pokemonapi",
      image_status: "exact",
      image_note:
        "Source-backed replacement: PokemonTCG image used because the TCGdex asset URL returns 404.",
      display_image_kind: "exact",
    };
  }

  const malieTrainerKitReplacementUrl =
    getMalieTrainerKitReplacementImageUrl(cardPrint);
  if (malieTrainerKitReplacementUrl) {
    return {
      url: malieTrainerKitReplacementUrl,
      image_source: "external",
      image_status: "representative_shared",
      image_note:
        "Source-backed representative display: Malie Trainer Kit image used because the upstream TCGdex asset is missing or unavailable.",
      display_image_kind: "representative",
    };
  }

  const tcgCollectorTrainerKitReplacementUrl =
    getTcgCollectorTrainerKitReplacementImageUrl(cardPrint);
  if (tcgCollectorTrainerKitReplacementUrl) {
    return {
      url: tcgCollectorTrainerKitReplacementUrl,
      image_source: "external",
      image_status: "representative_shared",
      image_note:
        "Source-backed representative display: TCG Collector Trainer Kit image used because no exact owned image is cataloged yet.",
      display_image_kind: "representative",
    };
  }

  return null;
}

function buildSourceBackedReplacementFields(
  replacementImage: SourceBackedReplacementImage,
): ResolvedCardImageFieldsV1 {
  if (replacementImage.image_status === "exact") {
    return {
      image_url: replacementImage.url,
      external_image_fallback_url: null,
      representative_image_url: null,
      image_status: replacementImage.image_status,
      image_note: replacementImage.image_note,
      image_source: replacementImage.image_source,
      display_image_url: replacementImage.url,
      display_image_kind: replacementImage.display_image_kind,
      image_path: null,
      exact_image_source: "external",
    };
  }

  return {
    image_url: null,
    external_image_fallback_url: null,
    representative_image_url: replacementImage.url,
    image_status: replacementImage.image_status,
    image_note: replacementImage.image_note,
    image_source: replacementImage.image_source,
    display_image_url: replacementImage.url,
    display_image_kind: replacementImage.display_image_kind,
    image_path: null,
    exact_image_source: "none",
  };
}

function normalizeImageStatus(
  value: unknown,
  exactImageUrl: string | null,
  representativeImageUrl: string | null,
) {
  const normalized = normalizeLowerOrNull(value);

  if (normalized && TARGET_IMAGE_STATUSES.has(normalized)) {
    return normalized;
  }

  if (normalized === "ok") {
    return "exact";
  }

  if (!normalized) {
    if (exactImageUrl) {
      return "exact";
    }

    if (representativeImageUrl) {
      return "representative_shared";
    }

    return "missing";
  }

  return normalized;
}

function getDisplayKindFromStatus(
  imageStatus: string | null,
  fallbackKind: CardDisplayImageKind,
): CardDisplayImageKind {
  if (imageStatus === "exact") {
    return "exact";
  }

  if (
    imageStatus === "missing_variant_visual" ||
    imageStatus === "representative_missing_variant_visual"
  ) {
    return "missing_variant_visual";
  }

  if (imageStatus?.startsWith("representative_")) {
    return "representative";
  }

  if (imageStatus === "blocked") {
    return "blocked";
  }

  if (imageStatus === "missing" || imageStatus === "unresolved") {
    return "missing";
  }

  return fallbackKind;
}

export async function resolveCardImageFieldsV1(
  cardPrint: CardImageLike | null | undefined,
): Promise<ResolvedCardImageFieldsV1> {
  if (isKnownStampedNormalBaseSetImage(cardPrint)) {
    return {
      image_url: null,
      external_image_fallback_url: null,
      representative_image_url: null,
      image_status: "missing",
      image_note:
        normalizeTextOrNull(cardPrint?.image_note) ??
        KNOWN_BASE_SET_NORMAL_STAMPED_IMAGE_NOTE,
      image_source: normalizeTextOrNull(cardPrint?.image_source),
      display_image_url: null,
      display_image_kind: "missing",
      image_path: null,
      exact_image_source: "none",
    };
  }

  const exactImage = await resolveCanonImageV1(cardPrint);

  if (isKnownWrongLegendaryTreasuresRc5Image(cardPrint)) {
    return {
      image_url: null,
      external_image_fallback_url: null,
      representative_image_url: null,
      image_status: "blocked",
      image_note:
        normalizeTextOrNull(cardPrint?.image_note) ??
        LEGENDARY_TREASURES_RC5_BLOCKED_IMAGE_NOTE,
      image_source: normalizeTextOrNull(cardPrint?.image_source),
      display_image_url: null,
      display_image_kind: "blocked",
      image_path: null,
      exact_image_source: "none",
    };
  }

  if (hasKnownBrokenTcgdexImageReference(cardPrint) && !exactImage.url) {
    const replacementImage = getSourceBackedReplacementImage(cardPrint);
    if (replacementImage) {
      return buildSourceBackedReplacementFields(replacementImage);
    }

    return {
      image_url: null,
      external_image_fallback_url: null,
      representative_image_url: null,
      image_status: "blocked",
      image_note:
        normalizeTextOrNull(cardPrint?.image_note) ??
        KNOWN_BROKEN_TCGDEX_IMAGE_NOTE,
      image_source: normalizeTextOrNull(cardPrint?.image_source),
      display_image_url: null,
      display_image_kind: "blocked",
      image_path: null,
      exact_image_source: "none",
    };
  }

  const exactImageUrl = exactImage.url ?? null;
  const rawExternalImageUrl = getBestPublicCardImageUrl(
    cardPrint?.image_url,
    cardPrint?.image_alt_url,
  ) ?? null;
  const representativeImageUrl = normalizeRepresentativeImageUrl(
    cardPrint?.representative_image_url,
  );
  const imageStatus = normalizeImageStatus(
    cardPrint?.image_status,
    exactImageUrl,
    representativeImageUrl,
  );
  const imageNote = normalizeTextOrNull(cardPrint?.image_note);
  const imageSource = normalizeTextOrNull(cardPrint?.image_source);
  const providerFallbackCandidate = selectCatalogProviderFallbackV1({
    imageStatus,
    externalImageUrl: rawExternalImageUrl,
    representativeImageUrl,
  });
  const externalImageFallbackUrl =
    exactImage.source === "identity" &&
    Boolean(exactImage.image_path) &&
    providerFallbackCandidate &&
    providerFallbackCandidate !== exactImageUrl &&
    !STATUSES_THAT_BLOCK_EXACT_URL.has(imageStatus ?? "") &&
    !hasKnownBrokenTcgdexImageReference(cardPrint)
      ? providerFallbackCandidate
      : null;
  const exactDisplayKind = getDisplayKindFromStatus(imageStatus, "exact");
  const exactImageUrlIsUsable =
    Boolean(exactImageUrl) &&
    !STATUSES_THAT_BLOCK_EXACT_URL.has(imageStatus ?? "");

  if (exactImageUrlIsUsable) {
    return {
      image_url: exactImageUrl,
      external_image_fallback_url: externalImageFallbackUrl,
      representative_image_url: representativeImageUrl,
      image_status: imageStatus,
      image_note: imageNote,
      image_source: imageSource,
      display_image_url: exactImageUrl,
      display_image_kind: exactDisplayKind,
      image_path: exactImage.image_path,
      exact_image_source: exactImage.source,
    };
  }

  if (representativeImageUrl) {
    return {
      image_url: null,
      external_image_fallback_url: externalImageFallbackUrl,
      representative_image_url: representativeImageUrl,
      image_status: imageStatus,
      image_note: imageNote,
      image_source: imageSource,
      display_image_url: representativeImageUrl,
      display_image_kind: "representative",
      image_path: exactImage.image_path,
      exact_image_source: exactImage.source,
    };
  }

  const replacementImage = getSourceBackedReplacementImage(cardPrint);
  if (replacementImage) {
    return buildSourceBackedReplacementFields(replacementImage);
  }

  return {
    image_url: null,
    external_image_fallback_url: externalImageFallbackUrl,
    representative_image_url: null,
    image_status: imageStatus,
    image_note: imageNote,
    image_source: imageSource,
    display_image_url: null,
    display_image_kind: "missing",
    image_path: exactImage.image_path,
    exact_image_source: exactImage.source,
  };
}
