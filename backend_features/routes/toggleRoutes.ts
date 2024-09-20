import express from 'express';
import { toggleAutoRespond } from '../controllers/toggleController.js';

const router = express.Router();

/**
 * @route POST /api/toggle/auto-respond
 * @desc Toggle auto-respond for a specific phone number
 * @access Public
 */
router.post('/auto-respond', toggleAutoRespond);

export default router;