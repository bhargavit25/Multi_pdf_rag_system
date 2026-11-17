import mongoose from 'mongoose';
import { ChatSession } from '../models/ChatSession.js';
import { executeRagPipeline } from '../services/rag/ragPipeline.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const handleChatMessage = async (req, res, next) => {
  try {
    const { question, chatId, documentIds = [] } = req.body;

    if (!question || !question.trim()) {
      return sendError(res, 'Please provide a question.', 400);
    }

    // Sanitize documentIds
    const rawDocIds = Array.isArray(documentIds) ? documentIds : [documentIds];
    const validDocumentIds = rawDocIds
      .map((id) => (id ? String(id).trim() : ''))
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    let session = null;
    const cleanChatId =
      chatId && String(chatId).trim() !== 'undefined' && String(chatId).trim() !== 'null'
        ? String(chatId).trim()
        : null;

    if (cleanChatId && mongoose.Types.ObjectId.isValid(cleanChatId)) {
      session = await ChatSession.findOne({ _id: cleanChatId, userId: req.user.id });
    }

    if (!session) {
      // Create new session
      const initialTitle =
        question.trim().slice(0, 45) + (question.trim().length > 45 ? '...' : '');
      session = await ChatSession.create({
        userId: req.user.id,
        title: initialTitle,
        documentIds: validDocumentIds,
        messages: [],
      });
    }

    // Add user message to session
    const userMessage = {
      role: 'user',
      content: question.trim(),
      sources: [],
      createdAt: new Date(),
    };
    session.messages.push(userMessage);

    // Get conversation history for multi-turn RAG
    const conversationHistory = session.messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Active document scope
    const activeDocIds =
      validDocumentIds.length > 0
        ? validDocumentIds
        : (session.documentIds || []).map((id) => String(id));

    // Execute RAG Pipeline
    const ragResult = await executeRagPipeline({
      question: question.trim(),
      userId: req.user.id,
      documentIds: activeDocIds,
      conversationHistory,
      userPreferences: req.user.apiKeyPreferences || {},
    });

    // Add assistant message with citation sources to session
    const assistantMessage = {
      role: 'assistant',
      content: ragResult.answer,
      sources: ragResult.sources || [],
      createdAt: new Date(),
    };
    session.messages.push(assistantMessage);

    await session.save();

    return sendSuccess(res, {
      chatId: session._id,
      title: session.title,
      answer: ragResult.answer,
      sources: ragResult.sources || [],
      message: assistantMessage,
      userMessage,
    });
  } catch (error) {
    logger.error(`Error processing chat message: ${error.message}`);
    next(error);
  }
};

export const getChatSessions = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const sessions = await ChatSession.find(query)
      .select('title documentIds updatedAt createdAt messages')
      .sort({ updatedAt: -1 });

    const formattedSessions = sessions.map((s) => ({
      id: s._id,
      _id: s._id,
      title: s.title,
      documentIds: s.documentIds,
      messageCount: s.messages ? s.messages.length : 0,
      lastMessage:
        s.messages && s.messages.length > 0
          ? s.messages[s.messages.length - 1].content.slice(0, 80)
          : '',
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    return sendSuccess(res, { sessions: formattedSessions });
  } catch (error) {
    next(error);
  }
};

export const getChatSessionById = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return sendError(res, 'Invalid chat session ID.', 400);
    }

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return sendError(res, 'Chat session not found.', 404);
    }

    return sendSuccess(res, { session });
  } catch (error) {
    next(error);
  }
};

export const createChatSession = async (req, res, next) => {
  try {
    const { title = 'New Conversation', documentIds = [] } = req.body;

    const validDocIds = Array.isArray(documentIds)
      ? documentIds.filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
      : [];

    const session = await ChatSession.create({
      userId: req.user.id,
      title: title.trim() || 'New Conversation',
      documentIds: validDocIds,
      messages: [],
    });

    return sendSuccess(res, { session }, 'Chat session created.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateChatSession = async (req, res, next) => {
  try {
    const { title } = req.body;
    const sessionId = req.params.id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return sendError(res, 'Invalid chat session ID.', 400);
    }

    if (!title || !title.trim()) {
      return sendError(res, 'Please provide a valid conversation title.', 400);
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id },
      { title: title.trim() },
      { new: true }
    );

    if (!session) {
      return sendError(res, 'Chat session not found.', 404);
    }

    return sendSuccess(res, { session }, 'Chat title updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteChatSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return sendError(res, 'Invalid chat session ID.', 400);
    }

    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return sendError(res, 'Chat session not found.', 404);
    }

    return sendSuccess(res, { id: sessionId }, 'Chat session deleted successfully.');
  } catch (error) {
    next(error);
  }
};
