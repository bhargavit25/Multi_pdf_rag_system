import express from 'express';
import { getHealth, getUserStats } from '../controllers/healthController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/stats', protect, getUserStats);

export default router;
