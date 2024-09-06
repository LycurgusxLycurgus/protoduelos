"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const app_1 = require("./app"); // Changed from './logger' to './app'
class WhatsAppAPI {
    constructor(token, phoneNumberId) {
        this.token = token;
        this.phoneNumberId = phoneNumberId;
        this.apiUrl = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
    }
    async sendTextMessage(to, text) {
        try {
            const response = await axios_1.default.post(this.apiUrl, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text },
            }, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });
            app_1.logger.info('Message sent successfully:', response.data);
        }
        catch (error) {
            app_1.logger.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
    async sendInteractiveMessage(to, text, buttons) {
        try {
            const response = await axios_1.default.post(this.apiUrl, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text },
                    action: {
                        buttons: buttons.map((button, index) => ({
                            type: 'reply',
                            reply: { id: `btn_${index}`, title: button.substring(0, 20) }
                        }))
                    }
                }
            }, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });
            app_1.logger.info('Interactive message sent successfully:', response.data);
        }
        catch (error) {
            app_1.logger.error('Error sending WhatsApp interactive message:', error);
            throw error;
        }
    }
}
exports.WhatsAppAPI = WhatsAppAPI;
