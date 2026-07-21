import { main } from "../../backend/card_descriptions/card_visual_search_eligibility_v1.mjs";

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
