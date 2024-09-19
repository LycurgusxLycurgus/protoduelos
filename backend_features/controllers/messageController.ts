// backend_features/controllers/messageController.ts

import { Request, Response } from 'express';
import { WhatsAppAPI } from '../../whatsapp.js'; // Correct import for WhatsAppAPI
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { messageStore } from '../../app.js'; // Ensure the correct path

/**
 * Retrieve chat history for a given phone number.
 */
export const getMessages = (req: Request, res: Response) => {
  const { phoneNumber } = req.params;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const messages = messageStore[phoneNumber];

  if (!messages) {
    return res.status(404).json({ error: 'No messages found for this phone number.' });
  }

  // Format messages
  const formattedMessages = messages.map((msgObj) => ({
    sender: msgObj.msg instanceof HumanMessage ? 'human' : 'AI',
    timestamp: msgObj.timestamp,
    content: msgObj.msg instanceof HumanMessage ? msgObj.msg.text : msgObj.msg.text, // Adjust based on actual properties
  }));

  res.status(200).json({ messages: formattedMessages });
};

/**
 * Send a new message from the user to a specified phone number.
 */
export const sendMessage = async (req: Request, res: Response) => {
  const { phoneNumber, messageContent } = req.body;

  if (!phoneNumber || !messageContent) {
    return res.status(400).json({ error: 'Phone number and message content are required.' });
  }

  try {
    // Access whatsappApi from app.locals
    const whatsappApi: WhatsAppAPI = req.app.locals.whatsappApi;

    // Send the message using WhatsAppAPI
    await whatsappApi.sendTextMessage(phoneNumber, messageContent);

    res.status(200).json({ status: 'Message sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
};
