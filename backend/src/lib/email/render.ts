/**
 * Template rendering: React element → { subject, html, text }.
 *
 * Rendered twice from the same element — once as HTML, once via react-email's
 * plain-text mode. A text/plain part is not optional: clients that strip HTML
 * (and several spam filters) score an email with no text alternative as
 * suspicious, and the plain-text version is what those recipients actually read.
 */
import React from 'react';
import { render } from '@react-email/render';
import { TEMPLATES } from './templates/registry';
import type { TemplateProps } from './templates/base';
import type { EmailTemplateId } from '../../data/db';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderTemplate(
  templateId: EmailTemplateId,
  props: TemplateProps
): Promise<RenderedEmail> {
  const def = TEMPLATES[templateId];
  if (!def) throw new Error(`Unknown email template: ${templateId}`);

  // createElement rather than a direct call: ComponentType may legally be a
  // class component, which is not callable, and the registry's type admits both.
  const element = React.createElement(def.Component, props);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return {
    subject: def.subject(props),
    html,
    text,
  };
}

/** Subject + preview copy for the admin campaign builder's template picker. */
export function templatePreviewInfo(
  templateId: EmailTemplateId
): { subject: string; preheader: string } | null {
  const def = TEMPLATES[templateId];
  if (!def) return null;
  const dummy = { vars: {}, href: (p: string) => p, unsubUrl: '#' } as TemplateProps;
  return { subject: def.subject(dummy), preheader: def.preheader(dummy) };
}
