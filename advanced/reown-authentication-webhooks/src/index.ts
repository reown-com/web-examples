import express from 'express';
import dotenv from 'dotenv';
import { isWebhookSignatureValid } from './utils';
import type { ReownAuthenticationWebhooks } from './types';

// Setup environment variables
dotenv.config();

// Setup server
const app = express();

// Setup middleware to parse JSON body
app.use(express.json());

// Add POST request handler for the webhook
app.post('/handler', (req, res) => {
  // Print the request body
  const body = req.body as ReownAuthenticationWebhooks.RequestBody;
  console.log(`New Event Received [${body.uuid}] [${body.event}]`);
  console.log(body);

  // Validate signature of the request
  const signature = req.get('x-webhook-signature'); // Get message signature from header
  if (
    !signature ||
    !isWebhookSignatureValid({ body: JSON.stringify(req.body), signature })
  ) {
    console.error('Error: Invalid webhook signature');
    res.status(401).send('Unauthorized');
    return;
  }

  switch (body.event) {
    case 'ACCOUNT_CREATED':
      // Add your logic for account creation
      break;
    case 'ACCOUNT_CONNECTED':
      // Add your logic for account connection
      break;
    case 'ACCOUNT_DELETED':
      // Add your logic for account deletion
      break;
    case 'PROFILE_UPDATED':
      // Add your logic for profile update
      break;
    default:
      console.error('Unknown event');
      res.status(400).send('Bad Request');
      return;
  }

  res.status(200).send('OK');

  console.log('---');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
  console.log(`Webhook URL: http://localhost:3000/handler`);
});
