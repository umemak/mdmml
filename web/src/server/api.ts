import {
  generateRandomHex,
  hashPassword,
  timingSafeEqual,
  createSessionCookie,
  clearSessionCookie,
  getCurrentUser,
  SESSION_MAX_AGE,
} from './auth';

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers: h });
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (!path.startsWith('/api/')) {
    return null; // 静的ファイルへフォールバック
  }

  // ヘルスチェック
  if (path === '/api/health') {
    return json({ status: 'ok', service: 'mdmml' });
  }

  // --- Auth API ---

  // 現在のユーザー情報取得 (GET /api/auth/me)
  if (path === '/api/auth/me' && method === 'GET') {
    const user = await getCurrentUser(request, env.DB);
    if (!user) {
      return json({ user: null });
    }
    return json({ user: { id: user.id, email: user.email } });
  }

  // サインアップ (POST /api/auth/signup)
  if (path === '/api/auth/signup' && method === 'POST') {
    try {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = body.email?.trim().toLowerCase();
      const password = body.password;

      if (!email || !email.includes('@') || !email.includes('.')) {
        return json({ error: '有効なメールアドレスを入力してください' }, 400);
      }
      if (!password || password.length < 6) {
        return json({ error: 'パスワードは6文字以上で入力してください' }, 400);
      }

      // 既存チェック
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first();
      if (existing) {
        return json({ error: 'このメールアドレスは既に登録されています' }, 409);
      }

      const userId = crypto.randomUUID();
      const salt = generateRandomHex(16);
      const passwordHash = await hashPassword(password, salt);
      const now = new Date().toISOString();

      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, email, passwordHash, salt, now)
        .run();

      // セッション作成
      const sessionToken = generateRandomHex(32);
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      await env.DB.prepare(
        'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      )
        .bind(sessionToken, userId, expiresAt, now)
        .run();

      const cookie = createSessionCookie(sessionToken);
      return json(
        { user: { id: userId, email } },
        201,
        { 'Set-Cookie': cookie }
      );
    } catch (err: any) {
      return json({ error: 'ユーザー登録処理に失敗しました: ' + (err.message || '') }, 500);
    }
  }

  // ログイン (POST /api/auth/login)
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = body.email?.trim().toLowerCase();
      const password = body.password;

      if (!email || !password) {
        return json({ error: 'メールアドレスとパスワードを入力してください' }, 400);
      }

      const userRow = await env.DB.prepare(
        'SELECT id, email, password_hash, salt FROM users WHERE email = ?'
      )
        .bind(email)
        .first<{ id: string; email: string; password_hash: string; salt: string }>();

      if (!userRow) {
        return json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
      }

      const hash = await hashPassword(password, userRow.salt);
      if (!timingSafeEqual(hash, userRow.password_hash)) {
        return json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
      }

      // セッション作成
      const sessionToken = generateRandomHex(32);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      await env.DB.prepare(
        'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      )
        .bind(sessionToken, userRow.id, expiresAt, now)
        .run();

      const cookie = createSessionCookie(sessionToken);
      return json(
        { user: { id: userRow.id, email: userRow.email } },
        200,
        { 'Set-Cookie': cookie }
      );
    } catch (err: any) {
      return json({ error: 'ログイン処理に失敗しました: ' + (err.message || '') }, 500);
    }
  }

  // ログアウト (POST /api/auth/logout)
  if (path === '/api/auth/logout' && method === 'POST') {
    const cookie = clearSessionCookie();
    return json({ success: true }, 200, { 'Set-Cookie': cookie });
  }

  // --- MML Scores API ---
  // これ以降は認証が必要
  const currentUser = await getCurrentUser(request, env.DB);
  if (!currentUser) {
    return json({ error: '認証が必要です。ログインしてください。' }, 401);
  }

  // スコア一覧取得 (GET /api/scores)
  if (path === '/api/scores' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, title, created_at, updated_at FROM scores WHERE user_id = ? ORDER BY updated_at DESC'
    )
      .bind(currentUser.id)
      .all<{ id: string; title: string; created_at: string; updated_at: string }>();

    return json({ scores: results || [] });
  }

  // スコア新規保存 (POST /api/scores)
  if (path === '/api/scores' && method === 'POST') {
    try {
      const body = (await request.json()) as { title?: string; content?: string };
      const title = body.title?.trim() || '無題の楽譜';
      const content = body.content ?? '';

      const scoreId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        'INSERT INTO scores (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(scoreId, currentUser.id, title, content, now, now)
        .run();

      return json({ score: { id: scoreId, title, content, created_at: now, updated_at: now } }, 201);
    } catch (err: any) {
      return json({ error: '保存に失敗しました: ' + (err.message || '') }, 500);
    }
  }

  // /api/scores/:id へのルーティング
  const scoreMatch = path.match(/^\/api\/scores\/([^/]+)$/);
  if (scoreMatch) {
    const scoreId = scoreMatch[1];

    // スコア詳細取得 (GET /api/scores/:id)
    if (method === 'GET') {
      const score = await env.DB.prepare(
        'SELECT id, title, content, created_at, updated_at FROM scores WHERE id = ? AND user_id = ?'
      )
        .bind(scoreId, currentUser.id)
        .first<{ id: string; title: string; content: string; created_at: string; updated_at: string }>();

      if (!score) {
        return json({ error: '楽譜が見つかりません' }, 404);
      }
      return json({ score });
    }

    // スコア更新 (PUT /api/scores/:id)
    if (method === 'PUT') {
      try {
        const body = (await request.json()) as { title?: string; content?: string };
        const now = new Date().toISOString();

        // 存在確認
        const existing = await env.DB.prepare(
          'SELECT id, title, content FROM scores WHERE id = ? AND user_id = ?'
        )
          .bind(scoreId, currentUser.id)
          .first<{ id: string; title: string; content: string }>();

        if (!existing) {
          return json({ error: '楽譜が見つかりません' }, 404);
        }

        const newTitle = body.title !== undefined ? body.title.trim() || '無題の楽譜' : existing.title;
        const newContent = body.content !== undefined ? body.content : existing.content;

        await env.DB.prepare(
          'UPDATE scores SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        )
          .bind(newTitle, newContent, now, scoreId, currentUser.id)
          .run();

        return json({ score: { id: scoreId, title: newTitle, content: newContent, updated_at: now } });
      } catch (err: any) {
        return json({ error: '更新に失敗しました: ' + (err.message || '') }, 500);
      }
    }

    // スコア削除 (DELETE /api/scores/:id)
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM scores WHERE id = ? AND user_id = ?')
        .bind(scoreId, currentUser.id)
        .run();

      return json({ success: true });
    }
  }

  return json({ error: 'Not Found' }, 404);
}
