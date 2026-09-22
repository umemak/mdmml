/**
 * 各パートの小節内長さ（Duration / Ticks / 拍数）を検証・チェックするユーティリティ
 * 
 * 設計思想:
 * 各小節（列）において、パート間で音符の合計長さが一致しているかを検証します。
 * 小節内の拍数が全パートで一致していれば、4拍（曲の基準拍子）とは異なっていても
 * （例: 弱起・アウフタクトの1拍や、2小節まとめの8拍など）正常（エラーなし）として扱います。
 * パート間で小節の長さが食い違っている場合のみ「パート間不一致エラー」として警告します。
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

/**
 * セルのステータス
 * - 'ok': 基準拍子と一致し、全パート一致している（完全正常）
 * - 'matched': 基準拍子とは異なるが、小節内の全パートが一致している（弱起や変拍子・まとめ小節として正常）
 * - 'mismatch': 同一小節内でパート間の長さが食い違っている（エラー）
 * - 'empty': 音符なし（空セルまたは設定コマンドのみ）
 */
export type MeasureStatus = 'ok' | 'matched' | 'mismatch' | 'empty';

export interface MeasureCellValidation {
  tableIndex: number;
  partName: string;
  measureNumber: number; // 1-based
  mml: string;
  actualTicks: number;
  expectedTicks: number; // 小節内の代表Ticks（または基準Ticks）
  actualBeats: number;
  expectedBeats: number; // 小節内の代表拍数
  diffBeats: number; // actualBeats - expectedBeats
  status: MeasureStatus;
  detailMessage?: string;
}

export interface MeasureSummary {
  measureNumber: number;
  isConsistent: boolean;
  commonBeats: number | null;
  cellCount: number;
  hasErrors: boolean;
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
  measureSummaries: Map<number, MeasureSummary>; // measureNumber -> summary
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

  // 2. 拍子から基準拍数を計算（例: 4/4 -> 4.0拍）
  const [numStr, denStr] = timeSignature.split('/');
  const num = parseInt(numStr, 10) || 4;
  const den = parseInt(denStr, 10) || 4;

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

  // 4. 各パート・各セルの生の Tick 数を計算
  interface RawCell {
    tableIndex: number;
    partName: string;
    measureNumber: number;
    mml: string;
    ticks: number;
    beats: number;
  }

  const rawCells: RawCell[] = [];
  const partNamesSet = new Set<string>();
  const partDefTicks = new Map<string, number>();
  const defaultInitialDefTick = Math.floor((divisions * 4) / 8);

  let globalMeasureOffset = 0;

  tables.forEach((table, tableIndex) => {
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

      let currentDef = partDefTicks.get(partName)!;

      row.cells.forEach((cellText, cellIdx) => {
        const measureNum = measureNumbers[cellIdx] || (globalMeasureOffset + cellIdx + 1);
        const trimmedCell = cellText.trim();

        if (!trimmedCell || trimmedCell === '-') {
          rawCells.push({
            tableIndex,
            partName,
            measureNumber: measureNum,
            mml: cellText,
            ticks: 0,
            beats: 0,
          });
          return;
        }

        const { ticks, nextDefTick } = calculateMmlTicks(trimmedCell, currentDef, divisions);
        currentDef = nextDefTick;
        partDefTicks.set(partName, currentDef);

        const beats = parseFloat((ticks / divisions).toFixed(3));
        rawCells.push({
          tableIndex,
          partName,
          measureNumber: measureNum,
          mml: cellText,
          ticks,
          beats,
        });
      });
    });

