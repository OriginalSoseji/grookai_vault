// backend/sets/sets_health_report.mjs
//
// Generates a markdown report summarizing candidate sets/card tables.
// Probes a fixed list of tables directly (no information_schema reliance).

import fs from 'fs';
import path from 'path';
import { createBackendClient } from '../supabase_backend_client.mjs';

async function main() {
  console.log('[sets-health] sets_health_report start');

  const supabase = createBackendClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const reportDir = 'reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  const reportPath = path.join(reportDir, `sets_health_${timestamp}.md`);

  const candidateTables = [
    'sets',
    'card_sets',
    'card_prints',
    'card_print_faces',
    'card_faces',
    'cards',
  ];

  let md = `# Sets Health Report\nGenerated at: ${timestamp}\n\n`;
  md += '## Candidate Tables (probed directly)\n';

  for (const name of candidateTables) {
    let rowCount = null;
    let columns = null;
    let note = '';

    try {
      const { error: countError, count } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        note = `Error counting rows: ${countError.message ?? countError.code}`;
      } else {
        rowCount = count ?? 0;

        const { data: sampleRows, error: sampleError } = await supabase
          .from(name)
          .select('*')
          .limit(1);

        if (sampleError) {
          note = `Error fetching sample row: ${
            sampleError.message ?? sampleError.code
          }`;
        } else if (sampleRows && sampleRows.length > 0) {
          columns = Object.keys(sampleRows[0]);
        }
      }
    } catch (err) {
      note = `Exception while probing table: ${err.message ?? err}`;
    }

    // If we clearly hit a "relation does not exist" scenario, skip it quietly.
    if (note && note.includes('relation') && note.includes('does not exist')) {
      console.log(`[sets-health] skipping ${name}: ${note}`);
      continue;
    }

    md += `\n### ${name}\n`;
    md += `- Rows: ${rowCount !== null ? rowCount : 'Unknown'}\n`;
    md += `- Columns: ${columns ? columns.join(', ') : 'Unknown'}\n`;
    if (note) {
      md += `- Note: ${note}\n`;
    }
  }

  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`[sets-health] report written: ${reportPath}`);
}

main().catch((err) => {
  console.error('[sets-health] Unhandled error:', err);
  process.exit(1);
});
