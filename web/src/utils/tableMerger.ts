import { formatMarkdownTables } from './tableFormatter';

interface ParsedTable {
  tableStartIndex: number;
  tableEndIndex: number;
  headerName: string;
  measureNumbers: number[];
  parts: Array<{ name: string; measures: string[] }>;
}

/**
 * テーブル行からセル配列を抽出します。
 */
function parseRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Markdown 文字列からすべての MML テーブルを抽出・解析します。
 */
function parseAllMmlTables(markdown: string): ParsedTable[] {
  const lines = markdown.split('\n');
  const tables: ParsedTable[] = [];

  let inTable = false;
  let currentStartIndex = -1;
  let currentTableLines: string[] = [];

  const flush = (endIndex: number) => {
    if (currentTableLines.length >= 3) {
      const headerRow = parseRow(currentTableLines[0]);
      const headerName = headerRow[0] || 'name';
      const measureNumbers: number[] = [];

      for (let c = 1; c < headerRow.length; c++) {
        const num = parseInt(headerRow[c], 10);
        if (!isNaN(num)) {
          measureNumbers.push(num);
        } else {
          measureNumbers.push(measureNumbers.length + 1);
        }
      }

      const parts: Array<{ name: string; measures: string[] }> = [];
      for (let i = 2; i < currentTableLines.length; i++) {
        const row = parseRow(currentTableLines[i]);
        if (row.length === 0) continue;
        const partName = row[0];
        const measures = row.slice(1);
        if (!partName) continue;
        parts.push({ name: partName, measures });
      }

      tables.push({
        tableStartIndex: currentStartIndex,
        tableEndIndex: endIndex,
        headerName,
        measureNumbers,
        parts,
      });
    }
    currentTableLines = [];
    currentStartIndex = -1;
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentStartIndex = i;
      }
      currentTableLines.push(lines[i]);
    } else if (inTable) {
      flush(i - 1);
    }
  }
  if (inTable) {
    flush(lines.length - 1);
  }

  return tables;
}

/**
 * 既存の楽譜 Markdown に、新規解析された楽譜 Markdown を「別の独立したテーブル」として下に追加します。
 * 小節番号は既存の最大小節番号から続く連番（例: 1〜4小節の次は5〜8小節）に自動調整されます。
 * mdmml は同一パート名の行を上から順に演奏するため、テーブルを分けることで高い可読性を保ちつつ完全な演奏が可能です。
 */
export function mergeScoreMarkdowns(
  existingMarkdown: string,
  newMarkdown: string
): string {
  const existingTables = parseAllMmlTables(existingMarkdown);
  const newTables = parseAllMmlTables(newMarkdown);

  // テーブルが存在しない場合のフォールバック
  if (existingTables.length === 0) {
    return newMarkdown;
  }
  if (newTables.length === 0) {
    return existingMarkdown;
  }

  // 既存テーブル群から最大小節番号を算出
  let maxMeasure = 0;
  let preferredHeaderName = 'name';
  const existingPartNames: string[] = [];

  for (const t of existingTables) {
    preferredHeaderName = t.headerName || preferredHeaderName;
    for (const num of t.measureNumbers) {
      if (num > maxMeasure) maxMeasure = num;
    }
    for (const p of t.parts) {
      if (!existingPartNames.some((n) => n.toLowerCase() === p.name.toLowerCase())) {
        existingPartNames.push(p.name);
      }
    }
  }

  // 新規側テーブル（基本的には1つ）の各小節をリナンバリングして独立テーブルとして整形
  const newTableStrings: string[] = [];

  for (const newTable of newTables) {
    const measureCount = Math.max(
      newTable.measureNumbers.length,
      ...newTable.parts.map((p) => p.measures.length),
      1
    );

    // 新しい小節番号ヘッダー (例: | name | 5 | 6 | 7 | 8 |)
    const startMeasure = maxMeasure + 1;
    const endMeasure = maxMeasure + measureCount;
    maxMeasure = endMeasure;

    const headerCols = [preferredHeaderName];
    for (let m = startMeasure; m <= endMeasure; m++) {
      headerCols.push(String(m));
    }
    const separatorCols = headerCols.map(() => '---');

    const tableRows: string[] = [];
    tableRows.push('| ' + headerCols.join(' | ') + ' |');
    tableRows.push('| ' + separatorCols.join(' | ') + ' |');

    // パート順序の決定: 既存テーブルのパート順を優先
    const partsToOutput: Array<{ name: string; measures: string[] }> = [];
    const usedNewPartNames = new Set<string>();

    for (const epName of existingPartNames) {
      const match = newTable.parts.find(
        (np) =>
          np.name.toLowerCase() === epName.toLowerCase() &&
          !usedNewPartNames.has(np.name)
      );
      if (match) {
        usedNewPartNames.add(match.name);
        const paddedMeasures = [...match.measures];
        while (paddedMeasures.length < measureCount) {
          paddedMeasures.push('');
        }
        partsToOutput.push({ name: epName, measures: paddedMeasures });
      }
    }

    // 新規側にしか存在しないパート
    for (const np of newTable.parts) {
      if (!usedNewPartNames.has(np.name)) {
        const paddedMeasures = [...np.measures];
        while (paddedMeasures.length < measureCount) {
          paddedMeasures.push('');
        }
        partsToOutput.push({ name: np.name, measures: paddedMeasures });
      }
    }

    for (const p of partsToOutput) {
      tableRows.push('| ' + [p.name, ...p.measures].join(' | ') + ' |');
    }

    newTableStrings.push(tableRows.join('\n'));
  }

  // 既存 Markdown の最後のテーブルの直後に新しいテーブルを挿入
  const lastExistingTable = existingTables[existingTables.length - 1];
  const existingLines = existingMarkdown.split('\n');

  const beforeLines = existingLines.slice(0, lastExistingTable.tableEndIndex + 1);
  const afterLines = existingLines.slice(lastExistingTable.tableEndIndex + 1);

  const combined = [
    ...beforeLines,
    '',
    ...newTableStrings,
    ...afterLines,
  ].join('\n');

  // 各テーブルをフォーマットして返却
  return formatMarkdownTables(combined);
}
