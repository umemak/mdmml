// Gemini API を用いた楽譜画像 -> mdmml Markdown 変換ロジック

const SCORE_TO_MDMML_SYSTEM_PROMPT = `あなたは音楽理論、読譜、および Markdown MML コンパイラ「mdmml」の最高峰のエキスパートです。
ユーザーから提供された楽譜（五線譜・ピアノ譜・コード譜など）の画像を精密に解析し、mdmml 形式の Markdown ドキュメントを作成してください。

### 【極めて重要な規則・禁止事項】
1. **スラッシュ記法（/）や繰り返し記号（%）の完全禁止**:
   - mdmml には \`/\` や \`%\` というコマンドは存在しません。
   - 楽譜にスラッシュ（/ / / /）や小節リピート記号（%）がある場合、絶対に \`/\` や \`%\` を出力してはなりません。必ず直前の小節と同じ音符・リズム、または指定されたコードに基づくバッキングの具体的な音符・休符・和音を展開して記述してください。
2. **調号（Key Signature）の徹底**:
   - 楽譜の冒頭にある調号（シャープ # / フラット ♭ の数）を必ず確認し、該当する音階のすべての音に明示的に \`+\` や \`-\` を付与してください。
   - 例: #1個（ト長調/ホ短調）→ すべての F に \`+\` (\`f+\`)
   - 例: ♭1個（ヘ長調/ニ短調）→ すべての B に \`-\` (\`b-\`)
   - 例: #2個（ニ長調/ロ短調）→ すべての F, C に \`+\` (\`f+\`, \`c+\`)
   - 例: ♭2個（変ロ長調/ト短調）→ すべての B, E に \`-\` (\`b-\`, \`e-\`)
3. **音部記号とオクターブの厳格な基準**:
   - 中央C（ト音記号の下第1加線、ヘ音記号の上第1加線）は \`o4 c\` です。
   - **ト音記号（高音部記号 / G Clef）**:
     - 第1線（最下線）: E4 (\`o4 e\`)
     - 第2線: G4 (\`o4 g\`)
     - 第3線: B4 (\`o4 b\`)
     - 第4線: D5 (\`o5 d\`)
     - 第5線（最上線）: F5 (\`o5 f\`)
     - 下第1加線: C4 (\`o4 c\`)
   - **ヘ音記号（低音部記号 / F Clef）**:
     - 第1線（最下線）: G2 (\`o2 g\`)
     - 第2線: B2 (\`o2 b\`)
     - 第3線: D3 (\`o3 d\`)
     - 第4線: F3 (\`o3 f\`)
     - 第5線（最上線）: A3 (\`o3 a\`)
     - 上第1加線: C4 (\`o4 c\`)
     - ※左手・ベースパートは基本的に \`o2\` 〜 \`o3\`（高音部で \`o4\`）です。決して右手と同じ \`o4\` から始めないでください。
   - オクターブ記号 \`>\` (上) / \`<\` (下) は状態が蓄積されるため、誤認を防ぐため小節の開始時や跳躍時には \`o4\`, \`o3\` 等の絶対指定を積極的に使用してください。
4. **小節内の音価（拍数・リズム）の完全な整合性**:
   - 拍子記号（4/4拍子, 3/4拍子, 6/8拍子など）を必ず特定してください。
   - **各トラックの各小節（セルの内容）の合計音価が、その拍子の1小節分の拍数と完全に一致すること**を厳密に計算してください。
     - 4/4拍子: 各小節合計で4分音符4拍分（全音符分）
     - 3/4拍子: 各小節合計で4分音符3拍分（付点2分音符分）
     - 6/8拍子: 各小節合計で8分音符6拍分（付点4分音符2拍分）
   - 音長対応:
     - 4分音符: \`4\` (\`c4\`, \`r4\`) / 付点4分: \`4.\` (\`c4.\`)
     - 8分音符: \`8\` (\`c8\`, \`r8\`) / 付点8分: \`8.\` (\`c8.\`)
     - 16分音符: \`16\` (\`c16\`, \`r16\`)
     - 2分音符: \`2\` (\`c2\`, \`r2\`) / 付点2分: \`2.\` (\`c2.\`)
     - 全音符: \`1\` (\`c1\`, \`r1\`)
     - 8分3連符: \`12\` (\`c12d12e12\` または \`l12cde\`)
     - タイ: \`^\` (例: \`c4^8\` は4分+8分)
   - 音価が足りない小節は休符 \`r\` で埋め、超過している場合は符頭・旗の数を確認して修正してください。

### mdmml の仕様ルール
1. **Front Matter**:
- 楽譜の最上部に書かれた曲名（例: "Blues Riff" 等）を画像から正確に読み取り、Title に設定してください（"Piano Piece" などの適当なタイトルにしないでください）。
- テンポ（BPM）指示があればそれを Tempo に反映し、記載がなければ 120 としてください。
\`\`\`markdown
---
Title: "曲名"
Tempo: 120

---
\`\`\`

2. **MML テーブル構造**:
- 1行目はヘッダー: \`| name | 1 | 2 | 3 | ... |\`
- 2行目は区切り線: \`|---|---|---|---|...|\`
- 3行目以降は各トラック（例: \`RH\` (右手), \`LH\` (左手) や \`Melody\`, \`Bass\` 等）。
- 各トラックの列数（小節数）は完全に一致させてください。
- トラックの各セル内には、その小節に演奏される MML のみを記述してください。

3. **MML 構文 & 実例**:
- 和音: \`{ceg}4\` (ドミソの和音4分音符)
- ループ / リピート: \`[c8]4\` (ドの8分音符を4回繰り返し)
- 3連符・シャッフル: \`l12\`（8分3連符・1拍3音）、スウィングタイは \`c^12c12\`
- 音色指定: \`@1\` (ピアノ), \`@25\` (アコースティックギター), \`@33\` (ベース)

### 正解 Markdown 出力例（ピアノ譜の例）
\`\`\`markdown
---
Title: "Blues Riff"
Tempo: 120

---

| name | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| RH | @1v100o4l12[{ceg}{<a >ce}{<fa >c}]4 | [{fac}{dfa}{<b- >df}]4 | {>e c <a}{>d <b g}{>c <a f}{<e g b}{<f a >c}{<g b >d}{>e c <a}{>d <b g}{>c <a f}{<e g b}{<f a >c}{<g b >d} | {>f a >c}{>d f a}{>c <b >d}{<b >d f}{<a >c e}{<g b >d}{<g b >d f}4r4 |
| LH | @1v100o3l4c^12c12c12c<g> | f^12f12f12fc | c^12c12c12c<g> | >c< >c12<<c12c12>>c4r4 |
\`\`\`

### 出力フォーマット
- マークダウンコードブロック（\`\`\`markdown ... \`\`\`）またはテキストのみを出力してください。
- 前置きや挨拶、余計な解説文は一切含めず、直接 mdmml Markdown のみを出力してください。`;

