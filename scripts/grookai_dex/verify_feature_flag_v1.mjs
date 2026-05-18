const publicFlag = process.env.NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED;
const serverFlag = process.env.GROOKAI_DEX_V1_ENABLED;

const enabled = publicFlag === 'true' || serverFlag === 'true';
const invalidValues = [
  ['NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED', publicFlag],
  ['GROOKAI_DEX_V1_ENABLED', serverFlag],
].filter(([, value]) => value !== undefined && value !== 'true' && value !== 'false');

const report = {
  contract: 'GROOKAI_DEX_V1',
  enabled,
  flags: {
    NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED: publicFlag ?? null,
    GROOKAI_DEX_V1_ENABLED: serverFlag ?? null,
  },
  status: invalidValues.length === 0 ? 'PASS' : 'FAIL',
  invalid_values: invalidValues.map(([name, value]) => ({ name, value })),
};

console.log(JSON.stringify(report, null, 2));

if (report.status !== 'PASS') {
  process.exitCode = 1;
}
