export type SquareCloudRecoveryResult = {
  runId: string | null;
  status: 'paused' | 'succeeded' | 'failed';
  succeeded: number;
  failed: number;
  skipped: number;
  targetsChecked: number;
  errorCode: string;
  resumedTerminalRun?: boolean;
};

// Production callers use the verified server environment and shared SDK.
// JavaScript-only factory injection is reserved for the offline qualification.
export function runSquareCloudRecovery(): Promise<SquareCloudRecoveryResult>;
