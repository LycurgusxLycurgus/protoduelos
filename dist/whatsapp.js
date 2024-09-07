import axios from 'axios';
import { logger } from './app.js'; // Changed from './app' to './app.js'
export class WhatsAppAPI {
    constructor(token, phoneNumberId) {
        this.token = token;
        this.phoneNumberId = phoneNumberId;
        this.apiUrl = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
    }
    async sendTextMessage(to, text) {
        try {
            const response = await axios.post(this.apiUrl, {
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
            logger.info('Message sent successfully:', response.data);
        }
        catch (error) {
            logger.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
    async sendInteractiveMessage(to, text, buttons) {
        try {
            const response = await axios.post(this.apiUrl, {
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
            logger.info('Interactive message sent successfully:', response.data);
        }
        catch (error) {
            logger.error('Error sending WhatsApp interactive message:', error);
            throw error;
        }
    }
}
