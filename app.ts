import express from 'express';
import axios from 'axios';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import dotenv from 'dotenv';
import winston from 'winston';
import util from 'util';
import { WhatsAppAPI } from './whatsapp.js';

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
const reasoningLLM = new OpenAI({ 
  temperature: 0.0, 
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY
});
const formattingLLM = new OpenAI({ 
  temperature: 0.0, 
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY
});

const reasoningPrompt = new PromptTemplate({
  template: 'Take the user input topic (on USER), and using NLIR_REASONING generate a NLIR reasoning about it in a YAML snippet, in which you connect this topic to mourning and grief, then using NLIR_EVACOR evaluate and correct the previous reasoning in another YAML snippet. In order to reason and evaluate-&-correct such reasoning, you will follow these two sets of steps under (SET_STEPS): \n\nSET_STEPS\nUse NLIR reasoning following these steps:\n1. Generate initial high level question.\n2. Generate a sub-question.\n3. Answer the sub-question using structured answer (Structured Natural Language Templates and/or Decision Trees in Text)\n4. Answer the sub-question using natural answer (Natural language answer based on structured answer)\n5. Describe the current state. \n6. Repeat steps 2 to 5 until you arrive to the final sub-question. \n\nUse NLIR evaluate-&-correct following these steps:\n1. Evaluate and correct the initial high level question.\n2. Evaluate and correct the sub-questions.\n3. Evaluate and correct the answers.\n4. Describe the current state. \n5. Repeat steps 2 to 4 until you arrive to the final sub-question. \nEND_STE_STEPS\n\n\nUSER\n{input}\nEND_USER\n\nNLIR_REASONING\nPrinciples\n\n```yaml\nprinciples:\n  nlir_reasoning: \n    - Utilize the Natural Language Inherent Reasoning (NLIR) framework to break down the problem into a structured series of sub-questions and answers.\n    -  Employ a flow of questions, starting with a high-level question and progressively breaking it down into more manageable sub-questions.\n    - **Structured Response Framework:**\n      - Employ the Structured Response Framework to formulate answers to sub-questions:\n        - **Structured Natural Language Templates:** Use predefined templates that mimic programming structures (e.g., "If [condition], then [action], otherwise [alternative action]").\n        - **Decision Trees in Text:** Create textual decision trees for classification or complex decision-making.\n        - **State-based Reasoning:**  After answering each sub-question, describe the current state of the problem in clear natural language. Update this state based on the answer to the sub-question.\n    - **Advantages:**\n      - NLIR promotes accuracy by providing a structured reasoning framework that minimizes ambiguity.\n      - The use of natural language throughout the process enhances interpretability, making the reasoning steps transparent and understandable. \n  flow_of_thought:\n    - Think step-by-step, systematically addressing each sub-question and updating the problem state accordingly. \n    - Explicitly describe the reasoning behind each answer and how it affects the overall solution. \n  general_guidelines:\n    - Clearly define the initial state of the problem, including any relevant variables or data.\n    - Maintain a clear and consistent representation of the problem state throughout the reasoning process.\n    - Use precise language and avoid ambiguity when describing conditions, actions, and states.\n```\nEND_NLIR_REASONING\n\nNLIR_EVACOR\n```yaml\nprinciples:\n  nlir_reasoning: \n    - Utilize the Natural Language Inherent Reasoning (NLIR) framework to break down the problem into a structured series of sub-questions and answers.\n    - Employ a flow of questions, starting with a high-level question and progressively breaking it down into more manageable sub-questions.\n    - **Structured Response Framework:**\n      - Employ the Structured Response Framework to formulate answers to sub-questions:\n        - **Structured Natural Language Templates:** Use predefined templates that mimic programming structures (e.g., "If [condition], then [action], otherwise [alternative action]").\n        - **Decision Trees in Text:** Create textual decision trees for classification or complex decision-making.\n        - **State-based Reasoning:** After answering each sub-question, describe the current state of the problem in clear natural language. Update this state based on the answer to the sub-question.\n    - **Accuracy Evaluation and Correction:**\n      - Evaluate the accuracy of the provided NLIR reasoning by analyzing each sub-question, answer, and state update.\n      - If an error is detected, initiate a correction process using the same NLIR principles:\n        - Formulate a new sub-question targeting the identified error.\n        - Answer the new sub-question and update the state accordingly.\n        - Re-evaluate the accuracy.\n    - **Advantages:**\n      - NLIR promotes accuracy by providing a structured reasoning framework that minimizes ambiguity.\n      - The use of natural language throughout the process enhances interpretability, making the reasoning steps transparent and understandable.\n      - The accuracy evaluation and correction mechanism ensures the robustness of the reasoning process.\n  flow_of_thought:\n    - Think step-by-step, systematically addressing each sub-question and updating the problem state accordingly. \n    - Explicitly describe the reasoning behind each answer and how it affects the overall solution. \n  general_guidelines:\n    - Clearly define the initial state of the problem, including any relevant variables or data.\n    - Maintain a clear and consistent representation of the problem state throughout the reasoning process.\n    - Use precise language and avoid ambiguity when describing conditions, actions, and states.\n```\nEND_NLIR_EVACOR\n',
  inputVariables: ['input'],
});

