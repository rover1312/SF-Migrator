import { Router } from 'express';
import { salesforceService } from '../services/salesforce.service';
import { fail, ok } from '../utils/api-response';

const router = Router();

// GET /api/fields/describe/:objectName?orgId=...
router.get('/describe/:objectName', async (req, res) => {
  const orgId = req.query.orgId as string | undefined;
  if (!orgId) {
    fail(res, 400, 'BAD_REQUEST', 'orgId query param is required');
    return;
  }
  try {
    ok(res, await salesforceService.describeFields(orgId, req.params.objectName));
  } catch (err) {
    fail(res, 502, 'SF_API_ERROR', (err as Error).message);
  }
});

export default router;
