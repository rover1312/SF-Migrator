import { Router } from 'express';
import { ok } from '../utils/api-response.js';

const router = Router();

// GET /api/objects/list?orgId=...
router.get('/list', (_req, res) => {
  ok(res, [], 'Object discovery not implemented yet (CHECKLIST §10).');
});

export default router;
