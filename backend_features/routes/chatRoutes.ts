import express from 'express';
import { getChatList } from '../controllers/chatController.js';

const router = express.Router();

/**
 * @route GET /api/chat-list
 * @desc Retrieve a list of unique phone numbers the connected WhatsApp number has interacted with.
 * @access Public
 */
router.get('/', getChatList);

export default router;