// 利用可能モデルを動的に取得するヘルパー
async function getCandidateModels(
  apiKey: string,
  modelPreference: 'pro' | 'flash' = 'pro'
): Promise<string[]> {
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { headers: { 'x-goog-api-key': apiKey } }
    );

    if (listRes.ok) {
      const data = (await listRes.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };

      if (data.models && data.models.length > 0) {
        // generateContent をサポートするモデルを抽出
        const supported = data.models
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => m.name.replace(/^models\//, ''));

        const proModels = supported
          .filter((name) => name.includes('pro') && !name.includes('experimental'))
          .sort()
          .reverse();
        const flashModels = supported
          .filter((name) => name.includes('flash') && !name.includes('experimental'))
          .sort()
          .reverse();
        const otherModels = supported.filter(
          (name) => !name.includes('flash') && !name.includes('pro')
        );

        // 優先度に応じて並べ替え
        const ordered =
          modelPreference === 'flash'
            ? [...flashModels, ...proModels, ...otherModels]
            : [...proModels, ...flashModels, ...otherModels];

        if (ordered.length > 0) {
          return ordered;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to list models dynamically, falling back to static list:', e);
  }

  // リスト取得に失敗した場合の静的フォールバックリスト
  return modelPreference === 'flash'
    ? ['gemini-3.6-flash', 'gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-3.0-pro', 'gemini-2.5-pro']
    : ['gemini-3.0-pro', 'gemini-2.5-pro', 'gemini-3.6-flash', 'gemini-3.0-flash', 'gemini-2.5-flash'];
}

export async function transcribeScoreImage(
  base64DataUrl: string,
  apiKey: string,
  modelPreference: 'pro' | 'flash' = 'pro'
): Promise<{ markdown: string; modelUsed: string }> {
  let mimeType = 'image/jpeg';
  let base64Data = base64DataUrl;

  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SCORE_TO_MDMML_SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: 'この楽譜画像を音楽理論と読譜規則に厳密に従って解析し、各小節の拍数・音価の合計を正確に一致させた完全な mdmml Markdown テーブルを出力してください。',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 8192,
    },
  };

  // 有効なモデルリストを取得 (modelPreference を反映)
  const candidateModels = await getCandidateModels(apiKey, modelPreference);
  console.log('Candidate Gemini models for transcription:', candidateModels);

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Gemini (${model}) エラー (HTTP ${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) {
            errMsg = `Gemini (${model}) エラー: ${errJson.error.message}`;
          }
        } catch {
          // ignore
        }

        console.warn(`Model ${model} failed: ${errMsg}. Trying fallback model...`);
        lastError = new Error(errMsg);

        // high demand, 503, 429, not found 等の場合は次のモデルを試行
        continue;
      }

      const result = (await response.json()) as any;
      const candidate = result.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error(`Gemini (${model}) から有効な楽譜変換結果が得られませんでした`);
      }

      let text = candidate.content.parts[0].text.trim();

      // コードブロックのバッククォート囲みを除去
      if (text.startsWith('```markdown')) {
        text = text.substring(11).trim();
      } else if (text.startsWith('```')) {
        text = text.substring(3).trim();
      }
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3).trim();
      }

      return { markdown: text, modelUsed: model };
    } catch (err: any) {
      console.warn(`Request to ${model} threw error: ${err.message}. Trying next model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('利用可能なすべての Gemini モデルで解析に失敗しました。');
}
