/** IDE editor settings, kept apart from the editor so pages can read them without loading CodeMirror. */
export interface IdeSettings { fontSize: number; tabSize: 2 | 4; theme: 'auto' | 'light' | 'dark'; wrap: boolean }
export const DEFAULT_SETTINGS: IdeSettings = { fontSize: 15, tabSize: 4, theme: 'auto', wrap: false };
