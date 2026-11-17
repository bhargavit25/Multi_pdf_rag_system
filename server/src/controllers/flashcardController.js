import { FlashcardSet } from '../models/FlashcardSet.js';
import { learningService } from '../services/learning/learningService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentIds, title, count = 10 } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return sendError(res, 'Please select at least one document to generate flashcards.', 400);
    }

    const flashcardSet = await learningService.generateFlashcards({
      documentIds,
      userId: req.user.id,
      title,
      count,
      userPreferences: req.user.apiKeyPreferences,
    });

    return sendSuccess(res, { flashcardSet }, 'Flashcards generated successfully.', 201);
  } catch (error) {
    logger.error(`Error generating flashcards: ${error.message}`);
    next(error);
  }
};

export const getFlashcardSets = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const flashcardSets = await FlashcardSet.find(query)
      .select('title documentNames totalCards knownCount needPracticeCount createdAt updatedAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { flashcardSets });
  } catch (error) {
    next(error);
  }
};

export const getFlashcardSetById = async (req, res, next) => {
  try {
    const flashcardSet = await FlashcardSet.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!flashcardSet) {
      return sendError(res, 'Flashcard set not found.', 404);
    }

    return sendSuccess(res, { flashcardSet });
  } catch (error) {
    next(error);
  }
};

export const updateFlashcardSet = async (req, res, next) => {
  try {
    const { title, cards } = req.body;

    const flashcardSet = await learningService.updateFlashcardSet({
      setId: req.params.id,
      userId: req.user.id,
      title,
      cards,
    });

    return sendSuccess(res, { flashcardSet }, 'Flashcard set updated successfully.');
  } catch (error) {
    logger.error(`Error updating flashcard set: ${error.message}`);
    next(error);
  }
};

export const deleteFlashcardSet = async (req, res, next) => {
  try {
    const flashcardSet = await FlashcardSet.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!flashcardSet) {
      return sendError(res, 'Flashcard set not found.', 404);
    }

    return sendSuccess(res, { id: req.params.id }, 'Flashcard set deleted successfully.');
  } catch (error) {
    next(error);
  }
};

