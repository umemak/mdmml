import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Loader2, Music, Search, Clock, Plus } from 'lucide-react';
import { fetchScores, deleteScore, ScoreItem } from '../api';

interface ScoresListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScore: (scoreId: string) => Promise<void>;
  onNewScore: () => void;
  currentScoreId: string | null;
}

export const ScoresListModal: React.FC<ScoresListModalProps> = ({
  isOpen,
  onClose,
  onSelectScore,
  onNewScore,
  currentScoreId,
}) => {
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchScores();
      setScores(list);
    } catch (err: any) {
      setError(err.message || '楽譜一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadScores();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`「${title}」を削除してもよろしいですか？`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteScore(id);
      setScores((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert('削除に失敗しました: ' + (err.message || ''));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredScores = scores.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <FolderOpen className="w-5 h-5" />
            <h3 className="font-semibold text-slate-100">保存した楽譜 (Cloudflare D1)</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onNewScore();
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-medium text-indigo-200 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/60 rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規作成</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 検索バー */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タイトルで絞り込み..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* 楽譜一覧 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">D1から楽譜を読み込み中...</span>
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
              <Music className="w-8 h-8 opacity-40 text-slate-400" />
              <p className="text-xs">
                {scores.length === 0
                  ? '保存された楽譜はまだありません。'
                  : '一致する楽譜が見つかりませんでした。'}
              </p>
            </div>
          ) : (
            filteredScores.map((score) => {
              const isSelected = score.id === currentScoreId;
              const isDeleting = deletingId === score.id;
              return (
                <div
                  key={score.id}
                  onClick={() => {
                    onSelectScore(score.id);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-300 transition">
                        {score.title}
                      </h4>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-600/80 text-indigo-100 px-1.5 py-0.5 rounded font-mono">
                          編集中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>更新: {formatDate(score.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleDelete(e, score.id, score.title)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                      title="削除"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
