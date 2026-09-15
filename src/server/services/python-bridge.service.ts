import { spawn } from 'node:child_process';

export interface RunPythonOptions {
  /** Kill the process after this many milliseconds (default: 5 minutes). */
  timeoutMs?: number;
  /** Binary to invoke (default: `python`). */
  pythonBin?: string;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Minimal bridge for running Python helpers in src/scripts/.
 * Uses JSON over stdio; streams large data via files, not memory.
 * Rejects on non-zero exit, spawn errors, or timeout (process is killed).
 */
export function runPythonScript(
  script: string,
  args: string[] = [],
  options: RunPythonOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pythonBin = options.pythonBin ?? 'python';

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (err: Error | null, result?: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(result ?? '');
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`Python timed out after ${timeoutMs}ms: ${script}`));
    }, timeoutMs);
    timer.unref?.();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) finish(null, stdout);
      else finish(new Error(`Python exited with ${code}: ${stderr}`));
    });
    child.on('error', (err) => {
      finish(new Error(`Failed to spawn Python (${pythonBin}): ${err.message}`));
    });
  });
}