const formattingPrompt = new PromptTemplate({
  template: 'Format the following response in markdown and condense it to be sent as a WhatsApp message. At the end, include exactly 3 follow-up actions, each on a new line starting with "- ": {input}\n Assistant: Heres a condensed version of your response formatted in Markdown for WhatsApp:',
  inputVariables: ['input'],
});

const reasoningChain = new LLMChain({ llm: reasoningLLM, prompt: reasoningPrompt });
const formattingChain = new LLMChain({ llm: formattingLLM, prompt: formattingPrompt });

// Interfaces
interface WhatsAppMessage {
  from: string;
  text: string;
  button_payload?: string;
}

interface LangChainResponse {
  text: string;
  buttons?: string[];
  reasoningResult?: string;  // Add this line
}

// Helper functions
async function processMessage(message: WhatsAppMessage): Promise<LangChainResponse> {
  try {
    const input = message.button_payload || message.text;
    logger.info(`Processing input: ${input}`);

    const reasoningResult = await reasoningChain.call({ input });
    logger.info(`Reasoning result: ${util.inspect(reasoningResult, { depth: null })}`);

    const formattedResult = await formattingChain.call({ input: reasoningResult.text });
    logger.info(`Formatted result: ${util.inspect(formattedResult, { depth: null })}`);

    const buttons = extractButtons(formattedResult.text);
    logger.info(`Extracted buttons: ${util.inspect(buttons, { depth: null })}`);

    const response = {
      text: formattedResult.text,
      buttons: buttons,
      reasoningResult: reasoningResult.text,
    };
    logger.info(`Final response: ${util.inspect(response, { depth: null })}`);

    return response;
  } catch (error) {
    logger.error('Error processing message with LangChain:', error);
    return { text: 'Sorry, I encountered an error while processing your message.' };
  }
}

function extractButtons(text: string): string[] {
  const buttonRegex = /^- (.+)$/gm;
  const matches = text.match(buttonRegex);
  return matches ? matches.map(match => match.replace(/^- /, '').trim()) : [];
}

async function sendWhatsAppMessage(to: string, message: string, buttons?: string[]) {
  try {
    if (buttons && buttons.length > 0) {
      await whatsappApi.sendInteractiveMessage(to, message, buttons);
    } else {
      await whatsappApi.sendTextMessage(to, message);
    }
    logger.info('WhatsApp message sent successfully');
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
  }
}

// Add this near the top of the file, after other environment variable loads
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Add this new function for webhook verification
function verifyWebhook(mode: string, token: string): boolean {
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return true;
    }
  }
  return false;
}

// Update the webhook endpoint to include verification
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

// Update the webhook POST endpoint
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
      const response = await generateResponse(text.body);
      await sendWhatsAppMessage(from, response.text, response.buttons);
      return {
        to: from,
        responseText: response.text,
        buttons: response.buttons,
        reasoningResult: response.reasoningResult
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

async function generateResponse(input: string): Promise<LangChainResponse> {
  try {
    logger.info(`Processing input: ${input}`);

    const reasoningResult = await reasoningChain.call({ input });
    logger.info(`Reasoning result: ${util.inspect(reasoningResult, { depth: null })}`);

    const formattedResult = await formattingChain.call({ input: reasoningResult.text });
    logger.info(`Formatted result: ${util.inspect(formattedResult, { depth: null })}`);

    const buttons = extractButtons(formattedResult.text);
    logger.info(`Extracted buttons: ${util.inspect(buttons, { depth: null })}`);

    const response = {
      text: formattedResult.text,
      buttons: buttons,
      reasoningResult: reasoningResult.text,
    };
    logger.info(`Final response: ${util.inspect(response, { depth: null })}`);

    return response;
  } catch (error) {
    logger.error('Error processing message with LangChain:', error);
    return { text: 'Sorry, I encountered an error while processing your message.' };
  }
}

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});