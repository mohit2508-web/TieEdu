import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';
import type { IdeThemeId } from './ideSettings';

/** Editor themes (PRACTICE_POLISH_PLAN.md §5.1): colours for the editor chrome and the syntax. */
interface Palette {
  dark: boolean; bg: string; fg: string; gutterBg: string; gutterFg: string; activeLine: string; activeGutter: string; selection: string; cursor: string;
  keyword: string; string: string; number: string; comment: string; fn: string; type: string; operator: string; macro: string; property: string; bracket: string;
}

const P: Record<IdeThemeId, Palette> = {
  warm: {
    dark: false, bg: '#FFFDF8', fg: '#2A1E14', gutterBg: '#F8F1E5', gutterFg: '#8A7A68', activeLine: '#FFF4DF', activeGutter: '#FBE7C4', selection: '#FFE2B0', cursor: '#C2410C',
    keyword: '#9A3412', string: '#0B6E4F', number: '#B45309', comment: '#8A7A68', fn: '#0B4F4A', type: '#6D28D9', operator: '#5B4636', macro: '#A16207', property: '#1D4ED8', bracket: '#5B4636',
  },
  'github-light': {
    dark: false, bg: '#FFFFFF', fg: '#24292F', gutterBg: '#FFFFFF', gutterFg: '#8C959F', activeLine: '#F6F8FA', activeGutter: '#EAEEF2', selection: '#CCE4FF', cursor: '#0969DA',
    keyword: '#CF222E', string: '#0A3069', number: '#0550AE', comment: '#6E7781', fn: '#8250DF', type: '#953800', operator: '#0550AE', macro: '#CF222E', property: '#0550AE', bracket: '#24292F',
  },
  'one-dark': {
    dark: true, bg: '#282C34', fg: '#ABB2BF', gutterBg: '#282C34', gutterFg: '#636D83', activeLine: '#2C313C', activeGutter: '#2C313C', selection: '#3E4451', cursor: '#528BFF',
    keyword: '#C678DD', string: '#98C379', number: '#D19A66', comment: '#7F848E', fn: '#61AFEF', type: '#E5C07B', operator: '#56B6C2', macro: '#C678DD', property: '#E06C75', bracket: '#ABB2BF',
  },
  dracula: {
    dark: true, bg: '#282A36', fg: '#F8F8F2', gutterBg: '#282A36', gutterFg: '#6272A4', activeLine: '#343746', activeGutter: '#343746', selection: '#44475A', cursor: '#F8F8F0',
    keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9', comment: '#6272A4', fn: '#50FA7B', type: '#8BE9FD', operator: '#FF79C6', macro: '#FF79C6', property: '#66D9EF', bracket: '#F8F8F2',
  },
  'high-contrast': {
    dark: true, bg: '#000000', fg: '#FFFFFF', gutterBg: '#000000', gutterFg: '#D0D0D0', activeLine: '#1C1C1C', activeGutter: '#1C1C1C', selection: '#264F78', cursor: '#FFD700',
    keyword: '#6CB6FF', string: '#FFB27A', number: '#B5F0A8', comment: '#9AD58A', fn: '#FFF59A', type: '#5EEAD4', operator: '#FFFFFF', macro: '#FF9EDB', property: '#9CDCFE', bracket: '#FFD700',
  },
};

const cache = new Map<IdeThemeId, Extension>();

export function editorTheme(id: IdeThemeId): Extension {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = P[id];
  const chrome = EditorView.theme({
    '&': { color: c.fg, backgroundColor: c.bg },
    '.cm-content': { caretColor: c.cursor },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: c.cursor, borderLeftWidth: '2px' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: c.selection },
    '.cm-gutters': { backgroundColor: c.gutterBg, color: c.gutterFg, border: 'none' },
    '.cm-activeLine': { backgroundColor: c.activeLine },
    '.cm-activeLineGutter': { backgroundColor: c.activeGutter, color: c.fg },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: c.selection, outline: `1px solid ${c.bracket}` },
    '.cm-tooltip': { backgroundColor: c.dark ? '#1F2229' : '#FFFFFF', color: c.fg, border: `1px solid ${c.dark ? '#3E4451' : '#E8DFD0'}` },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: c.selection, color: c.fg },
    '.cm-foldPlaceholder': { backgroundColor: c.activeLine, color: c.gutterFg, border: 'none' },
  }, { dark: c.dark });
  const syntax = HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.modifier, t.definitionKeyword, t.moduleKeyword], color: c.keyword, fontWeight: id === 'high-contrast' ? '700' : '500' },
    { tag: [t.string, t.special(t.string), t.character], color: c.string },
    { tag: [t.number, t.bool, t.null, t.atom], color: c.number },
    { tag: [t.comment, t.lineComment, t.blockComment], color: c.comment, fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: c.fn },
    { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: c.type },
    { tag: [t.operator, t.compareOperator, t.arithmeticOperator, t.logicOperator], color: c.operator },
    { tag: [t.processingInstruction, t.meta], color: c.macro },
    { tag: [t.propertyName], color: c.property },
    { tag: [t.bracket, t.paren, t.brace, t.squareBracket], color: c.bracket },
    { tag: t.invalid, color: '#FF5370' },
  ]);
  const ext = [chrome, syntaxHighlighting(syntax)];
  cache.set(id, ext);
  return ext;
}
