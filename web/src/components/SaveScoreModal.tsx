import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, FileText, Globe, Lock } from 'lucide-react';

interface SaveScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, asNew: boolean, isPublic: boolean) => Promise<void>;
  initialTitle: string;
  initialIsPublic?: boolean;
  isEditingExisting: boolean;
}

export const SaveScoreModal: React.FC<SaveScoreModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTitle,
  initialIsPublic = false,
  isEditingExisting,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle || '無題の楽譜');
    setIsPublic(initialIsPublic);
  }, [initialTitle, initialIsPublic, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (asNew: boolean) => {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(title.trim(), asNew, isPublic);
      onClose();
    } catch (err: any) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Save className="w-5 h-5" />
            <h3 className="font-semibold text-slate-100">
              {isEditingExisting ? '楽譜の保存' : 'クラウドに新規保存'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* 楽曲タイトル */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>楽曲タイトル</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: マイ・フェイバリット・ソング"
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* 公開 / 非公開設定 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">公開設定</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                !isPublic
                  ? 'bg-slate-800/90 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Lock className={`w-3.5 h-3.5 ${!isPublic ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold">非公開 (プライベート)</span>
              </div>
              <p className="text-[11px] text-slate-500">自分だけが閲覧・編集できます</p>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                isPublic
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Globe className={`w-3.5 h-3.5 ${isPublic ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold">公開 (パブリック)</span>
              </div>
              <p className="text-[11px] text-slate-500">URLを知っている誰でも閲覧・再生可能</p>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-1">
          Cloudflare D1 データベースに保存され、いつでもマイ楽譜から再編集や再生ができます。
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            キャンセル
          </button>

          {isEditingExisting ? (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                別名で新規保存
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : (
                  <span>上書き保存</span>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <span>クラウドに保存</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
