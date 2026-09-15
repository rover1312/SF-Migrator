import { Router } from 'express';
import fs from 'node:fs/promises';
import { configUpload } from '../middleware/upload.middleware';
import { configService } from '../services/config.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

// POST /api/config/export — validate wizard state and return JSON/YAML text.
// Body: { config: MigrationConfig, format: 'json' | 'yaml' }
router.post('/export', (req, res) => {
  const { config, format } = req.body as { config?: unknown; format?: string };
  if (format !== 'json' && format !== 'yaml') {
    fail(res, 400, 'BAD_REQUEST', 'format must be "json" or "yaml"');
    return;
  }
  const outcome = configService.validate(config);
  if (!outcome.valid || !outcome.config) {
    fail(res, 400, 'INVALID_CONFIG', 'Configuration is invalid', outcome.errors);
    return;
  }
  ok(res, configService.exportText(outcome.config, format));
});

// POST /api/config/import — parse + validate an uploaded config file.
// Accepts multipart field `file` (.json/.yaml/.yml, max 10 MB).
router.post('/import', configUpload.single('file'), async (req, res) => {
  if (!req.file) {
    fail(res, 400, 'BAD_REQUEST', 'Missing multipart field "file"');
    return;
  }
  try {
    const text = await fs.readFile(req.file.path, 'utf-8');
    const parsed = configService.parseFileContent(text, req.file.originalname);
    ok(res, { config: parsed, filename: req.file.originalname });
  } catch (err) {
    fail(res, 400, 'INVALID_CONFIG', (err as Error).message);
  } finally {
    await fs.rm(req.file.path, { force: true });
  }
});

export default router;
