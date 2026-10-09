import express from 'express';
import {
  handleChatMessage,
  getChatSessions,
  getChatSessionById,
  createChatSession,
  updateChatSession,
  deleteChatSession,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', handleChatMessage); // POST /api/chat or POST /api/chats (if forwarded)
router.get('/', getChatSessions);
router.post('/sessions', createChatSession);
router.get('/:id', getChatSessionById);
router.patch('/:id', updateChatSession);
router.delete('/:id', deleteChatSession);

export default router;
