// ============================================================================
// STACKED TABLES IN MARKDOWN — Phase 3, MOBILE_APP_UI_PLAN.md §3.2
//
// "Tables → stacked definition rows."
//
// A four-column markdown table on a 390px screen has ~85px per column, so every
// cell wraps to three or four lines and the reader cannot tell which value
// belongs to which header. `overflow-x: auto` does not fix it either: it just
// hides two of the columns.
//
// The fix is to stop rendering a table below `md` and render each row as a
// labelled block instead. CSS alone cannot do that — it needs the column header
// text, and CSS has no way to read a sibling `<th>` — so each `<td>` carries its
// header in a `data-label`, and `globals.css` paints it with `content: attr()`.
//
// Written against `hast` (the tree `react-markdown` produces) rather than raw
// markdown text, and as a plain recursive walk rather than `unist-util-visit`, so
// this adds no dependency for about forty lines.
// ============================================================================

/** The slice of `hast` this transform needs. Deliberately not a full type import. */
export interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const textOf = (node: HastNode): string => {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
};

const rowsOf = (table: HastNode): HastNode[] =>
  (table.children ?? [])
    .filter((child) => child.tagName === 'tbody' || child.tagName === 'thead')
    .flatMap((group) => (group.children ?? []).filter((row) => row.tagName === 'tr'));

const cellsOf = (row: HastNode): HastNode[] =>
  (row.children ?? []).filter((cell) => cell.tagName === 'td' || cell.tagName === 'th');

/**
 * Header labels for a table, from the first row that looks like a header.
 *
 * GFM requires a header row but tolerates tables written without one, and an
 * admin pasting into the editor will eventually do exactly that. Those tables get
 * no labels, and the CSS falls back to a plain stacked block — still readable,
 * just without the label.
 */
export const headerLabels = (table: HastNode): string[] => {
  for (const row of rowsOf(table)) {
    const cells = cellsOf(row);
    if (cells.length > 0 && cells.every((cell) => cell.tagName === 'th')) {
      return cells.map((cell) => textOf(cell).trim());
    }
  }
  return [];
};

/**
 * Tag every `<td>` with its column header.
 *
 * A header wider than the labels it describes, or a data row with more cells than
 * the header, both fall back to an empty label rather than a wrong one. An empty
 * `data-label` simply renders no label, which is the honest outcome.
 */
export const labelTableCells = (table: HastNode): HastNode => {
  const labels = headerLabels(table);
  if (labels.length === 0) return table;

  for (const row of rowsOf(table)) {
    cellsOf(row).forEach((cell, index) => {
      if (cell.tagName !== 'td') return;
      cell.properties = { ...cell.properties, 'data-label': labels[index] ?? '' };
    });
  }
  return table;
};

/** Walk the whole tree and label every table in it. */
export const labelAllTables = (node: HastNode): HastNode => {
  if (node.tagName === 'table') labelTableCells(node);
  (node.children ?? []).forEach(labelAllTables);
  return node;
};
