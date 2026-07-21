import { main } from "../../backend/card_descriptions/card_visual_corpus_v1_inventory.mjs";

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