    if (measureNumbers.length > 0) {
      globalMeasureOffset = Math.max(...measureNumbers);
    }
  });

  // 5. 小節（列）ごとにグループ化し、パート間の一致判定を行う
  const measureMap = new Map<number, RawCell[]>();
  rawCells.forEach((c) => {
    if (!measureMap.has(c.measureNumber)) {
      measureMap.set(c.measureNumber, []);
    }
    measureMap.get(c.measureNumber)!.push(c);
  });

  const cells: MeasureCellValidation[] = [];
  const matrix = new Map<string, Map<number, MeasureCellValidation>>();
  const measureSummaries = new Map<number, MeasureSummary>();

  partNamesSet.forEach((p) => {
    matrix.set(p, new Map());
  });

  measureMap.forEach((mCells, mNum) => {
    // 音符のあるセル（ticks > 0）を抽出
    const activeCells = mCells.filter((c) => c.ticks > 0);

    if (activeCells.length === 0) {
      // 全パートが空または音符なし
      mCells.forEach((c) => {
        const item: MeasureCellValidation = {
          tableIndex: c.tableIndex,
          partName: c.partName,
          measureNumber: mNum,
          mml: c.mml,
          actualTicks: 0,
          expectedTicks: expectedTicksPerMeasure,
          actualBeats: 0,
          expectedBeats: expectedBeatsPerMeasure,
          diffBeats: 0,
          status: 'empty',
          detailMessage: '音符なし',
        };
        cells.push(item);
        matrix.get(c.partName)!.set(mNum, item);
      });
      measureSummaries.set(mNum, {
        measureNumber: mNum,
        isConsistent: true,
        commonBeats: 0,
        cellCount: mCells.length,
        hasErrors: false,
      });
      return;
    }

    // パート間の拍数が一致しているか判定
    // わずかな計算丸め（2 ticks 以内）は一致とみなす
    const firstTicks = activeCells[0].ticks;
    const isAllActiveSame = activeCells.every(
      (c) => Math.abs(c.ticks - firstTicks) <= 2
    );

    // 空セルがあるか（一部のパートだけ音がなく他はある場合）
    const hasEmptyWhileOthersActive = mCells.some((c) => c.ticks === 0) && activeCells.length > 0;

    if (isAllActiveSame && !hasEmptyWhileOthersActive) {
      // ★ 全パートの拍数が完全に一致している！ ★
      // （4拍でなくても、全員1拍や全員8拍など一致していればエラーにしない）
      const commonTicks = activeCells[0].ticks;
      const commonBeats = activeCells[0].beats;
      const isMatchingStandard = Math.abs(commonTicks - expectedTicksPerMeasure) <= 2;
      const status: MeasureStatus = isMatchingStandard ? 'ok' : 'matched';

      mCells.forEach((c) => {
        const item: MeasureCellValidation = {
          tableIndex: c.tableIndex,
          partName: c.partName,
          measureNumber: mNum,
          mml: c.mml,
          actualTicks: c.ticks,
          expectedTicks: commonTicks,
          actualBeats: c.beats,
          expectedBeats: commonBeats,
          diffBeats: 0,
          status,
          detailMessage: isMatchingStandard
            ? `基準拍子と一致 (${commonBeats}拍)`
            : `パート間一致 (${commonBeats}拍)`,
        };
        cells.push(item);
        matrix.get(c.partName)!.set(mNum, item);
      });

      measureSummaries.set(mNum, {
        measureNumber: mNum,
        isConsistent: true,
        commonBeats,
        cellCount: mCells.length,
        hasErrors: false,
      });
    } else {
      // ★ パート間で拍数が食い違っている（不一致エラー）！ ★
      // 代表拍数（最頻値、または基準拍数に近いもの）を決定
      const tickCounts = new Map<number, number>();
      activeCells.forEach((c) => {
        // 近いtickを同一視
        let foundKey: number | null = null;
        for (const k of tickCounts.keys()) {
          if (Math.abs(k - c.ticks) <= 2) {
            foundKey = k;
            break;
          }
        }
        if (foundKey !== null) {
          tickCounts.set(foundKey, tickCounts.get(foundKey)! + 1);
        } else {
          tickCounts.set(c.ticks, 1);
        }
      });

      let targetTicks = expectedTicksPerMeasure;
      let maxFreq = 0;
      tickCounts.forEach((count, t) => {
        if (count > maxFreq) {
          maxFreq = count;
          targetTicks = t;
        } else if (count === maxFreq) {
          // 同点なら基準拍子に近い方
          if (
            Math.abs(t - expectedTicksPerMeasure) <
            Math.abs(targetTicks - expectedTicksPerMeasure)
          ) {
            targetTicks = t;
          }
        }
      });

      const targetBeats = parseFloat((targetTicks / divisions).toFixed(3));

      let hasMismatch = false;
      mCells.forEach((c) => {
        const diffTicks = c.ticks - targetTicks;
        const diffBeats = parseFloat((diffTicks / divisions).toFixed(3));

        let status: MeasureStatus;
        let detailMessage: string;

        if (c.ticks === 0) {
          status = 'mismatch';
          detailMessage = `このパートのみ音符がありません (他パートは ${targetBeats}拍)`;
          hasMismatch = true;
        } else if (Math.abs(diffTicks) <= 2) {
          status = Math.abs(c.ticks - expectedTicksPerMeasure) <= 2 ? 'ok' : 'matched';
          detailMessage = `小節内多数派 (${targetBeats}拍)`;
        } else {
          status = 'mismatch';
          const diffText = diffBeats > 0 ? `+${diffBeats}拍 長すぎ` : `${Math.abs(diffBeats)}拍 不足`;
          detailMessage = `他パート (${targetBeats}拍) と不一致: ${diffText}`;
          hasMismatch = true;
        }

        const item: MeasureCellValidation = {
          tableIndex: c.tableIndex,
          partName: c.partName,
          measureNumber: mNum,
          mml: c.mml,
          actualTicks: c.ticks,
          expectedTicks: targetTicks,
          actualBeats: c.beats,
          expectedBeats: targetBeats,
          diffBeats,
          status,
          detailMessage,
        };
        cells.push(item);
        matrix.get(c.partName)!.set(mNum, item);
      });

      measureSummaries.set(mNum, {
        measureNumber: mNum,
        isConsistent: false,
        commonBeats: null,
        cellCount: mCells.length,
        hasErrors: hasMismatch,
      });
    }
  });

  const partNames = Array.from(partNamesSet);
  // エラーセルは「同一小節内でパート間不一致（mismatch）」のみ
  const errorCells = cells.filter((c) => c.status === 'mismatch');

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
    measureSummaries,
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
  const tempRows: Array<{ name: string; cells: string[] }> = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRowCells(lines[i]);
    if (cells.length === 0) continue;
    const name = cells[0];
    if (!name) continue;
    tempRows.push({
      name,
      cells: cells.slice(1),
    });
  }

  return { headers, rows: tempRows };
}
