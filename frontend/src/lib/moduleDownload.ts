import { ContentModule, ModuleSectionData, ContentBlock } from '@/types';

const serializeBlock = (b: ContentBlock): string => {
  const p = b.payload as any;
  switch (b.block_type) {
    case 'code': return `\n\`\`\`${p.language || ''}\n${p.code || ''}\n\`\`\`\n`;
    case 'diagram': return `\n**Diagram:** ${p.title || ''}\n\n` + '```mermaid\n' + (p.source || '') + '\n' + '```\n';
    case 'image': return `\n![${p.caption || ''}](${p.url || ''})\n`;
    case 'callout': return `\n> 💡 ${p.title ? p.title + ': ' : ''}${p.text || ''}\n`;
    case 'table': {
      const rows = [`| ${(p.headers || []).join(' | ')} |`, `| ${(p.headers || []).map(() => '---').join(' | ')} |`];
      (p.rows || []).forEach((r: string[]) => rows.push(`| ${r.join(' | ')} |`));
      return `\n${rows.join('\n')}\n`;
    }
    case 'video': return `\n**🎥 ${p.title || 'Video'}:** ${p.video_url || ''}\n`;
    case 'audio': return `\n**🎧 ${p.title || 'Audio'}:** ${p.url || ''}\n`;
    default: return `\n${p.text || ''}\n`;
  }
};

/**
 * Serializes a ContentModule into a ready-to-download Markdown string.
 * preview=true -> only overview + question titles (safe for locked premium modules).
 */
export const downloadModuleAsMarkdown = (
  module: ContentModule,
  companyName: string,
  preview = false
): void => {
  const sd: ModuleSectionData = module.section_data || {};
  const lines: string[] = [];
  lines.push(`# ${companyName} — ${module.title}`);
  lines.push('');
  lines.push(`> ${preview ? 'Preview — unlock to download full pack.' : 'Complete preparation module download · TieEdu'}`);
  lines.push('');

  if (sd.overview) {
    lines.push('## 1. Company Overview');
    lines.push('- **Profile:** ' + (sd.overview.companyInfo || ''));
    lines.push('- **Eligibility:** ' + (sd.overview.eligibility || ''));
    lines.push('- **Salary:** ' + (sd.overview.salaryBreakdown || ''));
    (sd.overview.reviews || []).forEach((r) => lines.push(`- ⭐ ${r.name} (${r.role}) ${r.rating}/5 — "${r.text}"`));
    lines.push('');
  }

  if (preview) {
    lines.push('## 🔒 Premium Sections (unlock to download)');
    const sections = [
      ['core_subjects', 'Core Subjects & PYQs'],
      ['interview_questions', 'Technical & Coding Questions'],
      ['cheatsheets', 'Quick Cheatsheets'],
      ['never_skip_topics', 'Never-Skip Topics'],
      ['last_minute_revision', 'Last-Minute Revision'],
      ['hr_round', 'HR & Behavioral'],
    ];
    // @ts-ignore — index access on section_data
    for (const [key, label] of sections) {
      const arr: unknown[] | undefined = sd[key as keyof ModuleSectionData] as unknown[];
      if (arr && arr.length > 0) lines.push(`- [ ] ${label} (${arr.length} items)`);
    }
    lines.push('');
    if (module.items && module.items.length > 0) {
      lines.push('## 🔒 Questions (titles preview)');
      module.items.forEach((it, i) => lines.push(`${i + 1}. ${it.question_text}`));
    }
  } else {
    (sd.core_subjects || []).forEach((sub) => {
      lines.push(`## 2. Core Subject — ${sub.subject}`);
      sub.topics.forEach((t) => {
        lines.push(`### ${t.title}`);
        lines.push(t.content);
        (t.pyqs || []).forEach((q) => lines.push(`- **PYQ ${q.year} (${q.frequency || ''}):** ${q.question}\n  - ${q.answer}`));
      });
      lines.push('');
    });

    (sd.interview_questions || []).forEach((q) => {
      lines.push(`## 3. Interview Q — [${q.category}] ${q.title}`);
      lines.push(`**Q:** ${q.question}`);
      lines.push(`**Solution:** ${q.solution}`);
      if (q.code) lines.push(`\n` + '```\n' + q.code + '\n' + '```' + '\n');
      lines.push('');
    });

    (sd.cheatsheets || []).forEach((c) => {
      lines.push(`## 4. Cheatsheet — ${c.title}`);
      lines.push(c.summary + '\n\n' + '```\n' + c.content + '\n' + '```');
      lines.push('');
    });

    (sd.never_skip_topics || []).forEach((n) => {
      lines.push(`## 5. NEVER SKIP — ${n.topic} (${n.priority})`);
      lines.push(n.notes);
      lines.push('');
    });

    (sd.last_minute_revision || []).forEach((l) => {
      lines.push(`## 6. Last-Minute — ${l.title}`);
      l.points.forEach((pt) => lines.push(`- [ ] ${pt}`));
      lines.push('');
    });

    (sd.hr_round || []).forEach((h) => {
      lines.push(`## 7. HR Q — ${h.question}`);
      lines.push(`**STAR Answer:** ${h.answer}`);
      (h.tips || []).forEach((t) => lines.push(`- Pro tip: ${t}`));
      lines.push('');
    });

    if (module.items && module.items.length > 0) {
      lines.push(`## Bonus — ${module.items.length} Question Item(s) with Solution Blocks`);
      module.items.forEach((it, i) => {
        lines.push(`### Q${i + 1}. ${it.question_text} (${it.difficulty} · ${it.role_tag || ''} · ${it.frequency_tag || ''})`);
        (it.blocks || []).forEach((b) => lines.push(serializeBlock(b)));
        lines.push('');
      });
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (s: string) => s.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  a.download = `${safe(companyName)}-${safe(module.title).slice(0, 40)}${preview ? '-preview' : ''}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};