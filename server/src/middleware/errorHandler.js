import multer from 'multer';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`API Error: ${err.message}`, err.stack);

  // Multer Error Handling
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'File size too large. Maximum size allowed is 20MB.', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendError(res, `Unexpected form field: ${err.field}`, 400);
    }
    return sendError(res, `Upload error: ${err.message}`, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, `A record with that ${field} already exists.`, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return sendError(res, messages.join(', '), 400, messages);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, `Resource not found with id: ${err.value}`, 404);
  }

  // Generic custom error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode);
};
