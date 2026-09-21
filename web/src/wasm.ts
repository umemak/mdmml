declare global {
  interface Window {
    Go: any;
    mdmmlConvert?: (src: string) => {
      success: boolean;
      smf?: Uint8Array;
      error?: string;
    };
  }
}

let wasmInitPromise: Promise<void> | null = null;

export async function initWasm(): Promise<void> {
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    if (typeof window === 'undefined') return;

    if (!window.Go) {
      throw new Error('wasm_exec.js が読み込まれていません');
    }

    const go = new window.Go();
    const response = await fetch('/mdmml.wasm');
    if (!response.ok) {
      throw new Error(`mdmml.wasm の取得に失敗しました: ${response.statusText}`);
    }

    const wasmBytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);

    // バックグラウンドで Go ランタイムを実行
    go.run((result as any).instance || result);

    // mdmmlConvert が定義されるのを待つ
    let retries = 0;
    while (!window.mdmmlConvert && retries < 50) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      retries++;
    }

    if (!window.mdmmlConvert) {
      throw new Error('WebAssembly モジュールのエクスポート関数の初期化に失敗しました');
    }
  })();

  return wasmInitPromise;
}

export interface ConversionResult {
  success: boolean;
  smf?: Uint8Array;
  error?: string;
}

export function convertToSMF(markdown: string): ConversionResult {
  if (!window.mdmmlConvert) {
    return {
      success: false,
      error: 'WebAssemblyがまだ初期化されていません。少し待ってから再度お試しください。',
    };
  }
  return window.mdmmlConvert(markdown);
}
