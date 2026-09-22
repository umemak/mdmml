/**
 * 各パートの小節内長さ（Duration / Ticks / 拍数）を検証・チェックするユーティリティ
 */

export interface NumberParseResult {
  val: number;
  len: number;
}

/**
 * 文字列の先頭から数値を解析します。
 */
export function parseNumber(str: string, min: number, max: number): NumberParseResult {
  let digits = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') {
      digits += ch;
    } else {
      break;
    }
  }
  if (digits.length === 0) {
    return { val: 0, len: 0 };
  }
  let n = parseInt(digits, 10);
  if (isNaN(n)) return { val: 0, len: 0 };
  if (n < min) n = min;
  if (n > max) n = max;
  return { val: n, len: digits.length };
}

/**
 * ループ構文 [ ... ]N を展開します。
 */
export function expandLoops(mml: string): string {
  let res = '';
  const loops: Array<{ pos: number; count: number }> = [];
  const clean = mml.replace(/\s+/g, '') + '   ';

  for (let i = 0; i < clean.length - 3; i++) {
    const ch = clean[i];
    if (ch === '[') {
      loops.push({ pos: res.length, count: -1 });
    } else if (ch === ']') {
      const { val: countVal, len: numLen } = parseNumber(clean.slice(i + 1), 1, 128);
      let count = 2;
      if (numLen > 0) {
        i += numLen;
        count = countVal;
      }
      if (loops.length > 0) {
        const loop = loops[loops.length - 1];
        const loopContent = res.slice(loop.pos);
        // loopContent を count - 1 回繰り返して追加
        for (let c = 1; c < count; c++) {
          res += loopContent;
        }
        loops.pop();
      }
    } else {
      res += ch;
    }
  }
  return res;
}

/**
 * 指定された MML 文字列の合計 Tick 数を計算します。
 * 次の小節へ引き継ぐデフォルト音長 (nextDefTick) も返します。
 */
