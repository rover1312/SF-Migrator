import { Router } from 'express';
import path from 'node:path';
import { configService } from '../services/config.service';
import { jobStore } from '../services/jobs';
import { loadingService } from '../services/loading.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

// POST /api/load/start — body: { targetOrgId, extractJobId, config }
router.post('/start', async (req, res) => {
  const {
    targetOrgId,
    extractJobId,
    config: migrationConfig,
  } = req.body as {
    targetOrgId?: string;
    extractJobId?: string;
    config?: unknown;
  };
  if (!targetOrgId || !extractJobId || !migrationConfig) {
    fail(res, 400, 'BAD_REQUEST', 'targetOrgId, extractJobId, and config are required');
    return;
  }
  const outcome = configService.validate(migrationConfig);
  if (!outcome.valid || !outcome.config) {
    fail(res, 400, 'INVALID_CONFIG', 'Migration config is invalid', outcome.errors);
    return;
  }
  try {
    const jobId = await loadingService.start(targetOrgId, extractJobId, outcome.config);
    ok(res, { jobId });
  } catch (err) {
    fail(res, 400, 'LOAD_START_FAILED', (err as Error).message);
  }
});

// GET /api/load/status?id=...
router.get('/status', async (req, res) => {
  const id = req.query.id as string | undefined;
  if (!id) {
    fail(res, 400, 'BAD_REQUEST', 'id query param is required');
    return;
  }
  const job = await jobStore.load(id);
  if (!job || job.kind !== 'load') {
    fail(res, 404, 'NOT_FOUND', `Unknown load job: ${id}`);
    return;
  }
  // Never leak full failed-row payloads in status; report.json has summaries.
  const { state, ...rest } = job;
  void state;
  ok(res, rest);
});

for (const action of ['pause', 'resume', 'cancel'] as const) {
  router.post(`/${action}`, async (req, res) => {
    const { id } = req.body as { id?: string };
    if (!id) {
      fail(res, 400, 'BAD_REQUEST', 'id is required');
      return;
    }
    try {
      await loadingService[action](id);
      ok(res, { id });
    } catch (err) {
      fail(res, 400, 'LOAD_CONTROL_FAILED', (err as Error).message);
    }
  });
}

// POST /api/load/retry — body: { id }
router.post('/retry', async (req, res) => {
  const { id } = req.body as { id?: string };
  if (!id) {
    fail(res, 400, 'BAD_REQUEST', 'id is required');
    return;
  }
  try {
    await loadingService.retryFailed(id);
    ok(res, { id });
  } catch (err) {
    fail(res, 400, 'LOAD_RETRY_FAILED', (err as Error).message);
  }
});

// GET /api/load/report/:id — migration report JSON.
router.get('/report/:id', async (req, res) => {
  const job = await jobStore.load(req.params.id);
  if (!job || job.kind !== 'load') {
    fail(res, 404, 'NOT_FOUND', `Unknown load job: ${req.params.id}`);
    return;
  }
  res.sendFile(path.resolve(jobStore.dirFor(job.id), 'report.json'), (err) => {
    if (err) fail(res, 404, 'NOT_FOUND', 'Report not available yet');
  });
});

// GET /api/load/errors/:id — error rows CSV.
router.get('/errors/:id', async (req, res) => {
  const job = await jobStore.load(req.params.id);
  if (!job || job.kind !== 'load') {
    fail(res, 404, 'NOT_FOUND', `Unknown load job: ${req.params.id}`);
    return;
  }
  res.sendFile(path.resolve(jobStore.dirFor(job.id), 'errors.csv'), (err) => {
    if (err) fail(res, 404, 'NOT_FOUND', 'Error log not available yet');
  });
});

export default router;
