import { Router } from 'express';
import { ok } from '../utils/api-response.js';

const router = Router();

// POST /api/auth/org — authenticate an org (OAuth or username/password)
router.post('/org', (_req, res) => {
  ok(res, { connected: false }, 'Auth not implemented yet (CHECKLIST §8-9).');
});

export default router;
