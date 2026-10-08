/**
 * Shared email layout and primitives.
 *
 * Hand-rolled table layout rather than a framework: every major client (Gmail
 * web, Gmail app, Outlook, Apple Mail) is still on partial CSS support, and a
 * 600px single-column table with inline styles is the only construct that
 * renders identically everywhere. No remote images in the shell — a logo that
 * fails to load is the classic "looks broken in Outlook" mail; the wordmark is
 * live text, so the email survives image blocking.
 *
 * Every template receives `href()` rather than raw URLs. It rewrites through
 * the click endpoint (see lib/email/links.ts) so clicks are attributed to the
 * message and the identity cookie is set on arrival. `unsubUrl` is the one
 * deliberate exception: an unsubscribe must work even when tracking is stripped
 * by a client, so it is a plain signed URL.
 */
import React from 'react';
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { EmailTemplateId } from '../../../data/db';

export interface TemplateProps {
  /** Lead first name; empty/undefined gets a neutral greeting, never "Hi undefined". */
  name?: string;
  /** Tracked link to a site-relative path. */
  href: (path: string) => string;
  /** Absolute, signed, tracking-free unsubscribe URL. */
  unsubUrl: string;
  /** Template-specific copy overrides. Missing keys fall back to copy defaults. */
  vars: Record<string, string>;
}

export interface TemplateDef {
  /** Subject line, ≤50 chars — inbox truncation, not a guideline. */
  subject: (p: TemplateProps) => string;
  /** Inbox preview text shown next to the subject. */
  preheader: (p: TemplateProps) => string;
  Component: React.ComponentType<TemplateProps>;
}

const BRAND = '#0284C7';
const DARK = '#10151C';
const BODY = '#374151';
const MUTED = '#6B7280';
const SURFACE = '#FAFAF9';
const BORDER = '#E5E7EB';

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export const V = (p: TemplateProps, key: string, fallback: string): string => {
  const v = p.vars && typeof p.vars[key] === 'string' ? p.vars[key].trim() : '';
  return v || fallback;
};

export const firstName = (p: TemplateProps): string => {
  const n = (p.name || '').trim();
  if (!n) return '';
  const first = n.split(/\s+/)[0];
  return first.length > 24 ? n.slice(0, 24) : first;
};

export const greeting = (p: TemplateProps): string => {
  const first = firstName(p);
  return first ? `Hi ${first},` : 'Hi there,';
};

export const Button: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    style={{
      display: 'inline-block',
      background: BRAND,
      color: '#FFFFFF',
      fontFamily: font,
      fontSize: '15px',
      fontWeight: 700,
      textDecoration: 'none',
      padding: '13px 30px',
      borderRadius: '8px',
      margin: '4px 0',
    }}
  >
    {children}
  </a>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontFamily: font, fontSize: '15px', lineHeight: '1.65', color: BODY, margin: '14px 0' }}>
    {children}
  </Text>
);

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h2" style={{ fontFamily: font, fontSize: '19px', fontWeight: 700, color: DARK, margin: '26px 0 6px' }}>
    {children}
  </Heading>
);

/** Checklist row. Text glyph, not an emoji — emoji render inconsistently in Outlook. */
export const Check: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontFamily: font, fontSize: '15px', lineHeight: '1.7', color: BODY, margin: '4px 0' }}>
    <span style={{ color: BRAND, fontWeight: 700 }}>&#10003;&nbsp;</span>
    {children}
  </Text>
);

export const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontFamily: font, fontSize: '13px', lineHeight: '1.6', color: MUTED, margin: '10px 0' }}>
    {children}
  </Text>
);

export const PriceRow: React.FC<{ label: string; price: string; strike?: string }> = ({ label, price, strike }) => (
  <Section style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '16px 18px', margin: '18px 0' }}>
    <Text style={{ fontFamily: font, fontSize: '14px', color: MUTED, margin: 0 }}>{label}</Text>
    <Text style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: DARK, margin: '4px 0 0' }}>
      {strike ? (
        <>
          <span style={{ color: MUTED, fontWeight: 400, fontSize: '18px', textDecoration: 'line-through' }}>{strike}</span>{' '}
        </>
      ) : null}
      {price}
    </Text>
  </Section>
);

export const FAQ: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <Section style={{ margin: '14px 0' }}>
    <Text style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: DARK, margin: 0 }}>{q}</Text>
    <Text style={{ fontFamily: font, fontSize: '14px', lineHeight: '1.6', color: BODY, margin: '4px 0 0' }}>{a}</Text>
  </Section>
);

/**
 * The shell. `preview` feeds <Preview> (inbox snippet); children are the body.
 */
export const Layout: React.FC<{
  preview: string;
  unsubUrl: string;
  children: React.ReactNode;
}> = ({ preview, unsubUrl, children }) => {
  const address = (process.env.EMAIL_POSTAL_ADDRESS || '').trim();
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: '#F3F4F6', margin: 0, padding: '24px 12px' }}>
        <Container
          style={{
            background: '#FFFFFF',
            maxWidth: '600px',
            margin: '0 auto',
            borderRadius: '12px',
            border: `1px solid ${BORDER}`,
            overflow: 'hidden',
          }}
        >
          <Section style={{ padding: '24px 32px 6px' }}>
            <Text style={{ fontFamily: font, fontSize: '21px', fontWeight: 800, color: DARK, margin: 0 }}>
              Tie<span style={{ color: BRAND }}>Edu</span>
            </Text>
            <Text style={{ fontFamily: font, fontSize: '12px', color: MUTED, margin: '2px 0 0' }}>
              Placement prep, done properly.
            </Text>
          </Section>
          <Hr style={{ borderColor: BORDER, margin: '14px 32px' }} />
          <Section style={{ padding: '4px 32px 8px' }}>{children}</Section>
          <Section style={{ background: SURFACE, padding: '18px 32px', borderTop: `1px solid ${BORDER}` }}>
            <Text style={{ fontFamily: font, fontSize: '12px', lineHeight: '1.7', color: MUTED, margin: 0 }}>
              You are receiving this because your address was added to the TieEdu list.
              {address ? (
                <>
                  <br />
                  TieEdu, {address}
                </>
              ) : null}
              <br />
              <a href={unsubUrl} style={{ color: MUTED, textDecoration: 'underline' }}>
                Unsubscribe
              </a>{' '}
              &nbsp;·&nbsp;
              <a href={`${process.env.NEXT_PUBLIC_SITE_URL || ''}/`} style={{ color: MUTED, textDecoration: 'underline' }}>
                tieedu.in
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export type { EmailTemplateId };
