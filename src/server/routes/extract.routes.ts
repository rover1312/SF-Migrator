import { Router } from 'express';
import { ok } from '../utils/api-response.js';
import { extractionService } from '../services/extraction.service.js';

const router = Router();

// POST /api/extract/start
router.post('/start', async (_req, res) => {
  const job = await extractionService.start();
  ok(res, job);
});

// GET /api/extract/status
router.get('/status', (_req, res) => {
  ok(res, { status: 'idle' });
});

export default router;
