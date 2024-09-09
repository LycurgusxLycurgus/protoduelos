import express from 'express';
import dotenv from 'dotenv';
import winston from 'winston';
import util from 'util';
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { WhatsAppAPI } from './whatsapp.js';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

export { logger };

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// WhatsApp API configuration
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!whatsappToken || !whatsappPhoneNumberId) {
  throw new Error('WhatsApp API configuration is missing. Please check your environment variables.');
}

const whatsappApi = new WhatsAppAPI(whatsappToken, whatsappPhoneNumberId);

// LangChain configuration
const llm = new ChatGroq({ 
  model: "llama-3.1-8b-instant",
  temperature: 0.7,
  apiKey: process.env.GROQ_API_KEY
});

// Define the prompt template with message history
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", "Eres un psicólogo de clase mundial que brinda un apoyo emocional de alta calidad. Asegúrate que tus mensajes sean detallados y prácticos."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"]
]);

// Create the chain
const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

// In-memory message store (replace with a database in production)
const messageStore: { [key: string]: (HumanMessage | AIMessage)[] } = {};

// Interfaces
interface WhatsAppMessage {
  from: string;
  text: string;
  button_payload?: string;
}

// Helper functions
async function processMessage(message: WhatsAppMessage): Promise<string> {
  try {
    const input = message.button_payload || message.text;
    logger.info(`Processing input: ${input}`);

    // Retrieve or initialize chat history
    const chatHistory = messageStore[message.from] || [];

    // Invoke the chain with chat history
    const response = await chain.invoke({
      chat_history: chatHistory,
      input: input
    });

    logger.info(`LangChain response: ${util.inspect(response, { depth: null })}`);

    // Update chat history
    chatHistory.push(new HumanMessage(input));
    chatHistory.push(new AIMessage(response));
    messageStore[message.from] = chatHistory.slice(-10); // Keep last 10 messages

    return response;
  } catch (error) {
    logger.error('Error processing message with LangChain:', error);
    return 'I apologize, but I encountered an issue while processing your message. How else can I support you today?';
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  try {
    await whatsappApi.sendTextMessage(to, message);
    logger.info('WhatsApp message sent successfully');
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
  }
}

// Webhook verification
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

function verifyWebhook(mode: string, token: string): boolean {
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return true;
    }
  }
  return false;
}

// Webhook endpoints
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (verifyWebhook(mode as string, token as string)) {
    logger.info('Webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { body } = req;
    let responseData: { status: string; responses: any[] } = { status: 'OK', responses: [] };
    
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            for (const message of change.value.messages) {
              const response = await handleIncomingMessage(message);
              responseData.responses.push(response);
            }
          }
        }
      }
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ status: 'Error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

async function handleIncomingMessage(message: any): Promise<any> {
  try {
    const { from, type, text } = message;
    
    if (type === 'text') {
      const response = await processMessage({ from, text: text.body });
      await sendWhatsAppMessage(from, response);
      return {
        to: from,
        responseText: response
      };
    } else {
      logger.info(`Received unsupported message type: ${type}`);
      return {
        to: from,
        responseText: "Unsupported message type",
        messageType: type
      };
    }
  } catch (error) {
    logger.error('Error handling incoming message:', error);
    return {
      error: 'Error handling incoming message',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});