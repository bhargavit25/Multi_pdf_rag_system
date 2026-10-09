import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    // Don't crash immediately, allow graceful retry or fallback handling
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Attempting to reconnect...');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
  isConnected = true;
});
