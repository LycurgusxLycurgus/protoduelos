import express from 'express';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import llmRoutes from './routes/llmRoutes.js';
import toggleRoutes from './routes/toggleRoutes.js'; // Import toggle routes

const router = express.Router();

// Mounting the routes
router.use('/chat-list', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/llm-monitoring', llmRoutes);
router.use('/llm-visualization', llmRoutes);
router.use('/toggle', toggleRoutes); // Mounting toggle routes

export default router;
