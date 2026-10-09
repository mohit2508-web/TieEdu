/**
 * Notification adapters (spec §1). Every provider sits behind one interface so
 * it can be swapped or mocked — the console adapter is the default until real
 * WhatsApp / SMS / email credentials are configured.
 */

export interface OutboundMessage {
  to: string;
  subject?: string;
  text: string;
}

export interface NotificationProvider {
  readonly channel: 'whatsapp' | 'sms' | 'email';
  send(message: OutboundMessage): Promise<void>;
}

const ConsoleProvider = (channel: NotificationProvider['channel']): NotificationProvider => ({
  channel,
  async send(message) {
    console.log(`[notify:${channel}] → ${message.to}: ${message.subject ? message.subject + ' — ' : ''}${message.text}`);
  },
});

let whatsapp: NotificationProvider = ConsoleProvider('whatsapp');
let sms: NotificationProvider = ConsoleProvider('sms');
let email: NotificationProvider = ConsoleProvider('email');

/** Test/DI hook. */
export function setProviders(next: {
  whatsapp?: NotificationProvider;
  sms?: NotificationProvider;
  email?: NotificationProvider;
}) {
  if (next.whatsapp) whatsapp = next.whatsapp;
  if (next.sms) sms = next.sms;
  if (next.email) email = next.email;
}

export function sendWhatsApp(to: string, text: string) {
  return whatsapp.send({ to, text });
}

export function sendSms(to: string, text: string) {
  return sms.send({ to, text });
}

export function sendEmail(to: string, subject: string, text: string) {
  return email.send({ to, subject, text });
}

export function sendOtp(phone: string, code: string, purpose: string) {
  const label = purpose.toLowerCase().replace('_', ' ');
  return sendSms(phone, `Your TieEdu ${label} code is ${code}. It expires in 5 minutes.`);
}
