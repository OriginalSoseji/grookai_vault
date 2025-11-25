import { getLivePrice } from './get_live_price_worker.mjs';

async function main() {
  const cardPrintId = process.argv[2];
  const force = process.argv.includes('--force');

  if (!cardPrintId) {
    console.error('Usage: node backend/pricing/get_live_price_cli.mjs <card_print_id> [--force]');
    process.exit(1);
  }

  try {
    const result = await getLivePrice(cardPrintId, { force_refresh: force });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[get_live_price_cli] Failed:', err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[get_live_price_cli] Unhandled failure:', err);
  process.exitCode = 1;
});