export function calculateMmlTicks(
  mml: string,
  initialDefTick: number,
  divisions: number = 960
): { ticks: number; nextDefTick: number } {
  const expanded = expandLoops(mml);

  let currentDefTick = initialDefTick;
  let totalTicks = 0;

  let s = expanded.toLowerCase().replace(/\s+/g, '').replace(/#/g, '+');
  s += '   '; // 境界超過対策

  let i = 0;
  while (i < s.length - 3) {
    const ch = s[i];

    // 音符または休符
    if ((ch >= 'a' && ch <= 'g') || ch === 'r') {
      let tick = currentDefTick;
      // 変化記号
      if (s[i + 1] === '+' || s[i + 1] === '-') {
        i++;
      }
      // 音長
      const { val: lenVal, len: numLen } = parseNumber(s.slice(i + 1), 1, divisions * 4);
      if (numLen > 0) {
        i += numLen;
        tick = Math.floor((divisions * 4) / lenVal);
      }
      // 付点
      if (s[i + 1] === '.') {
        i++;
        tick = Math.floor(tick * 1.5);
      }
      // タイ (^)
      while (s[i + 1] === '^') {
        i++;
        let tick2 = currentDefTick;
        const { val: tieLen, len: tieNumLen } = parseNumber(s.slice(i + 1), 1, divisions * 4);
        if (tieNumLen > 0) {
          i += tieNumLen;
          tick2 = Math.floor((divisions * 4) / tieLen);
        }
        if (s[i + 1] === '.') {
          i++;
          tick2 = Math.floor(tick2 * 1.5);
        }
        tick += tick2;
      }

      totalTicks += tick;
      i++;
    } else if (ch === '{') {
      // 和音 { c e g }4
      const closeIdx = s.indexOf('}', i + 1);
      if (closeIdx === -1) {
        i++;
        continue;
      }
      i = closeIdx + 1; // '}' の次の文字

      let tick = currentDefTick;
      const { val: lenVal, len: numLen } = parseNumber(s.slice(i), 1, divisions * 4);
      if (numLen > 0) {
        i += numLen;
        tick = Math.floor((divisions * 4) / lenVal);
      }
      if (s[i] === '.') {
        i++;
        tick = Math.floor(tick * 1.5);
      }
      while (s[i] === '^') {
        i++;
        let tick2 = currentDefTick;
        const { val: tieLen, len: tieNumLen } = parseNumber(s.slice(i), 1, divisions * 4);
        if (tieNumLen > 0) {
          i += tieNumLen;
          tick2 = Math.floor((divisions * 4) / tieLen);
        }
        if (s[i] === '.') {
          i++;
          tick2 = Math.floor(tick2 * 1.5);
        }
        tick += tick2;
      }

      totalTicks += tick;
    } else if (ch === 'l') {
      // デフォルト音長変更
      const { val: lenVal, len: numLen } = parseNumber(s.slice(i + 1), 1, divisions * 4);
      if (numLen > 0) {
        i += numLen;
        currentDefTick = Math.floor((divisions * 4) / lenVal);
      }
      i++;
    } else if (ch === 'o' || ch === '@' || ch === 'p' || ch === 't' || ch === 'v' || ch === '$') {
      // 数値付き設定コマンド
      const { len: numLen } = parseNumber(s.slice(i + 1), 0, 960);
      i += 1 + numLen;
    } else {
      // その他 (>, < など)
      i++;
    }
  }

  return { ticks: totalTicks, nextDefTick: currentDefTick };
}

export type MeasureStatus = 'ok' | 'underrun' | 'overrun' | 'empty';

export interface MeasureCellValidation {
  tableIndex: number;
  partName: string;
  measureNumber: number; // 1-based
  mml: string;
  actualTicks: number;
  expectedTicks: number;
  actualBeats: number;
  expectedBeats: number;
  diffBeats: number; // actualBeats - expectedBeats
  status: MeasureStatus;
}

export interface MeasureValidationReport {
  divisions: number;
  timeSignature: string;
  expectedBeatsPerMeasure: number;
  expectedTicksPerMeasure: number;
  totalMeasures: number;
  partNames: string[];
  cells: MeasureCellValidation[];
  errorCells: MeasureCellValidation[];
  hasErrors: boolean;
  errorCount: number;
  matrix: Map<string, Map<number, MeasureCellValidation>>; // partName -> measureNumber -> validation
}

/**
 * Markdown 全文から Front Matter（Divisions, TimeSignature 等）および
 * テーブル内の各セル MML の小節内長さを検証します。
 */
export function validateMeasureLengths(markdown: string): MeasureValidationReport {
  let divisions = 960;
  let timeSignature = '4/4';

  const lines = markdown.split('\n');

  // 1. Front Matter 解析
  let inFrontMatter = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '---') {
      if (!inFrontMatter) {
        inFrontMatter = true;
        continue;
      } else {
        inFrontMatter = false;
        break;
      }
    }
    if (inFrontMatter) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
        const val = trimmed.slice(colonIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
        if (key === 'divisions') {
          const d = parseInt(val, 10);
          if (!isNaN(d) && d > 0) divisions = d;
        } else if (key === 'timesignature' || key === 'rhythm' || key === 'meter') {
          if (/^\d+\/\d+$/.test(val)) {
            timeSignature = val;
          }
        }
      }
    }
  }

  // 2. 1小節の期待 Tick 数 / 拍数を計算
  const [numStr, denStr] = timeSignature.split('/');
  const num = parseInt(numStr, 10) || 4;
  const den = parseInt(denStr, 10) || 4;

  // 4分音符 = divisions ticks = 1.0拍
  // 全音符 = divisions * 4 ticks = 4.0拍
  // 1小節の期待 ticks = (divisions * 4 * num) / den
  const expectedTicksPerMeasure = Math.floor((divisions * 4 * num) / den);
  const expectedBeatsPerMeasure = (4 * num) / den;

  // 3. テーブル抽出
  const tables: Array<{
    headers: string[];
    rows: Array<{ name: string; cells: string[] }>;
  }> = [];

  let currentTableLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      currentTableLines.push(line);
    } else {
      if (currentTableLines.length >= 3) {
        tables.push(parseMarkdownTable(currentTableLines));
      }
      currentTableLines = [];
    }
  }
  if (currentTableLines.length >= 3) {
    tables.push(parseMarkdownTable(currentTableLines));
  }

  // 4. 各パート・各小節の長さを検証
  const cells: MeasureCellValidation[] = [];
  const partNamesSet = new Set<string>();
  const partDefTicks = new Map<string, number>();
  const matrix = new Map<string, Map<number, MeasureCellValidation>>();

  // 初期デフォルト音長は 8分音符 = lenToTick(divisions, 8)
  const defaultInitialDefTick = Math.floor((divisions * 4) / 8);

  let globalMeasureOffset = 0;

  tables.forEach((table, tableIndex) => {
    // 列ヘッダーから小節番号を判定
    const measureNumbers: number[] = [];
    for (let c = 1; c < table.headers.length; c++) {
      const parsedNum = parseInt(table.headers[c], 10);
      if (!isNaN(parsedNum)) {
        measureNumbers.push(parsedNum);
      } else {
        measureNumbers.push(globalMeasureOffset + c);
      }
    }

    table.rows.forEach((row) => {
      const partName = row.name;
      partNamesSet.add(partName);

      if (!partDefTicks.has(partName)) {
        partDefTicks.set(partName, defaultInitialDefTick);
      }
      if (!matrix.has(partName)) {
        matrix.set(partName, new Map());
      }

      let currentDef = partDefTicks.get(partName)!;

      row.cells.forEach((cellText, cellIdx) => {
        const measureNum = measureNumbers[cellIdx] || (globalMeasureOffset + cellIdx + 1);
        const trimmedCell = cellText.trim();

        if (!trimmedCell || trimmedCell === '-') {
          const item: MeasureCellValidation = {
            tableIndex,
            partName,
            measureNumber: measureNum,
            mml: cellText,
            actualTicks: 0,
            expectedTicks: expectedTicksPerMeasure,
            actualBeats: 0,
            expectedBeats: expectedBeatsPerMeasure,
            diffBeats: -expectedBeatsPerMeasure,
            status: 'empty',
          };
          cells.push(item);
          matrix.get(partName)!.set(measureNum, item);
          return;
        }

        const { ticks, nextDefTick } = calculateMmlTicks(trimmedCell, currentDef, divisions);
        currentDef = nextDefTick;
        partDefTicks.set(partName, currentDef);

        const actualBeats = parseFloat(((ticks / divisions)).toFixed(3));
        const diffBeats = parseFloat(((ticks - expectedTicksPerMeasure) / divisions).toFixed(3));

        let status: MeasureStatus = 'ok';
        if (Math.abs(ticks - expectedTicksPerMeasure) > 2) {
          // わずかな丸め誤差を許容
          if (ticks < expectedTicksPerMeasure) {
            status = 'underrun';
          } else {
            status = 'overrun';
          }
        }

        const item: MeasureCellValidation = {
          tableIndex,
          partName,
          measureNumber: measureNum,
          mml: cellText,
          actualTicks: ticks,
          expectedTicks: expectedTicksPerMeasure,
          actualBeats,
          expectedBeats: expectedBeatsPerMeasure,
          diffBeats,
          status,
        };

        cells.push(item);
        matrix.get(partName)!.set(measureNum, item);
      });
    });

    if (measureNumbers.length > 0) {
      globalMeasureOffset = Math.max(...measureNumbers);
    }
  });

  const partNames = Array.from(partNamesSet);
  const errorCells = cells.filter((c) => c.status === 'underrun' || c.status === 'overrun');

  // 全小節数
  let maxMeasure = 0;
  cells.forEach((c) => {
    if (c.measureNumber > maxMeasure) maxMeasure = c.measureNumber;
  });

  return {
    divisions,
    timeSignature,
    expectedBeatsPerMeasure,
    expectedTicksPerMeasure,
    totalMeasures: maxMeasure,
    partNames,
    cells,
    errorCells,
    hasErrors: errorCells.length > 0,
    errorCount: errorCells.length,
    matrix,
  };
}

function parseMarkdownTable(lines: string[]): {
  headers: string[];
  rows: Array<{ name: string; cells: string[] }>;
} {
  const parseRowCells = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map((c) => c.trim());
  };

  const headers = parseRowCells(lines[0]);
  const rows: Array<{ name: string; cells: string[] }> = [];

  for (let i = 2; i < lines.length; i++) {
    const cells = parseRowCells(lines[i]);
    if (cells.length === 0) continue;
    const name = cells[0];
    if (!name) continue;
    rows.push({
      name,
      cells: cells.slice(1),
    });
  }

  return { headers, rows };
}
