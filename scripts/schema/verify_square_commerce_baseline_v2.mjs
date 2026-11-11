// Read-only starting baseline with exactly the three byte-pinned, local-only
// catalog candidates present. Never a candidate release or production apply gate.
import {runSquareStartingBaselineAudit} from './verify_square_baseline_v1.mjs';
runSquareStartingBaselineAudit({commerceScope:true}).catch(()=>{
  console.error('square_commerce_baseline_precondition_failed');process.exitCode=1;
});
