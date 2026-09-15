import { Router } from 'express';
import { configService } from '../services/config.service';
import { validationService } from '../services/validation.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

// POST /api/validate/permissions — body: { targetOrgId, config, operation? }
router.post('/permissions', async (req, res) => {
  const {
    targetOrgId,
    config: migrationConfig,
    operation,
  } = req.body as {
    targetOrgId?: string;
    config?: unknown;
    operation?: 'insert' | 'update' | 'upsert';
  };
  if (!targetOrgId || !migrationConfig) {
    fail(res, 400, 'BAD_REQUEST', 'targetOrgId and config are required');
    return;
  }
  const outcome = configService.validate(migrationConfig);
  if (!outcome.valid || !outcome.config) {
    fail(res, 400, 'INVALID_CONFIG', 'Migration config is invalid', outcome.errors);
    return;
  }
  try {
    ok(res, await validationService.validateTarget(targetOrgId, outcome.config, operation));
  } catch (err) {
    fail(res, 400, 'VALIDATION_FAILED', (err as Error).message);
  }
});

export default router;
