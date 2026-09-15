import { Router } from 'express';
import { ok } from '../utils/api-response.js';

const router = Router();

// POST /api/validate/permissions
router.post('/permissions', (_req, res) => {
  ok(res, { passed: true, issues: [] }, 'Validation not implemented yet (CHECKLIST §16).');
});

export default router;
