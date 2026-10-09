import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { ChatSession } from '../models/ChatSession.js';
import { getVectorStore } from '../services/vector/index.js';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/env.js';

export const getHealth = async (req, res) => {
  let dbStatus = 'disconnected';
  if (mongoose.connection.readyState === 1) dbStatus = 'connected';
  else if (mongoose.connection.readyState === 2) dbStatus = 'connecting';

  let vectorDbStatus = 'unknown';
  let vectorDbInfo = null;

  try {
    const vectorStore = await getVectorStore();
    vectorDbInfo = await vectorStore.getStats();
    vectorDbStatus = 'connected';
  } catch (err) {
    vectorDbStatus = 'degraded';
  }

  return sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      type: 'MongoDB',
      status: dbStatus,
    },
    vectorStore: {
      provider: config.vectorStoreProvider,
      status: vectorDbStatus,
      info: vectorDbInfo,
    },
    llm: {
      provider: config.llmProvider,
      model: config.llmModel,
      isConfigured: Boolean(config.llmApiKey),
    },
    uptime: process.uptime(),
  });
};

export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalDocuments, readyDocuments, totalChats, documents, recentChats] = await Promise.all([
      Document.countDocuments({ userId }),
      Document.countDocuments({ userId, status: 'Ready' }),
      ChatSession.countDocuments({ userId }),
      Document.find({ userId }).sort({ createdAt: -1 }).limit(5).select('-chunks'),
      ChatSession.find({ userId }).sort({ updatedAt: -1 }).limit(5).select('title updatedAt messages createdAt'),
    ]);

    // Aggregate total pages and chunks
    const aggregation = await Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPages: { $sum: '$pageCount' },
          totalChunks: { $sum: '$chunkCount' },
          totalSizeBytes: { $sum: '$fileSize' },
        },
      },
    ]);

    const statsTotals = aggregation[0] || { totalPages: 0, totalChunks: 0, totalSizeBytes: 0 };

    let totalMessages = 0;
    const allUserChats = await ChatSession.find({ userId }).select('messages');
    allUserChats.forEach((c) => {
      totalMessages += (c.messages || []).length;
    });

    return sendSuccess(res, {
      totalDocuments,
      readyDocuments,
      totalChats,
      totalPages: statsTotals.totalPages,
      totalChunks: statsTotals.totalChunks,
      totalSizeBytes: statsTotals.totalSizeBytes,
      totalMessages,
      recentDocuments: documents,
      recentChats: recentChats.map((c) => ({
        id: c._id,
        title: c.title,
        messageCount: c.messages ? c.messages.length : 0,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};
