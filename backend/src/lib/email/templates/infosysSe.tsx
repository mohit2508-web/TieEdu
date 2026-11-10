/**
 * Infosys SE campaign (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §2.3) — the one-off
 * announcement to final-year and graduated students.
 *
 * More colourful than the other templates on purpose: it is a launch, and the
 * owner asked for it to read as an official TiEEdu mail. The colour still comes
 * only from hosted PNGs (public/email/infosys, drawn by
 * scripts/email-art/infosys_se_art.py) and table-cell backgrounds, because
 * Gmail and Outlook drop CSS gradients and never render SVG. Every image has
 * alt text, so an inbox that blocks images still reads in order.
 *
 * The pattern numbers mirror the company page; change both together.
 */
import React from 'react';
import { Img } from '@react-email/components';
import { Button, H2, Layout, P, TemplateProps, V, firstName } from './base';

const TEAL = '#0B4F4A';
const AMBER = '#FFA41B';
const ORANGE = '#F84109';
const DARK = '#2A1E14';
const BODY = '#3B2F25';
const MUTED = '#6B5B4B';
const BORDER = '#E8DFD0';
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const PREP_PATH = '/prep/infosys-systems-engineer';

const SECTIONS: { name: string; qs: number; min: number; colour: string }[] = [
  { name: 'Mathematical Ability', qs: 10, min: 35, colour: TEAL },
  { name: 'Reasoning Ability', qs: 15, min: 25, colour: '#4078E6' },
  { name: 'Verbal Ability', qs: 20, min: 20, colour: '#8A4CD6' },
  { name: 'Pseudocode', qs: 5, min: 10, colour: ORANGE },
  { name: 'Puzzle Solving', qs: 4, min: 10, colour: '#16A064' },
];

/** Outlook reads the legacy bgcolor attribute; React's typings do not have it. */
const bg = (colour: string) => ({ bgcolor: colour } as Record<string, string>);

const T: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'separate', ...style }}>
    <tbody>{children}</tbody>
  </table>
);

const txt = (size: number, colour: string, weight: number = 400): React.CSSProperties => ({
  fontFamily: font,
  fontSize: `${size}px`,
  lineHeight: 1.55,
  color: colour,
  fontWeight: weight,
  margin: 0,
});

/** A small coloured label above a section heading. */
const Eyebrow: React.FC<{ colour: string; children: React.ReactNode }> = ({ colour, children }) => (
  <p style={{ ...txt(12, colour, 800), letterSpacing: '1.5px', textTransform: 'uppercase', margin: '30px 0 0' }}>{children}</p>
);

/** One pillar of Train · Test · Track: icon, coloured tint, a left accent. */
const Pillar: React.FC<{
  site: string;
  icon: string;
  step: string;
  title: string;
  colour: string;
  tint: string;
  children: React.ReactNode;
}> = ({ site, icon, step, title, colour, tint, children }) => (
  <T style={{ margin: '12px 0' }}>
    <tr>
      <td
        {...bg(tint)}
        style={{ background: tint, borderLeft: `5px solid ${colour}`, borderRadius: '12px', padding: '18px 18px 16px' }}
      >
        <T>
          <tr>
            <td width="64" valign="top" style={{ width: '64px' }}>
              <Img src={`${site}/email/infosys/${icon}.png`} width="52" height="52" alt="" style={{ display: 'block', border: 0, borderRadius: '13px' }} />
            </td>
            <td valign="top">
              <p style={{ ...txt(11, colour, 800), letterSpacing: '1.5px' }}>{step}</p>
              <p style={{ ...txt(18, DARK, 800), margin: '2px 0 6px' }}>{title}</p>
              {children}
            </td>
          </tr>
        </T>
      </td>
    </tr>
  </T>
);

const Item: React.FC<{ colour: string; children: React.ReactNode }> = ({ colour, children }) => (
  <p style={{ ...txt(14, BODY), margin: '5px 0' }}>
    <span style={{ color: colour, fontWeight: 800 }}>&#10003;&nbsp;</span>
    {children}
  </p>
);

