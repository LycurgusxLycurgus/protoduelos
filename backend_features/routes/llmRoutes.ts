import express from 'express';
import { getLLMMonitoring, getLLMVisualization } from '../controllers/llmController.js';

const router = express.Router();

/**
 * @route GET /api/llm-monitoring
 * @desc Retrieve LLM chain execution data.
 * @access Public
 */
router.get('/monitoring', getLLMMonitoring);

/**
 * @route GET /api/llm-visualization
 * @desc Retrieve LLM chain structure data for graph visualization.
 * @access Public
 */
router.get('/visualization', getLLMVisualization);

export default router;
