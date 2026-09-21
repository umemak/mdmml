import { formatMarkdownTables } from './tableFormatter';

interface ParsedTable {
  headerName: string;
  measureCount: number;
  parts: Array<{ name: string; measures: string[] }>;
}

/**
 * テーブル行から行配列（セル配列）を抽出します。
 */
function parseRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Markdown 文字列から MML テーブルを抽出・解析します。
 */
function parseMmlTable(markdown: string): {
  tableStartIndex: number;
  tableEndIndex: number;
  parsed: ParsedTable | null;
} {
  const lines = markdown.split('\n');
  let tableStartIndex = -1;
  let tableEndIndex = -1;
  const tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      if (tableStartIndex === -1) tableStartIndex = i;
      tableEndIndex = i;
      tableLines.push(lines[i]);
    } else if (tableStartIndex !== -1) {
      break;
    }
  }

  if (tableLines.length < 3) {
    return { tableStartIndex: -1, tableEndIndex: -1, parsed: null };
  }

  const headerRow = parseRow(tableLines[0]);
  const headerName = headerRow[0] || 'name';

  const parts: Array<{ name: string; measures: string[] }> = [];

  for (let i = 2; i < tableLines.length; i++) {
    const row = parseRow(tableLines[i]);
    if (row.length === 0) continue;
    const partName = row[0];
    const measures = row.slice(1);
    if (!partName) continue;
    parts.push({ name: partName, measures });
  }

  const maxMeasures = Math.max(
    headerRow.length - 1,
    ...parts.map((p) => p.measures.length),
    0
  );

  return {
    tableStartIndex,
    tableEndIndex,
    parsed: {
      headerName,
      measureCount: maxMeasures,
      parts,
    },
  };
}

/**
 * 既存の楽譜 Markdown に、新規解析された楽譜 Markdown の小節を末尾に追加（マージ）します。
 * 小節番号は既存の最大小節番号から連番（例: 既存が1〜4小節なら次は5小節〜）で自動延長されます。
 */
export function mergeScoreMarkdowns(
  existingMarkdown: string,
  newMarkdown: string
): string {
  const existingInfo = parseMmlTable(existingMarkdown);
  const newInfo = parseMmlTable(newMarkdown);

  // どちらかにテーブルが存在しない場合はフォールバック
  if (!existingInfo.parsed) {
    return newMarkdown;
  }
  if (!newInfo.parsed) {
    return existingMarkdown;
  }

  const existingTable = existingInfo.parsed;
  const newTable = newInfo.parsed;

  const existingMeasureCount = existingTable.measureCount;
  const newMeasureCount = newTable.measureCount;

  // 新しいヘッダー（例: name | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8）
  const totalMeasures = existingMeasureCount + newMeasureCount;
  const newHeaderCols: string[] = [existingTable.headerName];
  for (let m = 1; m <= totalMeasures; m++) {
    newHeaderCols.push(String(m));
  }

  const separatorCols = newHeaderCols.map(() => '---');

  // パートのマージ
  // 1. 既存のパート順序を基準にする
  const mergedParts: Array<{ name: string; measures: string[] }> = [];
  const processedNewParts = new Set<string>();

  for (const exp of existingTable.parts) {
    // 既存パートと同じ名前の新規パートを検索（大文字小文字無視も考慮）
    const matchedNew = newTable.parts.find(
      (np) =>
        np.name.toLowerCase() === exp.name.toLowerCase() &&
        !processedNewParts.has(np.name)
    );

    let extendedMeasures: string[] = [...exp.measures];
    // 既存小節数までパディング
    while (extendedMeasures.length < existingMeasureCount) {
      extendedMeasures.push('');
    }

    if (matchedNew) {
      processedNewParts.add(matchedNew.name);
      const newMeasures = [...matchedNew.measures];
      while (newMeasures.length < newMeasureCount) {
        newMeasures.push('');
      }
      extendedMeasures = extendedMeasures.concat(newMeasures);
    } else {
      // 新規側に存在しないパートは空セルで埋める
      for (let i = 0; i < newMeasureCount; i++) {
        extendedMeasures.push('');
      }
    }

    mergedParts.push({ name: exp.name, measures: extendedMeasures });
  }

  // 2. 新規側にしか存在しないパートがあれば下に追加
  for (const np of newTable.parts) {
    if (!processedNewParts.has(np.name)) {
      const leadingEmpty = new Array(existingMeasureCount).fill('');
      const newMeasures = [...np.measures];
      while (newMeasures.length < newMeasureCount) {
        newMeasures.push('');
      }
      mergedParts.push({
        name: np.name,
        measures: leadingEmpty.concat(newMeasures),
      });
    }
  }

  // テーブル行を組み立て
  const mergedTableLines: string[] = [];
  mergedTableLines.push('| ' + newHeaderCols.join(' | ') + ' |');
  mergedTableLines.push('| ' + separatorCols.join(' | ') + ' |');
  for (const p of mergedParts) {
    mergedTableLines.push('| ' + [p.name, ...p.measures].join(' | ') + ' |');
  }

  // 既存の Markdown のテーブル部分を置換
  const originalLines = existingMarkdown.split('\n');
  const beforeTable = originalLines.slice(0, existingInfo.tableStartIndex);
  const afterTable = originalLines.slice(existingInfo.tableEndIndex + 1);

  const combined = [
    ...beforeTable,
    ...mergedTableLines,
    ...afterTable,
  ].join('\n');

  // 列幅を綺麗にフォーマットして返却
  return formatMarkdownTables(combined);
}
