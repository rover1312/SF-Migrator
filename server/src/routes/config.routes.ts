import { Router } from 'express';

const router = Router();

// Placeholder route - to be implemented
router.post('/export', (req, res) => {
  res.json({ success: true, config: {} });
});

router.post('/import', (req, res) => {
  res.json({ success: true, message: 'Config imported' });
});

export default router;
