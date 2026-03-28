import { env } from './env.js';

export interface WhatsAppMessageInput {
  phoneNumber: string;
  title: string;
  body: string;
  ctaUrl?: string;
}

function normalizePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

function buildMessageBody(input: WhatsAppMessageInput) {
  return [input.title, input.body, input.ctaUrl].filter(Boolean).join('\n\n');
}

export async function sendWhatsAppMessage(input: WhatsAppMessageInput) {
  const to = normalizePhoneNumber(input.phoneNumber);
  const text = buildMessageBody(input);

  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[whatsapp:dev] -> ${to}\n${text}`);
    return { delivered: false, provider: 'dev-log' as const };
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          preview_url: Boolean(input.ctaUrl),
          body: text,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`WhatsApp send failed: ${body || response.statusText}`);
  }

  return { delivered: true, provider: 'whatsapp_cloud' as const };
}
