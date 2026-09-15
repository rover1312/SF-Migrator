import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { configService } from '../services/config.service';
import { extractionService } from '../services/extraction.service';
import { jobStore } from '../services/jobs';
import { config } from '../utils/config';
import { fail, ok } from '../utils/api-response';

const router = Router();

// POST /api/extract/start — body: { orgId, config }
router.post('/start', async (req, res) => {
  const { orgId, config: migrationConfig } = req.body as { orgId?: string; config?: unknown };
  if (!orgId || !migrationConfig) {
    fail(res, 400, 'BAD_REQUEST', 'orgId and config are required');
    return;
  }
  const outcome = configService.validate(migrationConfig);
  if (!outcome.valid || !outcome.config) {
    fail(res, 400, 'INVALID_CONFIG', 'Migration config is invalid', outcome.errors);
    return;
  }
  try {
    const jobId = await extractionService.start(orgId, outcome.config);
    ok(res, { jobId });
  } catch (err) {
    fail(res, 400, 'EXTRACT_START_FAILED', (err as Error).message);
  }
});

// GET /api/extract/status?id=...
router.get('/status', async (req, res) => {
  const id = req.query.id as string | undefined;
  if (!id) {
    fail(res, 400, 'BAD_REQUEST', 'id query param is required');
    return;
  }
  const job = await jobStore.load(id);
  if (!job || job.kind !== 'extract') {
    fail(res, 404, 'NOT_FOUND', `Unknown extract job: ${id}`);
    return;
  }
  ok(res, job);
});

for (const action of ['pause', 'resume', 'cancel'] as const) {
  router.post(`/${action}`, async (req, res) => {
    const { id } = req.body as { id?: string };
    if (!id) {
      fail(res, 400, 'BAD_REQUEST', 'id is required');
      return;
    }
    try {
      await extractionService[action](id);
      ok(res, await jobStore.load(id));
    } catch (err) {
      fail(res, 400, 'EXTRACT_CONTROL_FAILED', (err as Error).message);
    }
  });
}

// GET /api/extract/files/:jobId — list extracted files.
router.get('/files/:jobId', async (req, res) => {
  try {
    const files = await fs.readdir(path.join(config.extractedDir, req.params.jobId));
    ok(res, files);
  } catch {
    fail(res, 404, 'NOT_FOUND', `No files for job ${req.params.jobId}`);
  }
});

// GET /api/extract/download/:jobId/:file — download one extracted file.
router.get('/download/:jobId/:file', (req, res) => {
  const { jobId, file } = req.params;
  if (file.includes('/') || file.includes('\\') || file.includes('..')) {
    fail(res, 400, 'BAD_REQUEST', 'Invalid filename');
    return;
  }
  res.sendFile(path.resolve(config.extractedDir, jobId, file), (err) => {
    if (err) fail(res, 404, 'NOT_FOUND', `File not found: ${file}`);
  });
});

export default router;
