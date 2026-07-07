import { createHmac } from 'crypto';

export const isWebhookSignatureValid = ({
  body,
  signature,
}: {
  body: string;
  signature: string;
}) => {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('WEBHOOK_SECRET is not set');
    return false;
  }

  const verifyingHash = createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  return verifyingHash === signature;
};
