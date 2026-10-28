/**
 * WhatsApp sending through Meta's WhatsApp Cloud API (template messages).
 *
 * Configured entirely by environment; with any of the required values missing
 * `whatsappConfigured()` is false and nothing is ever sent:
 *   WHATSAPP_TOKEN            a system-user access token for the WhatsApp Business account
 *   WHATSAPP_PHONE_NUMBER_ID  the sending number's id (not the number itself)
 *   WHATSAPP_TEMPLATE         the approved template's name (one name, approved in each language)
 * Optional:
 *   WHATSAPP_API_VERSION      Graph API version, default v21.0
 *   WHATSAPP_LANG_HI / _EN    template language codes, default "hi" / "en"
 *
 * Business-initiated messages must use an approved template, so the text
 * itself lives in the template (lib/parentWhatsapp TEMPLATE_TEXT) and only the
 * parameters travel with each send.
 */
export type WaLang = 'hi' | 'en';

export function whatsappConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TEMPLATE);
}

export interface WaSendResult { ok: boolean; id: string | null; error: string | null }

export async function sendTemplate(
  to: string,
  lang: WaLang,
  params: string[],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<WaSendResult> {
  if (!whatsappConfigured(env)) return { ok: false, id: null, error: 'WhatsApp is not configured' };
  const version = env.WHATSAPP_API_VERSION || 'v21.0';
  const code = lang === 'hi' ? env.WHATSAPP_LANG_HI || 'hi' : env.WHATSAPP_LANG_EN || 'en';
  try {
    const res = await fetchImpl(`https://graph.facebook.com/${version}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: env.WHATSAPP_TEMPLATE,
          language: { code },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    const body: any = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, id: null, error: String(body?.error?.message || `HTTP ${res.status}`).slice(0, 300) };
    return { ok: true, id: body?.messages?.[0]?.id || null, error: null };
  } catch (e: any) {
    return { ok: false, id: null, error: String(e?.message || e).slice(0, 300) };
  }
}
