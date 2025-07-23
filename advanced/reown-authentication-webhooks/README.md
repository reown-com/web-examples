# Reown Authentication Webhooks

This project demonstrates how to implement webhook handlers for **Reown Authentication**, Reown's flagship SIWX (Sign In With X) solution for modern web3 applications.

## About Reown Authentication

**Reown Authentication** is a production-ready authentication service built specifically for multi-chain environments. It abstracts away the complexity of validating wallets across **EVM, Solana, and Bitcoin networks**.

### Key Features

- **Production-Ready from Day One**: Battle-tested, globally distributed via Cloudflare Workers with built-in rate limiting
- **Multi-Chain Native**: Seamless integration with EVM, Solana, and Bitcoin networks
- **User Management Dashboard**: Comprehensive analytics including user registry, geographic insights, and real-time connection data
- **SIWX Standard**: Implements the Sign In With X standard, a chain-agnostic evolution of Sign In With Ethereum (SIWE)

### How Authentication Works

1. Users sign a cryptographic message with their wallet
2. Message signature is securely forwarded to Reown's verification servers
3. Upon successful validation, a JWT token is issued for your application
4. Seamless integration with your existing authentication flows

For more information, visit the [official documentation](https://docs.reown.com/cloud/reown-authentication).

## Webhooks Overview

Reown Authentication webhooks provide real-time notifications about user events in your application. This allows you to:

- Track user lifecycle events (creation, connection, updates, deletion)
- Sync user data with your own systems
- Trigger custom business logic based on authentication events
- Monitor user activity and engagement

## Implementing Webhook Handlers

### HTTP Request Format

Reown Authentication sends webhook events as HTTP POST requests to your configured endpoint with the following characteristics:

#### Headers

- `Content-Type: application/json`
- `x-webhook-signature: <signature>` - HMAC-SHA256 signature for verification

#### Request Body Structure

```json
{
  "uuid": "unique-event-identifier",
  "event": "EVENT_NAME",
  "data": {
    // Event-specific data (see Events section below)
  }
}
```

### Signature Verification

**Important**: Always verify webhook signatures to ensure requests are authentic and haven't been tampered with.

#### Verification Process

1. **Get the signature** from the `x-webhook-signature` header
2. **Compute HMAC-SHA256** of the raw request body using your webhook secret
3. **Encode the result** in base64
4. **Compare** the computed signature with the received signature

#### Implementation Examples

**Node.js (using crypto module):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  return computedSignature === signature;
}
```

**Python (using hmac module):**

```python
import hmac
import hashlib
import base64

def verify_webhook_signature(body, signature, secret):
    computed_signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')

    return computed_signature == signature
```

**PHP (using hash_hmac function):**

```php
function verifyWebhookSignature($body, $signature, $secret) {
    $computedSignature = base64_encode(hash_hmac('sha256', $body, $secret, true));
    return hash_equals($computedSignature, $signature);
}
```

### Generic Handler Implementation

#### 1. Parse and Validate the Request

```
1. Extract the signature from headers
2. Read the raw request body
3. Verify the signature using your webhook secret
4. Parse the JSON body
5. Return 401 Unauthorized if verification fails
```

#### 2. Process the Event

```
1. Extract the event type from the request body
2. Route to appropriate handler based on event type
3. Process the event data according to your business logic
4. Return 200 OK on successful processing
5. Return appropriate error status for failures
```

## Available Events and Data Types

This implementation supports the following webhook events:

### 1. ACCOUNT_CREATED

Triggered when a new user account is created through authentication.

**Data Structure:**

```typescript
{
  accountUuid: string; // Unique account identifier
  createdAt: string; // ISO timestamp of account creation
  updatedAt: string; // ISO timestamp of last update
  lastSignedIn: string; // ISO timestamp of last sign-in
  address: string; // Wallet address
  namespace: string; // Chain namespace (e.g., "eip155", "solana")
  chainId: string; // Chain identifier
  profile: {
    profileUuid: string; // Unique profile identifier
    metadata: unknown; // Custom user metadata
    email: string | null; // User email (if provided)
  }
}
```

### 2. ACCOUNT_CONNECTED

Triggered when a user connects/signs in to their existing account.

**Data Structure:** Same as `ACCOUNT_CREATED`

### 3. ACCOUNT_METADATA_CHANGED

Triggered when user metadata is updated.

**Data Structure:** Same as `ACCOUNT_CREATED`

### 4. ACCOUNT_EMAIL_CHANGED

Triggered when user email is updated.

**Data Structure:** Same as `ACCOUNT_CREATED`

### 5. ACCOUNT_DELETED

Triggered when a user account is deleted.

**Data Structure:**

```typescript
{
  accountUuid: string; // Unique account identifier of deleted account
}
```

## Running This Example

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   WEBHOOK_SECRET=your_webhook_secret_from_reown_dashboard
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Configure webhook URL in Reown Dashboard:**
   Use `http://localhost:3000/handler` as your webhook endpoint URL for testing.

### Production Deployment

For production deployment:

1. **Use HTTPS**: Ensure your webhook endpoint uses HTTPS
2. **Environment Variables**: Set `WEBHOOK_SECRET` in your production environment
3. **Error Handling**: Implement proper error handling and logging
4. **Rate Limiting**: Consider implementing rate limiting for security
5. **Monitoring**: Set up monitoring and alerting for webhook failures

## Security Best Practices

1. **Always verify signatures** - Never process unverified webhook requests
2. **Use HTTPS** - Protect webhook data in transit
3. **Validate input data** - Sanitize and validate all incoming data
4. **Implement idempotency** - Handle duplicate webhook deliveries gracefully
5. **Log security events** - Monitor for suspicious webhook activity
6. **Keep secrets secure** - Store webhook secrets securely and rotate them regularly

## Troubleshooting

### Common Issues

**Signature Verification Failing:**

- Ensure you're using the raw request body for signature calculation
- Verify your webhook secret is correct
- Check that you're using HMAC-SHA256 with base64 encoding

**Missing Events:**

- Verify your webhook URL is accessible from the internet (for local development, use tools like [ngrok](https://ngrok.com/) to expose your local server)
- Check that your endpoint returns 200 status codes
- Review webhook configuration in Reown Dashboard

**Data Parsing Errors:**

- Ensure you're parsing JSON correctly
- Validate the event type before processing
- Handle unknown event types gracefully

## Support

For questions about Reown Authentication or webhook implementation:

- [Reown Documentation](https://docs.reown.com/cloud/reown-authentication)
- [GitHub Issues](https://github.com/reown-com/web-examples)
- [Community Discord](https://discord.gg/reown)
