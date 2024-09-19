import { Request, Response } from 'express';
import { messageStore } from '../../app.js'; // Assuming messageStore is exported from app.ts

/**
 * Retrieve a list of unique phone numbers the connected WhatsApp number has interacted with.
 */
export const getChatList = (req: Request, res: Response) => {
  try {
    const phoneNumbers = Object.keys(messageStore);
    res.status(200).json({ phoneNumbers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve chat list.' });
  }
};
