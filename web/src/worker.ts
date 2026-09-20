interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API エンドポイント（ヘルスチェック等の拡張用）
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'mdmml' }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 静的アセット（Web UI, wasm, wasm_exec.js）へのルーティング
    const response = await env.ASSETS.fetch(request);

    // text/html や text/plain レスポンスの charset=utf-8 保証
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.startsWith('text/html') || contentType.startsWith('text/plain')) && !contentType.includes('charset')) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('content-type', `${contentType}; charset=utf-8`);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  },
};
