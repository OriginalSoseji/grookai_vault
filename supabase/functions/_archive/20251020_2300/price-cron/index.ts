// Archived copy of price-cron (providers TODO)
export default {
  async fetch() {
    return new Response(JSON.stringify({ status: 'archived' }), { headers: { 'Content-Type': 'application/json' } })
  }
};
