import express from 'express';
import {
  generateFlashcards,
  getFlashcardSets,
  getFlashcardSetById,
  updateFlashcardSet,
  deleteFlashcardSet,
} from '../controllers/flashcardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/generate', generateFlashcards);
router.get('/', getFlashcardSets);
router.get('/:id', getFlashcardSetById);
router.patch('/:id', updateFlashcardSet);
router.delete('/:id', deleteFlashcardSet);

export default router;

