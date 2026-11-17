import { Quiz } from '../models/Quiz.js';
import { learningService } from '../services/learning/learningService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const generateQuiz = async (req, res, next) => {
  try {
    const { documentIds, difficulty = 'medium', questionType = 'mcq', questionCount = 5 } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return sendError(res, 'Please select at least one document to generate a quiz.', 400);
    }

    const quiz = await learningService.generateQuiz({
      documentIds,
      userId: req.user.id,
      difficulty,
      questionType,
      questionCount,
      userPreferences: req.user.apiKeyPreferences,
    });

    return sendSuccess(res, { quiz }, 'Quiz generated successfully.', 201);
  } catch (error) {
    logger.error(`Error generating quiz: ${error.message}`);
    next(error);
  }
};

export const getQuizzes = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const quizzes = await Quiz.find(query)
      .select('title documentNames difficulty questionType questionCount score percentage status completedAt createdAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { quizzes });
  } catch (error) {
    next(error);
  }
};

export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!quiz) {
      return sendError(res, 'Quiz not found.', 404);
    }

    return sendSuccess(res, { quiz });
  } catch (error) {
    next(error);
  }
};

export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return sendError(res, 'Please provide answers array.', 400);
    }

    const quiz = await learningService.submitQuiz({
      quizId: req.params.id,
      userId: req.user.id,
      answers,
    });

    return sendSuccess(res, { quiz }, 'Quiz submitted and graded successfully.');
  } catch (error) {
    logger.error(`Error submitting quiz: ${error.message}`);
    next(error);
  }
};

export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!quiz) {
      return sendError(res, 'Quiz not found.', 404);
    }

    return sendSuccess(res, { id: req.params.id }, 'Quiz deleted successfully.');
  } catch (error) {
    next(error);
  }
};

