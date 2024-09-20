# ConversAI Flow API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Versioning](#versioning)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Endpoints](#endpoints)
   - [Chat List](#chat-list)
   - [Messages](#messages)
   - [Webhook](#webhook)
   - [LLM Monitoring](#llm-monitoring)
   - [LLM Visualization](#llm-visualization)
8. [Data Models](#data-models)
9. [Changelog](#changelog)
10. [Support](#support)

## Introduction

The ConversAI Flow API is a lightweight, modular backend prototype built with TypeScript, Express.js, and LangChain. It provides functionality for handling WhatsApp messages, processing them through a language model chain, and monitoring the LLM's performance.

## Authentication

Authentication is required for accessing the API endpoints. The API uses WhatsApp's authentication mechanism for incoming webhooks and environment variables for sensitive information.

- For incoming webhooks: Verify using the `WEBHOOK_VERIFY_TOKEN` environment variable.
- For outgoing requests to WhatsApp: Use the `WHATSAPP_ACCESS_TOKEN` environment variable.

## Base URL

The base URL for all API endpoints is:

https://protoduelos-g3it.onrender.com/api

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response will include a JSON object with an `error` field containing a descriptive message.

Example error response:

```json
{
"error": "Failed to retrieve LLM monitoring data."
}
```

Common error codes:

- 400 Bad Request: Invalid input or missing required parameters
- 401 Unauthorized: Authentication failure
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Requested resource not found
- 500 Internal Server Error: Unexpected server error

## Rate Limiting

Currently, there are no specific rate limits implemented. However, users should be mindful of WhatsApp's rate limiting policies when sending messages.

## Endpoints

### Chat List

#### GET /api/chat-list

Retrieves a list of phone numbers representing active chats (conversations) associated with the WhatsApp number.

Response:
- 200 OK: Returns a JSON object containing the list of phone numbers
  ```json
  {
    "phoneNumbers": [
      "+1234567890",
      "+9876543210" 
    ]
  }
  ```
- 500 Internal Server Error: If retrieval fails

### Messages

#### GET /api/messages/:phoneNumber

Retrieves chat history for a given phone number.

Parameters:
- `phoneNumber` (string, required): The phone number to retrieve chat history for

Response:
- 200 OK: Returns a JSON object containing the chat history
  ```json
  {
    "messages": [
      {
        "sender": "human",
        "timestamp": "2023-04-01T12:00:00Z",
        "content": "User message"
      },
      {
        "sender": "AI",
        "timestamp": "2023-04-01T12:00:05Z",
        "content": "AI response"
      }
    ]
  }
  ```
- 400 Bad Request: If the phone number is missing
- 404 Not Found: If no messages are found for the given phone number

#### POST /api/messages

Sends a new message from the user to a specified phone number.

Request Body:

```json
{
"phoneNumber": "string",
"messageContent": "string"
}
```
Response:
- 200 OK: Message sent successfully
- 400 Bad Request: If phone number or message content is missing
- 500 Internal Server Error: If sending the message fails

### Webhook

#### GET /webhook

Verifies the webhook for WhatsApp integration.

Query Parameters:
- `hub.mode` (string, required): Should be 'subscribe'
- `hub.verify_token` (string, required): Verification token
- `hub.challenge` (string, required): Challenge string to be echoed back

Response:
- 200 OK: Returns the challenge string if verification is successful
- 403 Forbidden: If verification fails

#### POST /webhook

Receives incoming messages and events from WhatsApp.

Request Body: WhatsApp webhook payload (JSON)

Response:
- 200 OK: Successfully processed the webhook
- 500 Internal Server Error: If processing fails

### LLM Monitoring

#### GET /api/llm-monitoring/monitoring

Retrieves LLM chain execution data for monitoring purposes.

Response:
- 200 OK: Returns a JSON object containing execution logs
  ```json
  {
    "executions": [
      {
        "timestamp": "2023-04-01T12:00:00Z",
        "input": "User input",
        "output": "LLM response",
        "latency": 500,
        "intermediateSteps": []
      }
    ]
  }
  ```
- 500 Internal Server Error: If retrieval fails

### LLM Visualization

#### GET /api/llm-visualization/visualization

Retrieves LLM chain structure data for graph visualization, including execution history.

Response:
- 200 OK: Returns a JSON object containing nodes and edges of the LLM chain, including execution nodes
  ```json
  {
    "nodes": [
      { "id": "promptTemplate", "label": "Prompt Template" },
      { "id": "llm", "label": "LLM" },
      { "id": "outputParser", "label": "Output Parser" },
      { "id": "execution-0", "label": "User: ... LLM: ..." },
      // Additional execution nodes...
    ],
    "edges": [
      { "from": "promptTemplate", "to": "llm" },
      { "from": "llm", "to": "outputParser" },
      { "from": "llm", "to": "execution-0" },
      // Additional edges connecting LLM to execution nodes...
    ]
  }
  ```
  
  The response includes:
  - Core nodes representing the LLM chain structure (Prompt Template, LLM, Output Parser).
  - Execution nodes (e.g., "execution-0") representing the conversation history, including user inputs and LLM responses.
  - Edges connecting the core nodes and the LLM to each execution node.

  Note: The number of execution nodes may vary depending on the conversation history.

- 500 Internal Server Error: If retrieval fails

### Toggle Auto-Respond

#### POST /api/toggle/auto-respond  

Description: Enable or disable the automatic response feature for a specific phone number. When enabled, the WhatsApp bot will respond with a predefined message instead of processing the input through the LLM.

Request Body:
- phoneNumber (string, required): The phone number to toggle auto-respond for.
- enable (boolean, required): Set to true to enable auto-respond or false to disable it.

Example Request:

```json
{
  "phoneNumber": "+1234567890",
  "enable": true
}
```
Responses:
- 200 OK: Auto-respond toggled successfully
  ```json
  {
    "phoneNumber": "1234567890",
    "autoRespond": true
  }
```
- 400 Bad Request: If phone number or enable flag is missing
  ```json
  {
    "error": "Phone number and enable flag are required."
  }
  ```
- 500 Internal Server Error: If toggling fails
  ```json
  {
    "error": "Failed to toggle auto-respond."
  }
  ```
Usage Notes:
Ensure that the phoneNumber provided is in the correct format.
The enable flag must be a boolean value (true or false).


## Data Models

### WhatsApp Message

```typescript
interface WhatsAppMessage {
from: string;
text: string;
button_payload?: string;
}
```

## Changelog

### v1.0.0 (2023-04-01)
- Initial release of the ConversAI Flow API
- Implemented webhook endpoints for WhatsApp integration
- Added LLM monitoring and visualization endpoints

## Support

For any questions, issues, or feature requests, please contact our support team at support@conversai-flow.com or open an issue on our GitHub repository: https://github.com/conversai-flow/api