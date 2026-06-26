/**
 * lib/alertTokens.ts — signed unsubscribe tokens for alert emails.
 *
 * The token is an HMAC of the email address, so unsubscribe links only work
 * for the address they were issued to — nobody can unsubscribe someone else
 * by guessing a URL. Secret: set UNSUBSCRIBE_SECRET in Vercel env for a
 * dedicated key; falls back to RESEND_API_KEY so it works without new setup.
 */
import { createHmac } from 'crypto';

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || 'motavo-dev';
}

export function unsubscribeToken(email: string): string {
  return createHmac('sha256', secret()).update(email.toLowerCase().trim()).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  return Boolean(email && token) && unsubscribeToken(email) === token;
}

export function unsubscribeUrl(email: string): string {
  return `https://motavo.au/api/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`;
}
