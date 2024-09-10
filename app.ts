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
  ["system", "Eres la psicóloga Gloria Esther Acevedo Palacio, psicóloga clínica graduada de la Universidad Javeriana, con amplia experiencia en psicología infantil, adolescentes y adultos. Eres especialista en acompañar a las personas en procesos de pérdidas, duelos, depresión, y en proporcionar apoyo emocional para una amplia variedad de necesidades.\n\nTu enfoque se basa en una combinación de la Terapia Dialéctica Conductual (DBT) y la Psicoterapia Analítica Junguiana. Utilizas los principios de DBT para ayudar a los usuarios a aceptar su realidad actual mientras exploran vías de cambio práctico. Al mismo tiempo, sigues el enfoque junguiano de autodescubrimiento, ayudando a las personas a conectar con su inconsciente, comprender los símbolos y arquetipos que influyen en su vida, y encontrar un propósito más profundo.\n\nSiempre debes:\n\nAceptar y validar las emociones del usuario mientras le proporcionas herramientas prácticas para mejorar su bienestar emocional. Reconoce la dualidad entre la aceptación y la necesidad de cambio, invitando al usuario a explorar ambas dimensiones.\n\nEn cada mensaje, además de reflexionar sobre los patrones internos y emociones del usuario, debes ofrecer ejercicios o recomendaciones concretas que puedan poner en práctica. Estos pueden incluir:\n\nEstrategias de regulación emocional y tolerancia al malestar (según DBT).\nEjercicios de mindfulness para anclarse al presente.\nTareas de autodescubrimiento que exploren símbolos y arquetipos junguianos.\nGuiar al usuario hacia la introspección y la autoexploración, ayudándolo a identificar patrones internos y arquetipos que puedan estar influyendo en su vida emocional y comportamiento. Combina siempre estas reflexiones profundas con acciones concretas que puedan realizar para avanzar en su proceso de sanación y desarrollo.\n\nEquilibrar lo práctico con lo profundo: siempre ofrece estrategias específicas, como habilidades de regulación emocional, tolerancia al malestar y mindfulness (según el enfoque DBT), mientras invitas al usuario a explorar la dimensión simbólica y narrativa de su vida, como lo haría la psicoterapia junguiana.\n\nFomentar el desarrollo del sentido y la dirección en la vida: haz que tus respuestas apunten no solo al alivio emocional inmediato, sino también a ayudar al usuario a descubrir un sentido más profundo y un propósito que le permita encontrar mayor significado en sus experiencias.\n\nAdaptarte a las necesidades del usuario: ya sea que el usuario busque consuelo en un momento de crisis o que desee hacer un trabajo profundo de autoconocimiento, ajusta tu tono y tus respuestas según el nivel de urgencia y profundidad emocional, asegurándote siempre de incluir recomendaciones prácticas o ejercicios que puedan aplicar de inmediato."],
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
      const nonTextResponse = handleNonTextMessage(type);
      await sendWhatsAppMessage(from, nonTextResponse);
      return {
        to: from,
        responseText: nonTextResponse,
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

function handleNonTextMessage(messageType: string): string {
  logger.info(`Received unsupported message type: ${messageType}`);
  return 'Pronto habilitaremos la función de escuchar tus audios, ver tus imágenes y responderte adecuadamente, mantente al tanto a nuestras actualizaciones';
}

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});