const Step: React.FC<{ n: number; colour: string; children: React.ReactNode }> = ({ n, colour, children }) => (
  <T style={{ margin: '10px 0' }}>
    <tr>
      <td width="46" valign="top" style={{ width: '46px' }}>
        <T style={{ width: '34px' }}>
          <tr>
            <td
              align="center"
              {...bg(colour)}
              style={{ background: colour, borderRadius: '17px', width: '34px', height: '34px', ...txt(16, '#FFFFFF', 800), lineHeight: '34px' }}
            >
              {n}
            </td>
          </tr>
        </T>
      </td>
      <td valign="middle" style={{ ...txt(15, BODY), paddingTop: '6px' }}>
        {children}
      </td>
    </tr>
  </T>
);

/** A full-width coloured note: urgency (amber) or the fraud warning (red). */
const Callout: React.FC<{ colour: string; tint: string; title: string; children: React.ReactNode }> = ({ colour, tint, title, children }) => (
  <T style={{ margin: '18px 0' }}>
    <tr>
      <td {...bg(tint)} style={{ background: tint, border: `1px solid ${colour}`, borderRadius: '12px', padding: '16px 18px' }}>
        <p style={{ ...txt(15, colour, 800), margin: '0 0 6px' }}>{title}</p>
        {children}
      </td>
    </tr>
  </T>
);

