import { main } from "../../backend/card_descriptions/card_visual_description_artifact_apply_v1.mjs";

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
