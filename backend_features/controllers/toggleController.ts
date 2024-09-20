import { Request, Response } from 'express';
import { autoRespondStore } from '../../app.js'; // Importing the store from app.ts

/**
 * Toggle auto-respond for a given phone number.
 */
export const toggleAutoRespond = (req: Request, res: Response) => {
  const { phoneNumber, enable } = req.body;

  if (!phoneNumber || typeof enable !== 'boolean') {
    return res.status(400).json({ error: 'Phone number and enable flag are required.' });
  }

  autoRespondStore[phoneNumber] = enable;
  res.status(200).json({ phoneNumber, autoRespond: enable });
};