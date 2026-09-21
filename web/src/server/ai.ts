// Gemini API を用いた楽譜画像 -> mdmml Markdown 変換ロジック

const SCORE_TO_MDMML_SYSTEM_PROMPT = `あなたは音楽理論と楽譜の読譜、および Markdown MML コンパイラ「mdmml」のエキスパートです。
ユーザーから提供された楽譜（五線譜・ピアノ譜・コード譜など）の画像を精密に解析し、mdmml 形式の Markdown ドキュメントを作成してください。

### mdmml の仕様ルール
1. **Front Matter**:
必ず先頭に YAML Front Matter を付け、Title と Tempo（楽譜の指示テンポ、指定がなければ120）を記述してください。
\`\`\`markdown
---
Title: "楽曲タイトル"
Tempo: 120

---
\`\`\`

2. **MML テーブル構造**:
- 1列目はパート名（例: \`RH\` (右手), \`LH\` (左手)、または \`A\`, \`B\`, \`Melody\`, \`Bass\` など）。
- 2列目以降は小節（\`| 1 | 2 | 3 | 4 |\`）を表します。mdmml はトラックごとに小節のセルを左から右へと連結します。
- 各トラックの小節数は揃えてください。

3. **MML 構文ルール**:
- 音名: \`c d e f g a b\` (ド レ ミ ファ ソ ラ シ)
- 変化記号: シャープは \`+\` または \`#\` (例: \`f+\`)、フラットは \`-\` (例: \`b-\`)
- 音長: \`l4\`(4分音符), \`l8\`(8分音符), \`l16\`(16分音符), \`l12\`(8分音符の3連符), \`l24\`(16分音符の3連符)。付点音符は \`.\` (例: \`c4.\`, \`c8.\`)
- タイ・スラー: \`^\` (例: \`c4^8\` で付点4分相当、\`c^\` でデフォルト音長分延長)
- 休符: \`r\` (例: \`r4\`, \`r8\`)
- オクターブ: \`o4\` (中央Cは \`o4 c\`)、\`>\` (1オクターブ上)、\`<\` (1オクターブ下)
- 音色指定: \`@\` (例: \`@1\` はアコースティックピアノ, \`@25\` はアコースティックギター, \`@33\` はベースなど GM音色番号 1〜128)
- 音量: \`v\` (0〜127、デフォルト 100)
- テンポ: \`t\` (例: \`t120\`)
- 和音: \`{}\` (例: \`{ceg}4\`, \`{fac}8\`)
- ループ / 繰り返し: \`[]n\` (例: \`[c8]4\` で \`c8\` を4回)
- ジャズ / リズム譜のスラッシュ記法: \`/ / / /\` はその小節のリズム・コンピングパターンの継続を意味します。

### 出力フォーマット
- マークダウンコードブロック（\`\`\`markdown ... \`\`\`）またはテキストのみを出力してください。
- 前置きや挨拶、余計な解説文は一切含めないでください。直接 mdmml Markdown のみを出力してください。`;

// 利用可能モデルを動的に取得するヘルパー
async function getCandidateModels(apiKey: string): Promise<string[]> {
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

        // flash系を最優先、次にpro系、その他
        const flashModels = supported
          .filter((name) => name.includes('flash') && !name.includes('experimental'))
          .sort()
          .reverse();
        const proModels = supported
          .filter((name) => name.includes('pro') && !name.includes('experimental'))
          .sort()
          .reverse();
        const otherModels = supported.filter(
          (name) => !name.includes('flash') && !name.includes('pro')
        );

        const ordered = [...flashModels, ...proModels, ...otherModels];
        if (ordered.length > 0) {
          return ordered;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to list models dynamically, falling back to static list:', e);
  }

  // リスト取得に失敗した場合の静的フォールバックリスト
  return [
    'gemini-3.6-flash',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    'gemini-3.0-pro',
    'gemini-2.5-pro',
  ];
}

export async function transcribeScoreImage(
  base64DataUrl: string,
  apiKey: string
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
            text: 'この楽譜画像を解析し、上記の仕様に準拠した完全な mdmml Markdown テーブルを出力してください。',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  // 有効なモデルリストを取得
  const candidateModels = await getCandidateModels(apiKey);
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
