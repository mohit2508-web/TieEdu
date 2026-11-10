/**
 * Shared email layout and primitives.
 *
 * Hand-rolled table layout rather than a framework: every major client (Gmail
 * web, Gmail app, Outlook, Apple Mail) is still on partial CSS support, and a
 * 600px single-column table with inline styles is the only construct that
 * renders identically everywhere. The header carries the real TiEEdu logo as a
 * hosted PNG (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §1) — SVG is not rendered by
 * Gmail or Outlook — with alt text styled as the wordmark, so an inbox that
 * blocks images still shows "TiEEdu" in the brand colour, not a broken box.
 *
 * Every template receives `href()` rather than raw URLs. It rewrites through
 * the click endpoint (see lib/email/links.ts) so clicks are attributed to the
 * message and the identity cookie is set on arrival. `unsubUrl` is the one
 * deliberate exception: an unsubscribe must work even when tracking is stripped
 * by a client, so it is a plain signed URL.
 */
import React from 'react';
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from '@react-email/components';
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
  /**
   * An account message (reset, receipt, result, drive, support) rather than
   * marketing: direct links, and an account footer with no "Unsubscribe".
   */
  transactional?: boolean;
}

export interface TemplateDef {
  /** Subject line, ≤50 chars — inbox truncation, not a guideline. */
  subject: (p: TemplateProps) => string;
  /** Inbox preview text shown next to the subject. */
  preheader: (p: TemplateProps) => string;
  Component: React.ComponentType<TemplateProps>;
}

// Warm Paper (UI_REDESIGN_PLAN_V3 §2). Email clients need literal colours.
const BRAND = '#0B4F4A'; // teal: links and ticks (amber fails as text on white)
const ACTION = '#FFA41B'; // the amber button, with dark ink
const ACTION_EDGE = '#D9800A';
const LOGO = '#F84109'; // the logo's own colour, never changed
const DARK = '#2A1E14';
const BODY = '#3B2F25';
const MUTED = '#6B5B4B';
const SURFACE = '#FBF4E8';
const BORDER = '#E8DFD0';

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

/**
 * The call to action. A table cell carries the colour and padding, so Outlook
 * (which ignores padding on links) still draws a full-size button; the link
 * inside fills it so the whole button is clickable everywhere else.
 */
export const Button: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ margin: '22px 0 8px' }}>
    <tbody>
      <tr>
        <td
          align="center"
          // Legacy attribute Outlook reads; not in React's typings.
          {...({ bgcolor: ACTION } as Record<string, string>)}
          style={{ background: ACTION, borderRadius: '10px', borderBottom: `3px solid ${ACTION_EDGE}` }}
        >
          <a
            href={href}
            style={{
              display: 'inline-block',
              padding: '14px 34px',
              fontFamily: font,
              fontSize: '16px',
              fontWeight: 700,
              color: DARK,
              textDecoration: 'none',
              borderRadius: '10px',
            }}
          >
            {children}
          </a>
        </td>
      </tr>
    </tbody>
  </table>
);

/** The one big line at the top of an email — what it is about, at a glance. */
export const Headline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h1" style={{ fontFamily: font, fontSize: '26px', lineHeight: '1.25', fontWeight: 800, color: DARK, margin: '6px 0 4px', letterSpacing: '-0.3px' }}>
    {children}
  </Heading>
);

/** A soft panel for key facts: a score, a receipt, what a plan contains. */
export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Section style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '6px 20px', margin: '18px 0' }}>
    {children}
  </Section>
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
  transactional?: boolean;
}> = ({ preview, unsubUrl, children, transactional = false }) => {
  const address = (process.env.EMAIL_POSTAL_ADDRESS || '').trim();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tieedu.in').replace(/\/+$/, '');
  const link = { color: MUTED, textDecoration: 'underline' } as const;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: '#FFF8EE', margin: 0, padding: '28px 12px' }}>
        <Container
          style={{
            background: '#FFFFFF',
            maxWidth: '600px',
            margin: '0 auto',
            borderRadius: '16px',
            border: `1px solid ${BORDER}`,
            overflow: 'hidden',
          }}
        >
          {/* Brand bar */}
          <Section style={{ background: BRAND, height: '6px', lineHeight: '6px', fontSize: '1px' }}>&nbsp;</Section>

          {/* Header: the real logo, on white so it never vanishes in dark mode */}
          <Section style={{ padding: '22px 32px 8px', background: '#FFFFFF' }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
              <tbody>
                <tr>
                  <td>
                    <a href={`${site}/`} style={{ textDecoration: 'none' }}>
                      <Img
                        src={`${site}/email/logo.png`}
                        width="96"
                        height="62"
                        alt="TiEEdu"
                        style={{ display: 'block', border: 0, fontFamily: font, fontSize: '24px', fontWeight: 800, color: LOGO }}
                      />
                    </a>
                  </td>
                  <td align="right" style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', color: BRAND, textTransform: 'uppercase' }}>
                    Train · Test · Track
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Hr style={{ borderColor: BORDER, margin: '10px 32px 4px' }} />

          <Section style={{ padding: '10px 32px 18px' }}>{children}</Section>

          {/* Footer */}
          <Section style={{ background: SURFACE, padding: '22px 32px', borderTop: `1px solid ${BORDER}` }}>
            <Text style={{ fontFamily: font, fontSize: '13px', lineHeight: '1.7', color: DARK, fontWeight: 700, margin: 0 }}>
              TiEEdu — placement prep, done properly.
            </Text>
            <Text style={{ fontFamily: font, fontSize: '12px', lineHeight: '1.8', color: MUTED, margin: '6px 0 0' }}>
              <a href={`${site}/contact`} style={link}>Help &amp; support</a>
              &nbsp;·&nbsp;
              <a href={`${site}/privacy`} style={link}>Privacy</a>
              &nbsp;·&nbsp;
              {transactional ? (
                <a href={`${site}/account/notifications`} style={link}>Email settings</a>
              ) : (
                <a href={unsubUrl} style={link}>Unsubscribe</a>
              )}
              <br />
              <a href="https://www.linkedin.com/company/tieedu/" style={link}>LinkedIn</a>
              &nbsp;·&nbsp;
              <a href="https://x.com/TiEEdu" style={link}>X</a>
              &nbsp;·&nbsp;
              <a href="https://www.facebook.com/TiEEdu" style={link}>Facebook</a>
            </Text>
            <Text style={{ fontFamily: font, fontSize: '11px', lineHeight: '1.7', color: MUTED, margin: '10px 0 0' }}>
              {transactional
                ? 'You are getting this because of activity on your TiEEdu account.'
                : 'You are getting this because you have a TiEEdu account or signed up for updates.'}
              <br />
              © {new Date().getFullYear()} TiEEdu Technologies{address ? ` · ${address}` : ''}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