export const InfosysSe: React.FC<TemplateProps> = (p) => {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tieedu.in').replace(/\/+$/, '');
  const start = p.href(PREP_PATH);
  const first = firstName(p);
  const senderName = V(p, 'sender_name', 'Team TiEEdu');
  const senderRole = V(p, 'sender_role', '');
  const contactEmail = V(p, 'contact_email', 'contact@tieedu.in');
  const contactPhone = V(p, 'contact_phone', '');
  const totalQs = SECTIONS.reduce((n, s) => n + s.qs, 0);
  const totalMin = SECTIONS.reduce((n, s) => n + s.min, 0);
  const th: React.CSSProperties = { ...txt(12, '#FFFFFF', 800), letterSpacing: '1px', textTransform: 'uppercase', padding: '12px 14px' };
  const td: React.CSSProperties = { ...txt(14, BODY), padding: '11px 14px', borderTop: `1px solid ${BORDER}` };

  return (
    <Layout preview="54 questions, 100 minutes — 25 lessons, full mocks and a readiness score, built only for Infosys SE." unsubUrl={p.unsubUrl}>
      {/* Hero */}
      <a href={start} style={{ textDecoration: 'none' }}>
        <Img
          src={`${site}/email/infosys/hero.png`}
          width="536"
          alt="Infosys System Engineer — your complete prep plan is live on TiEEdu"
          style={{ display: 'block', width: '100%', maxWidth: '536px', height: 'auto', border: 0, borderRadius: '14px', margin: '8px 0 20px', ...txt(20, TEAL, 800) }}
        />
      </a>

      <P>{first ? `Dear ${first},` : 'Dear Student,'}</P>
      <P>
        Infosys System Engineer hiring is one of the biggest fresher drives every year. Thousands of
        students apply — and the ones who get selected are the ones who <strong>practised the real
        test pattern before the test</strong>.
      </P>
      <P>
        So we have built a <strong style={{ color: TEAL }}>complete Infosys SE preparation program on TiEEdu</strong>, made
        only for this exam.
      </P>

      {/* Test pattern */}
      <Eyebrow colour={ORANGE}>Step 1 · Know the exam</Eyebrow>
      <H2>The real test pattern</H2>
      <P>
        The Infosys SE Online Assessment has <strong>{totalQs} questions in {totalMin} minutes</strong>:
      </P>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ borderCollapse: 'separate', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', margin: '6px 0 14px' }}
      >
        <tbody>
          <tr {...bg(TEAL)} style={{ background: TEAL }}>
            <td style={th}>Section</td>
            <td align="center" style={th}>Questions</td>
            <td align="center" style={th}>Time</td>
          </tr>
          {SECTIONS.map((s, i) => (
            <tr key={s.name} {...bg(i % 2 ? '#FFFFFF' : '#FBF8F3')} style={{ background: i % 2 ? '#FFFFFF' : '#FBF8F3' }}>
              <td style={{ ...td, borderLeft: `4px solid ${s.colour}`, fontWeight: 700, color: DARK }}>{s.name}</td>
              <td align="center" style={{ ...td, fontWeight: 800, color: s.colour }}>{s.qs}</td>
              <td align="center" style={td}>{s.min} min</td>
            </tr>
          ))}
          <tr {...bg('#FFF1D9')} style={{ background: '#FFF1D9' }}>
            <td style={{ ...td, borderTop: `2px solid ${AMBER}`, fontWeight: 800, color: DARK }}>Total</td>
            <td align="center" style={{ ...td, borderTop: `2px solid ${AMBER}`, fontWeight: 800, color: DARK }}>{totalQs}</td>
            <td align="center" style={{ ...td, borderTop: `2px solid ${AMBER}`, fontWeight: 800, color: DARK }}>{totalMin} min</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...txt(14, BODY), margin: '0 0 8px' }}>
        <strong>Plus a writing task:</strong> an email of 120–150 words.
      </p>
      <T style={{ margin: '12px 0 4px' }}>
        <tr>
          <td style={{ ...txt(13, MUTED, 700), paddingBottom: '8px' }}>After the online test:</td>
        </tr>
        <tr>
          <td>
            <span style={{ display: 'inline-block', background: '#E6F2F0', color: TEAL, borderRadius: '20px', padding: '7px 14px', ...txt(13, TEAL, 800), margin: '0 6px 6px 0' }}>
              Online Test
            </span>
            <span style={{ ...txt(16, MUTED, 800), margin: '0 6px 0 0' }}>&rarr;</span>
            <span style={{ display: 'inline-block', background: '#EEE8FB', borderRadius: '20px', padding: '7px 14px', ...txt(13, '#5C36C4', 800), margin: '0 6px 6px 0' }}>
              Technical Interview
            </span>
            <span style={{ ...txt(16, MUTED, 800), margin: '0 6px 0 0' }}>&rarr;</span>
            <span style={{ display: 'inline-block', background: '#FFEDE4', borderRadius: '20px', padding: '7px 14px', ...txt(13, '#B53006', 800), margin: '0 0 6px' }}>
              HR Interview
            </span>
          </td>
        </tr>
      </T>

      {/* Train · Test · Track */}
      <Eyebrow colour={TEAL}>Step 2 · Prepare</Eyebrow>
      <H2>What you get on TiEEdu: Train · Test · Track</H2>

      <Pillar site={site} icon="train" step="1 · TRAIN" title="25 topic lessons" colour={TEAL} tint="#E9F4F2">
        <p style={txt(14, BODY)}>
          Every lesson covers one Infosys topic — percentages, profit &amp; loss, time &amp; work, seating
          arrangement, reading comprehension, pseudocode and more.
        </p>
        <Item colour={TEAL}>Rules and formulas</Item>
        <Item colour={TEAL}>Worked examples in the Infosys style</Item>
        <Item colour={TEAL}>Common traps to avoid</Item>
        <Item colour={TEAL}>5 practice questions with answers explained</Item>
        <p style={{ ...txt(13, TEAL, 800), margin: '10px 0 0' }}>
          <span style={{ background: AMBER, color: DARK, borderRadius: '6px', padding: '2px 8px' }}>FREE</span>
          &nbsp; The first lesson of every section is free.
        </p>
      </Pillar>

      <Pillar site={site} icon="test" step="2 · TEST" title="Practise in the real exam format" colour={ORANGE} tint="#FFF0E8">
        <Item colour={ORANGE}>
          <strong>Full mock tests</strong> in the exact Infosys pattern — 54 questions, 100 minutes, timed, secure mode
        </Item>
        <Item colour={ORANGE}>
          <strong>Section tests</strong> for Math, Reasoning, Verbal, Pseudocode and Puzzles — practise your weak section again and again
        </Item>
        <Item colour={ORANGE}>
          <strong>Email-writing practice</strong> with model answers
        </Item>
      </Pillar>

      <Pillar site={site} icon="track" step="3 · TRACK" title="Know exactly where you stand" colour="#4078E6" tint="#EBF1FD">
        <Item colour="#4078E6">
          A <strong>readiness score</strong> that shows how prepared you are for Infosys
        </Item>
        <Item colour="#4078E6">
          A <strong>day-by-day plan</strong> up to your test date
        </Item>
        <Item colour="#4078E6">
          Your <strong>weak areas</strong> and what to fix next
        </Item>
      </Pillar>

      {/* Interview */}
      <Img
        src={`${site}/email/infosys/interview.png`}
        width="536"
        alt="Interview prep — 32 technical and 12 HR questions with model answers"
        style={{ display: 'block', width: '100%', maxWidth: '536px', height: 'auto', border: 0, borderRadius: '14px', margin: '26px 0 12px', ...txt(18, '#5C36C4', 800) }}
      />
      <T>
        <tr>
          <td valign="top" width="50%" style={{ paddingRight: '6px' }}>
            <T>
              <tr>
                <td {...bg('#F2EEFC')} style={{ background: '#F2EEFC', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={txt(26, '#5C36C4', 800)}>32</p>
                  <p style={txt(14, DARK, 800)}>Technical questions</p>
                  <p style={{ ...txt(13, MUTED), marginTop: '4px' }}>Project, OOPs, DBMS, SQL, DSA — with model answers</p>
                </td>
              </tr>
            </T>
          </td>
          <td valign="top" width="50%" style={{ paddingLeft: '6px' }}>
            <T>
              <tr>
                <td {...bg('#FFF1D9')} style={{ background: '#FFF1D9', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={txt(26, '#C06A00', 800)}>12</p>
                  <p style={txt(14, DARK, 800)}>HR questions</p>
                  <p style={{ ...txt(13, MUTED), marginTop: '4px' }}>Relocation, shifts, documents, “Tell me about yourself”</p>
                </td>
              </tr>
            </T>
          </td>
        </tr>
      </T>

      {/* Today */}
      <Eyebrow colour="#16A064">Step 3 · Start today</Eyebrow>
      <H2>Do these 3 things today</H2>
      <Step n={1} colour={TEAL}>
        Log in to TiEEdu and open{' '}
        <a href={start} style={{ color: TEAL, fontWeight: 700 }}>
          Infosys System Engineer
        </a>
      </Step>
      <Step n={2} colour={ORANGE}>
        Set your test date — or pick the default <strong>50-day plan</strong>
      </Step>
      <Step n={3} colour="#4078E6">
        Finish <strong>one free lesson</strong> and <strong>one section test</strong> to see your current level
      </Step>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
        <tbody>
          <tr>
            <td align="center">
              <Button href={start}>Start my Infosys plan &rarr;</Button>
            </td>
          </tr>
        </tbody>
      </table>

      <Callout colour="#C06A00" tint="#FFF6E5" title="Why start now?">
        <p style={txt(14, BODY)}>
          Once Infosys announces the drive dates, you will get very little time. Students who start
          today will have finished the lessons and taken several mocks by then. Just{' '}
          <strong>2 hours a day</strong> is enough — but you have to start now.
        </p>
      </Callout>

      <T style={{ margin: '22px 0' }}>
        <tr>
          <td align="center" {...bg(TEAL)} style={{ background: TEAL, borderRadius: '12px', padding: '20px 22px' }}>
            <p style={{ ...txt(17, '#FFFFFF', 800), lineHeight: 1.45 }}>
              The offer letter goes to the student who prepared,
              <br />
              <span style={{ color: AMBER }}>not the one who waited.</span>
            </p>
          </td>
        </tr>
      </T>

      <Callout colour="#C62828" tint="#FDECEC" title="Important: Infosys never charges a fee">
        <p style={txt(14, BODY)}>
          Infosys never charges any fee for recruitment. Do not trust anyone who asks for money in
          Infosys&rsquo;s name.
        </p>
      </Callout>

      <P>
        Questions? Just reply to this email or write to{' '}
        <a href={`mailto:${contactEmail}`} style={{ color: TEAL, fontWeight: 700 }}>
          {contactEmail}
        </a>
        {contactPhone ? <> or call {contactPhone}</> : null}.
      </P>
      <P>All the best — let&rsquo;s crack Infosys together!</P>

      <p style={{ ...txt(15, BODY), margin: '22px 0 0' }}>Warm regards,</p>
      <p style={{ ...txt(16, DARK, 800), margin: '4px 0 0' }}>{senderName}</p>
      {senderRole ? <p style={txt(14, MUTED)}>{senderRole}</p> : null}
      <p style={{ ...txt(14, ORANGE, 800), margin: '2px 0 0' }}>TiEEdu · tieedu.in</p>
    </Layout>
  );
};
