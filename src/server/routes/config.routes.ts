import { Router } from 'express';
import { configUpload } from '../middleware/upload.middleware.js';
import { ok } from '../utils/api-response.js';

const router = Router();

// POST /api/config/export — export wizard state as JSON/YAML
router.post('/export', (_req, res) => {
  ok(res, {}, 'Config export not implemented yet (CHECKLIST §3).');
});

// POST /api/config/import — import + validate an uploaded config file
// Accepts multipart field `file` (.json/.yaml/.yml/.csv, max 10 MB).
router.post('/import', configUpload.single('file'), (req, res) => {
  ok(
    res,
    { filename: req.file?.originalname ?? null },
    'Config import validation not implemented yet (CHECKLIST §3).',
  );
});

export default router;
