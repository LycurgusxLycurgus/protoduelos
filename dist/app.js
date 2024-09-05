"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const openai_1 = require("langchain/llms/openai");
const prompts_1 = require("langchain/prompts");
const chains_1 = require("langchain/chains");
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
const util_1 = __importDefault(require("util"));
// Load environment variables
dotenv_1.default.config();
// Configure logger
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
// WhatsApp API configuration
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappApiUrl = `https://graph.facebook.com/v12.0/${process.env.WHATSAPP_APP_ID}/messages`;
// LangChain configuration
const reasoningLLM = new openai_1.OpenAI({
    temperature: 0.0,
    modelName: 'gpt-4o-mini',
    openAIApiKey: process.env.OPENAI_API_KEY
});
const formattingLLM = new openai_1.OpenAI({
    temperature: 0.0,
    modelName: 'gpt-4o-mini',
    openAIApiKey: process.env.OPENAI_API_KEY
});
const reasoningPrompt = new prompts_1.PromptTemplate({
    template: 'Take the user input (on USER), and using MINI_FOT_JST generate a NLIR reasoning about it in a YAML snippet, in which you connect this topic to mourning and grief.\n\nUSER\n{input}\nEND_USER\n\nMINI_FOT_JST\nPrinciples\n\n```yaml\nprinciples:\n  nlir_reasoning: \n    - Utilize the Natural Language Inherent Reasoning (NLIR) framework to break down the problem into a structured series of sub-questions and answers.\n    -  Employ a flow of questions, starting with a high-level question and progressively breaking it down into more manageable sub-questions.\n    - **Structured Response Framework:**\n      - Employ the Structured Response Framework to formulate answers to sub-questions:\n        - **Structured Natural Language Templates:** Use predefined templates that mimic programming structures (e.g., "If [condition], then [action], otherwise [alternative action]").\n        - **Decision Trees in Text:** Create textual decision trees for classification or complex decision-making.\n        - **State-based Reasoning:**  After answering each sub-question, describe the current state of the problem in clear natural language. Update this state based on the answer to the sub-question.\n    - **Advantages:**\n      - NLIR promotes accuracy by providing a structured reasoning framework that minimizes ambiguity.\n      - The use of natural language throughout the process enhances interpretability, making the reasoning steps transparent and understandable. \n  flow_of_thought:\n    - Think step-by-step, systematically addressing each sub-question and updating the problem state accordingly. \n    - Explicitly describe the reasoning behind each answer and how it affects the overall solution. \n  general_guidelines:\n    - Clearly define the initial state of the problem, including any relevant variables or data.\n    - Maintain a clear and consistent representation of the problem state throughout the reasoning process.\n    - Use precise language and avoid ambiguity when describing conditions, actions, and states.\n```\n\nEND_MINI_FOT_JST',
    inputVariables: ['input'],
});
const formattingPrompt = new prompts_1.PromptTemplate({
    template: 'Format the following response in markdown and condense it to be sent as a WhatsApp message. At the end, include exactly 3 follow-up actions, each on a new line starting with "- ": {input}\n Assistant: Heres a condensed version of your response formatted in Markdown for WhatsApp:',
    inputVariables: ['input'],
});
const reasoningChain = new chains_1.LLMChain({ llm: reasoningLLM, prompt: reasoningPrompt });
const formattingChain = new chains_1.LLMChain({ llm: formattingLLM, prompt: formattingPrompt });
// Helper functions
async function processMessage(message) {
    try {
        const input = message.button_payload || message.text;
        logger.info(`Processing input: ${input}`);
        const reasoningResult = await reasoningChain.call({ input });
        logger.info(`Reasoning result: ${util_1.default.inspect(reasoningResult, { depth: null })}`);
        const formattedResult = await formattingChain.call({ input: reasoningResult.text });
        logger.info(`Formatted result: ${util_1.default.inspect(formattedResult, { depth: null })}`);
        const buttons = extractButtons(formattedResult.text);
        logger.info(`Extracted buttons: ${util_1.default.inspect(buttons, { depth: null })}`);
        const response = {
            text: formattedResult.text,
            buttons: buttons,
            reasoningResult: reasoningResult.text,
        };
        logger.info(`Final response: ${util_1.default.inspect(response, { depth: null })}`);
        return response;
    }
    catch (error) {
        logger.error('Error processing message with LangChain:', error);
        return { text: 'Sorry, I encountered an error while processing your message.' };
    }
}
function extractButtons(text) {
    const buttonRegex = /^- (.+)$/gm;
    const matches = text.match(buttonRegex);
    return matches ? matches.map(match => match.replace(/^- /, '').trim()) : [];
}
async function sendWhatsAppMessage(to, message, buttons) {
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
        const response = await axios_1.default.post(whatsappApiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
            },
        });
        logger.info('WhatsApp message sent:', response.data);
    }
    catch (error) {
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
        }
        else if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
            button_payload = message.interactive.button_reply.id;
        }
        else {
            return res.sendStatus(400);
        }
        logger.info('Received message:', { from, text, button_payload });
        const whatsAppMessage = { from, text, button_payload };
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
    }
    catch (error) {
        logger.error('Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});
