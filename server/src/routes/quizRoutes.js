import express from 'express';
import {
  generateQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
  deleteQuiz,
} from '../controllers/quizController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/generate', generateQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);
router.post('/:id/submit', submitQuiz);
router.delete('/:id', deleteQuiz);

export default router;

