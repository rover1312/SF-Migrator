import { runPythonScript } from '../../src/server/services/python-bridge.service';

// No Python on this machine's PATH, so exercise the bridge logic with Node
// standing in for the child process binary.
const NODE = process.execPath;

describe('python-bridge', () => {
  it('rejects when the binary cannot be spawned', async () => {
    await expect(
      runPythonScript('whatever.py', [], { pythonBin: '__nonexistent-binary__', timeoutMs: 5000 }),
    ).rejects.toThrow(/Failed to spawn/);
  });

  it('resolves stdout on exit 0', async () => {
    const out = await runPythonScript('-e', ['console.log("hi")'], {
      pythonBin: NODE,
      timeoutMs: 15000,
    });
    expect(out.trim()).toBe('hi');
  }, 20000);

  it('rejects on non-zero exit', async () => {
    await expect(
      runPythonScript('-e', ['process.exit(3)'], { pythonBin: NODE, timeoutMs: 15000 }),
    ).rejects.toThrow(/exited with 3/);
  }, 20000);
});
