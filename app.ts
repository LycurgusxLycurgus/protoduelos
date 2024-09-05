import express from 'express';
import axios from 'axios';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import dotenv from 'dotenv';
import winston from 'winston';
import util from 'util';

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

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// WhatsApp API configuration
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappApiUrl = `https://graph.facebook.com/v12.0/${process.env.WHATSAPP_APP_ID}/messages`;

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
  template: 'Take the user input (on USER), and using MINI_FOT_JST generate a NLIR reasoning about it in a YAML snippet, in which you connect this topic to mourning and grief.\n\nUSER\n{input}\nEND_USER\n\nMINI_FOT_JST\nPrinciples\n\n```yaml\nprinciples:\n  nlir_reasoning: \n    - Utilize the Natural Language Inherent Reasoning (NLIR) framework to break down the problem into a structured series of sub-questions and answers.\n    -  Employ a flow of questions, starting with a high-level question and progressively breaking it down into more manageable sub-questions.\n    - **Structured Response Framework:**\n      - Employ the Structured Response Framework to formulate answers to sub-questions:\n        - **Structured Natural Language Templates:** Use predefined templates that mimic programming structures (e.g., "If [condition], then [action], otherwise [alternative action]").\n        - **Decision Trees in Text:** Create textual decision trees for classification or complex decision-making.\n        - **State-based Reasoning:**  After answering each sub-question, describe the current state of the problem in clear natural language. Update this state based on the answer to the sub-question.\n    - **Advantages:**\n      - NLIR promotes accuracy by providing a structured reasoning framework that minimizes ambiguity.\n      - The use of natural language throughout the process enhances interpretability, making the reasoning steps transparent and understandable. \n  flow_of_thought:\n    - Think step-by-step, systematically addressing each sub-question and updating the problem state accordingly. \n    - Explicitly describe the reasoning behind each answer and how it affects the overall solution. \n  general_guidelines:\n    - Clearly define the initial state of the problem, including any relevant variables or data.\n    - Maintain a clear and consistent representation of the problem state throughout the reasoning process.\n    - Use precise language and avoid ambiguity when describing conditions, actions, and states.\n```\n\nEND_MINI_FOT_JST',
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
    const payload = buttons && buttons.length > 0
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: message },
            action: {
              buttons: buttons.map((button, index) => ({
                type: 'reply',
                reply: { id: `btn_${index}`, title: button.substring(0, 20) }
              }))
            }
          }
        }
      : {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        };

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });
    logger.info('WhatsApp message sent:', response.data);
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
  }
}

// Routes
app.post('/webhook', async (req, res) => {
  try {
    const { entry } = req.body;
    if (!entry || !entry[0] || !entry[0].changes || !entry[0].changes[0]) {
      return res.sendStatus(400);
    }

    const change = entry[0].changes[0];
    if (change.field !== 'messages') {
      return res.sendStatus(400);
    }

    const message = change.value.messages[0];
    const from = message.from;
    let text = '';
    let button_payload;

    if (message.type === 'text') {
      text = message.text.body;
    } else if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
      button_payload = message.interactive.button_reply.id;
    } else {
      return res.sendStatus(400);
    }

    logger.info('Received message:', { from, text, button_payload });

    const whatsAppMessage: WhatsAppMessage = { from, text, button_payload };
    const response = await processMessage(whatsAppMessage);
    logger.info('Processed message response:', response);

    await sendWhatsAppMessage(from, response.text, response.buttons);
    logger.info('WhatsApp message sent successfully');

    // Modify the response to include both LLM outputs
    res.status(200).json({
      success: true,
      response: {
        formattedResponse: {
          text: response.text,
          buttons: response.buttons,
        },
        reasoningResponse: response.reasoningResult,
      },
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});