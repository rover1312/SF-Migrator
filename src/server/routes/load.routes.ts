import { Router } from 'express';
import { ok } from '../utils/api-response.js';
import { loadingService } from '../services/loading.service.js';

const router = Router();

// POST /api/load/start
router.post('/start', async (_req, res) => {
  const job = await loadingService.start();
  ok(res, job);
});

// GET /api/load/status
router.get('/status', (_req, res) => {
  ok(res, { status: 'idle' });
});

export default router;
