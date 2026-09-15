import { Router } from 'express';
import { salesforceService } from '../services/salesforce.service';
import { fail, ok } from '../utils/api-response';
import { runWithConcurrency } from '../utils/retry';

const router = Router();

// GET /api/objects/list?orgId=...&includeCounts=true
router.get('/list', async (req, res) => {
  const orgId = req.query.orgId as string | undefined;
  if (!orgId) {
    fail(res, 400, 'BAD_REQUEST', 'orgId query param is required');
    return;
  }
  try {
    const objects = await salesforceService.describeObjects(orgId);
    if (req.query.includeCounts === 'true') {
      const withCounts = await runWithConcurrency(objects, 5, async (obj) => {
        try {
          return { ...obj, recordCount: await salesforceService.getRecordCount(orgId, obj.name) };
        } catch {
          return { ...obj, recordCount: undefined };
        }
      });
      ok(res, withCounts);
      return;
    }
    ok(res, objects);
  } catch (err) {
    fail(res, 502, 'SF_API_ERROR', (err as Error).message);
  }
});

// GET /api/objects/:name/count?orgId=...
router.get('/:name/count', async (req, res) => {
  const orgId = req.query.orgId as string | undefined;
  if (!orgId) {
    fail(res, 400, 'BAD_REQUEST', 'orgId query param is required');
    return;
  }
  try {
    ok(res, { count: await salesforceService.getRecordCount(orgId, req.params.name) });
  } catch (err) {
    fail(res, 502, 'SF_API_ERROR', (err as Error).message);
  }
});

export default router;
