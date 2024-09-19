import express from 'express';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import llmRoutes from './routes/llmRoutes.js';

const router = express.Router();

// Mounting the routes
router.use('/chat-list', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/llm-monitoring', llmRoutes);
router.use('/llm-visualization', llmRoutes);

export default router;
