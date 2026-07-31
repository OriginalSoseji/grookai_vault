import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // These React compiler diagnostics were not part of the pre-upgrade lint
      // contract. Adopt them separately from the security framework upgrade.
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/provisional/getPublicProvisionalCards.ts",
      "src/lib/provisional/getProvisionalPromotionContinuity.ts",
      "src/lib/provisional/getPromotionTransitionState.ts",
      "src/lib/provisional/getRecentlyConfirmedCanonicalCards.ts",
      "src/lib/warehouse/**/*.{ts,tsx}",
      "src/app/founder/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='canon_warehouse_candidates']",
          message:
            "SECURITY: public code must not access canon_warehouse_candidates directly. Use getPublicProvisionalCards.",
        },
        {
          selector:
            "TemplateElement[value.raw=/canon_warehouse_candidates/]",
          message:
            "SECURITY: public code must not access canon_warehouse_candidates directly. Use getPublicProvisionalCards.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
