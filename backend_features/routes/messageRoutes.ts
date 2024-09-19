import express from 'express';
import { getMessages, sendMessage } from '../controllers/messageController.js';

const router = express.Router();

/**
 * @route GET /api/messages/:phoneNumber
 * @desc Retrieve chat history for a given phone number.
 * @access Public
 */
router.get('/:phoneNumber', getMessages);

/**
 * @route POST /api/send-message
 * @desc Send a new message from the user to a specified phone number.
 * @access Public
 */
router.post('/', sendMessage);

export default router;
