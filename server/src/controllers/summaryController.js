import { Summary } from '../models/Summary.js';
import { learningService } from '../services/learning/learningService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const generateSummary = async (req, res, next) => {
  try {
    const { documentIds, summaryType = 'short' } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return sendError(res, 'Please select at least one document to summarize.', 400);
    }

    const summary = await learningService.generateSummary({
      documentIds,
      userId: req.user.id,
      summaryType,
      userPreferences: req.user.apiKeyPreferences,
    });

    return sendSuccess(res, { summary }, 'Summary generated successfully.', 201);
  } catch (error) {
    logger.error(`Error generating summary: ${error.message}`);
    next(error);
  }
};

export const getSummaries = async (req, res, next) => {
  try {
    const { search, type } = req.query;
    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (type) {
      query.summaryType = type;
    }

    const summaries = await Summary.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, { summaries });
  } catch (error) {
    next(error);
  }
};

export const getSummaryById = async (req, res, next) => {
  try {
    const summary = await Summary.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!summary) {
      return sendError(res, 'Summary not found.', 404);
    }

    return sendSuccess(res, { summary });
  } catch (error) {
    next(error);
  }
};

export const deleteSummary = async (req, res, next) => {
  try {
    const summary = await Summary.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!summary) {
      return sendError(res, 'Summary not found.', 404);
    }

    return sendSuccess(res, { id: req.params.id }, 'Summary deleted successfully.');
  } catch (error) {
    next(error);
  }
};

