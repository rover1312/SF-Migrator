import { Router } from 'express';
import { ok } from '../utils/api-response.js';

const router = Router();

// GET /api/fields/describe/:objectName?orgId=...
router.get('/describe/:objectName', (req, res) => {
  ok(res, [], `Field describe for ${req.params.objectName} not implemented yet (CHECKLIST §11).`);
});

export default router;
