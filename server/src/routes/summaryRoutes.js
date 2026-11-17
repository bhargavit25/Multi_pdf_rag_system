import express from 'express';
import {
  generateSummary,
  getSummaries,
  getSummaryById,
  deleteSummary,
} from '../controllers/summaryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/generate', generateSummary);
router.get('/', getSummaries);
router.get('/:id', getSummaryById);
router.delete('/:id', deleteSummary);

export default router;

