/**
 * 文字列の視覚的な表示幅（全角=2、半角=1）を計算します。
 */
export function getVisualWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // 全角英数・ひらがな・カタカナ・漢字・全角記号などは幅2
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 視覚的な幅に合わせて末尾にスペースを埋めます。
 */
export function padEndVisual(str: string, targetWidth: number): string {
  const currentWidth = getVisualWidth(str);
  const diff = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(diff);
}

/**
 * Markdown テキスト内のすべてのテーブルを検出して、列幅を揃えて美しく整形します。
 */
export function formatMarkdownTables(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let tableLines: string[] = [];

  const flushTable = () => {
    if (tableLines.length === 0) return;

    // 行ごとにセルをパース
    const rows = tableLines.map((line) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
      if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
      return trimmed.split('|').map((cell) => cell.trim());
    });

    // 列数と各列の最大表示幅を計算
    const colCount = Math.max(...rows.map((r) => r.length));
    const colWidths: number[] = new Array(colCount).fill(3);

    rows.forEach((row) => {
      const isSeparator = row.length > 0 && row.every((cell) => /^:?-+:?$/.test(cell));
      if (!isSeparator) {
        row.forEach((cell, colIndex) => {
          colWidths[colIndex] = Math.max(colWidths[colIndex] || 3, getVisualWidth(cell));
        });
      }
    });

    // 各行を整形して再構成
    rows.forEach((row) => {
      const isSeparator = row.length > 0 && row.every((cell) => /^:?-+:?$/.test(cell));
      const cells: string[] = [];

      for (let c = 0; c < colCount; c++) {
        const cell = row[c] || '';
        const width = colWidths[c] || 3;

        if (isSeparator) {
          const leftColon = cell.startsWith(':');
          const rightColon = cell.endsWith(':');
          const dashCount = Math.max(3, width);
          cells.push((leftColon ? ':' : '') + '-'.repeat(dashCount) + (rightColon ? ':' : ''));
        } else {
          cells.push(padEndVisual(cell, width));
        }
      }

      result.push('| ' + cells.join(' | ') + ' |');
    });

    tableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      tableLines.push(line);
    } else {
      flushTable();
      result.push(line);
    }
  }
  flushTable();

  return result.join('\n');
}
