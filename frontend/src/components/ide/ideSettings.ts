/** IDE editor settings, kept apart from the editor so pages can read them without loading CodeMirror. */
export type IdeThemeId = 'warm' | 'github-light' | 'one-dark' | 'dracula' | 'high-contrast';

/** The five editor themes (PRACTICE_POLISH_PLAN.md §5.1). `dark` also turns the whole IDE frame dark. */
export const IDE_THEMES: ReadonlyArray<{ id: IdeThemeId; label: string; dark: boolean }> = [
  { id: 'warm', label: 'Warm Paper', dark: false },
  { id: 'github-light', label: 'GitHub Light', dark: false },
  { id: 'one-dark', label: 'One Dark', dark: true },
  { id: 'dracula', label: 'Dracula', dark: true },
  { id: 'high-contrast', label: 'High Contrast', dark: true },
];

export interface IdeSettings {
  fontSize: number;
  tabSize: 2 | 4;
  /** 'auto' follows the site: Warm Paper on light, One Dark on dark. */
  theme: 'auto' | IdeThemeId;
  wrap: boolean;
  /** What the ☀/☾ switch flips between (the student's last light and dark picks). */
  lastLight: IdeThemeId;
  lastDark: IdeThemeId;
}
export const DEFAULT_SETTINGS: IdeSettings = { fontSize: 15, tabSize: 4, theme: 'auto', wrap: false, lastLight: 'warm', lastDark: 'one-dark' };

const isTheme = (v: unknown): v is IdeThemeId => IDE_THEMES.some((t) => t.id === v);

/** Reads saved settings, including the old 'light' / 'dark' values. */
export function normaliseSettings(raw: unknown): IdeSettings {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) } as Omit<IdeSettings, 'theme'> & { theme: string };
  const theme = s.theme === 'light' ? 'warm' : s.theme === 'dark' ? 'one-dark' : s.theme === 'auto' || isTheme(s.theme) ? s.theme : 'auto';
  return {
    fontSize: Math.min(22, Math.max(12, Number(s.fontSize) || 15)),
    tabSize: s.tabSize === 2 ? 2 : 4,
    theme: theme as IdeSettings['theme'],
    wrap: !!s.wrap,
    lastLight: isTheme(s.lastLight) && !IDE_THEMES.find((t) => t.id === s.lastLight)!.dark ? s.lastLight : 'warm',
    lastDark: isTheme(s.lastDark) && IDE_THEMES.find((t) => t.id === s.lastDark)!.dark ? s.lastDark : 'one-dark',
  };
}

/** The theme actually shown. */
export function resolveTheme(s: IdeSettings, siteDark: boolean): IdeThemeId {
  return s.theme === 'auto' ? (siteDark ? 'one-dark' : 'warm') : s.theme;
}
export const themeIsDark = (id: IdeThemeId) => !!IDE_THEMES.find((t) => t.id === id)?.dark;

/** The ☀/☾ switch: to the other side, remembering where the student was. */
export function flipTheme(s: IdeSettings, siteDark: boolean): IdeSettings {
  const cur = resolveTheme(s, siteDark);
  return themeIsDark(cur)
    ? { ...s, theme: s.lastLight, lastDark: cur }
    : { ...s, theme: s.lastDark, lastLight: cur };
}

/** Picking a theme in ⚙ also updates what the switch flips to. */
export function pickTheme(s: IdeSettings, theme: IdeSettings['theme']): IdeSettings {
  if (theme === 'auto') return { ...s, theme };
  return themeIsDark(theme) ? { ...s, theme, lastDark: theme } : { ...s, theme, lastLight: theme };
}
