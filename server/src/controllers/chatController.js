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

    let session;
    if (chatId) {
      session = await ChatSession.findOne({ _id: chatId, userId: req.user.id });
      if (!session) {
        return sendError(res, 'Chat session not found or access denied.', 404);
      }
    } else {
      // Create new session with intelligent initial title
      const initialTitle = question.trim().slice(0, 45) + (question.trim().length > 45 ? '...' : '');
      session = await ChatSession.create({
        userId: req.user.id,
        title: initialTitle,
        documentIds: Array.isArray(documentIds) ? documentIds : [],
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

    // Execute RAG Pipeline
    const ragResult = await executeRagPipeline({
      question: question.trim(),
      userId: req.user.id,
      documentIds: documentIds.length > 0 ? documentIds : session.documentIds,
      conversationHistory,
      userPreferences: req.user.apiKeyPreferences,
    });

    // Add assistant message with citation sources to session
    const assistantMessage = {
      role: 'assistant',
      content: ragResult.answer,
      sources: ragResult.sources,
      createdAt: new Date(),
    };
    session.messages.push(assistantMessage);

    await session.save();

    return sendSuccess(res, {
      chatId: session._id,
      title: session.title,
      answer: ragResult.answer,
      sources: ragResult.sources,
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
      lastMessage: s.messages && s.messages.length > 0 ? s.messages[s.messages.length - 1].content.slice(0, 80) : '',
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
    const session = await ChatSession.findOne({
      _id: req.params.id,
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

    const session = await ChatSession.create({
      userId: req.user.id,
      title,
      documentIds,
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

    if (!title || !title.trim()) {
      return sendError(res, 'Title cannot be empty.', 400);
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title: title.trim() },
      { new: true }
    );

    if (!session) {
      return sendError(res, 'Chat session not found.', 404);
    }

    return sendSuccess(res, { session }, 'Chat title updated.');
  } catch (error) {
    next(error);
  }
};

export const deleteChatSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return sendError(res, 'Chat session not found.', 404);
    }

    return sendSuccess(res, { id: req.params.id }, 'Chat session deleted successfully.');
  } catch (error) {
    next(error);
  }
};
