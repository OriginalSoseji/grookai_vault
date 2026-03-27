import {
  VERSION_FINISH_DECISIONS,
  VERSION_FINISH_REASON_CODES,
  interpretVersionVsFinish,
} from './version_finish_interpreter_v1.mjs';

const TEST_CASES = [
  {
    label: 'Exeggcute (Poke Ball Pattern)',
    input: {
      source: 'justtcg',
      setCode: 'sv8pt5',
      cardNumber: '1',
      canonicalFinishCandidate: 'pokeball',
      upstreamCardId: 'pokemon-sv-prismatic-evolutions-exeggcute-poke-ball-pattern-common',
      upstreamName: 'Exeggcute (Poke Ball Pattern)',
      observedPrintings: ['Holofoil'],
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: true,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.CHILD,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.FINISH_ONLY_ALLOWED,
  },
  {
    label: 'Exeggcute (Master Ball Pattern)',
    input: {
      source: 'justtcg',
      setCode: 'sv8pt5',
      cardNumber: '1',
      canonicalFinishCandidate: 'masterball',
      upstreamCardId: 'pokemon-sv-prismatic-evolutions-exeggcute-master-ball-pattern-common',
      upstreamName: 'Exeggcute (Master Ball Pattern)',
      observedPrintings: ['Holofoil'],
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: true,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.CHILD,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.FINISH_ONLY_ALLOWED,
  },
  {
    label: 'Energy Symbol Pattern',
    input: {
      source: 'justtcg',
      setCode: 'me02.5',
      cardNumber: '001',
      canonicalFinishCandidate: 'energy-symbol-pattern',
      upstreamCardId: 'pokemon-me-ascended-heroes-erika-s-oddish-energy-symbol-pattern-common',
      upstreamName: "Erika's Oddish (Energy Symbol Pattern)",
      observedPrintings: ['Reverse Holofoil'],
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: false,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.BLOCKED,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.UNSUPPORTED_FINISH_VOCAB,
  },
  {
    label: 'First Edition',
    input: {
      source: 'justtcg',
      setCode: 'base1',
      cardNumber: '4',
      canonicalFinishCandidate: null,
      upstreamCardId: 'base-charizard-first-edition',
      upstreamName: 'Charizard (First Edition)',
      observedPrintings: ['Holofoil'],
      isDifferentIssuedVersion: true,
      isFinishOnly: false,
      isRepresentableFinish: false,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.ROW,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.DIFFERENT_ISSUED_VERSION,
  },
  {
    label: 'Staff Stamp',
    input: {
      source: 'justtcg',
      setCode: 'swshp',
      cardNumber: 'SWSH242',
      canonicalFinishCandidate: null,
      upstreamCardId: 'comfey-staff',
      upstreamName: 'Comfey (Staff)',
      observedPrintings: ['Holofoil'],
      isDifferentIssuedVersion: true,
      isFinishOnly: false,
      isRepresentableFinish: false,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.ROW,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.DIFFERENT_ISSUED_VERSION,
  },
  {
    label: 'Unknown weird suffix from upstream',
    input: {
      source: 'justtcg',
      setCode: 'sv99',
      cardNumber: '999',
      canonicalFinishCandidate: null,
      upstreamCardId: 'mystery-card-weird-suffix',
      upstreamName: 'Mystery Card (Weird Suffix)',
      observedPrintings: ['Normal'],
      isDifferentIssuedVersion: false,
      isFinishOnly: false,
      isRepresentableFinish: false,
    },
    expectedDecision: VERSION_FINISH_DECISIONS.BLOCKED,
    expectedReasonCode: VERSION_FINISH_REASON_CODES.PATTERN_ONLY_UNPROVEN,
  },
];

function printResult(testCase, result, passed) {
  console.log(`\n=== TEST CASE ===`);
  console.log(`label: ${testCase.label}`);
  console.log(`expectedDecision: ${testCase.expectedDecision}`);
  console.log(`expectedReasonCode: ${testCase.expectedReasonCode}`);
  console.log(`decision: ${result.decision}`);
  console.log(`reasonCode: ${result.reasonCode}`);
  console.log(`resolvedFinishKey: ${result.resolvedFinishKey ?? 'null'}`);
  console.log(`needsPromotionReview: ${result.needsPromotionReview}`);
  console.log(`status: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`explanation: ${result.explanation}`);
}

async function main() {
  let failures = 0;

  for (const testCase of TEST_CASES) {
    const result = interpretVersionVsFinish(testCase.input);
    const passed =
      result.decision === testCase.expectedDecision && result.reasonCode === testCase.expectedReasonCode;

    if (!passed) {
      failures += 1;
    }

    printResult(testCase, result, passed);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`total: ${TEST_CASES.length}`);
  console.log(`passed: ${TEST_CASES.length - failures}`);
  console.log(`failed: ${failures}`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

await main();
