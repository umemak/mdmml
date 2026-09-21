// フロントエンド用 API クライアント

export interface User {
  id: string;
  email: string;
}

export interface ScoreItem {
  id: string;
  title: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoreDetail extends ScoreItem {
  content: string;
  is_owner?: boolean;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: User | null };
    return data.user || null;
  } catch (err) {
    console.error('Failed to fetch current user', err);
    return null;
  }
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { user?: User; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'ログインに失敗しました');
  }
  return data.user!;
}

export async function signup(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { user?: User; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'アカウント登録に失敗しました');
  }
  return data.user!;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function fetchScores(): Promise<ScoreItem[]> {
  const res = await fetch('/api/scores');
  const data = (await res.json()) as { scores?: ScoreItem[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '楽譜一覧の取得に失敗しました');
  }
  return data.scores || [];
}

export async function fetchPublicScores(): Promise<ScoreItem[]> {
  const res = await fetch('/api/public-scores');
  const data = (await res.json()) as { scores?: ScoreItem[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '公開楽譜一覧の取得に失敗しました');
  }
  return data.scores || [];
}

export async function fetchScoreDetail(id: string): Promise<ScoreDetail> {
  const res = await fetch(`/api/scores/${id}`);
  const data = (await res.json()) as { score?: ScoreDetail; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '楽譜の読み込みに失敗しました');
  }
  return data.score!;
}

export async function createScore(
  title: string,
  content: string,
  isPublic = false
): Promise<ScoreDetail> {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, is_public: isPublic }),
  });
  const data = (await res.json()) as { score?: ScoreDetail; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '保存に失敗しました');
  }
  return data.score!;
}

export async function updateScore(
  id: string,
  title?: string,
  content?: string,
  isPublic?: boolean
): Promise<ScoreDetail> {
  const res = await fetch(`/api/scores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, is_public: isPublic }),
  });
  const data = (await res.json()) as { score?: ScoreDetail; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '更新に失敗しました');
  }
  return data.score!;
}

export async function deleteScore(id: string): Promise<void> {
  const res = await fetch(`/api/scores/${id}`, {
    method: 'DELETE',
  });
  const data = (await res.json()) as { success?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(data.error || '削除に失敗しました');
  }
}
