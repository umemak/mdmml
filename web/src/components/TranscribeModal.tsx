import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  UploadCloud,
  Key,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { fetchAiConfig, transcribeScoreImageApi } from '../api';

interface TranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (markdown: string, modelUsed?: string) => void;
}

export const TranscribeModal: React.FC<TranscribeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初期化: localStorage から API Key 読み込み & サーバー設定チェック
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mdmml_gemini_api_key') || '';
      setApiKey(savedKey);
      setError(null);
      fetchAiConfig().then((cfg) => setHasServerKey(cfg.hasServerKey));
    }
  }, [isOpen]);

  // クリップボードからの画像貼り付け (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleSelectFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイル（PNG, JPEG, WebP等）を選択してください');
      return;
    }
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
  };

  const handleConvert = async () => {
    if (!imagePreview) {
      setError('譜面画像を選択してください');
      return;
    }

    const keyToUse = apiKey.trim();
    if (!keyToUse && !hasServerKey) {
      setError('Gemini API キーを入力してください');
      return;
    }

    // API Key を localStorage に保存
    if (keyToUse) {
      localStorage.setItem('mdmml_gemini_api_key', keyToUse);
    }

    setError(null);
    setIsLoading(true);
    setProgressStep('Gemini AI (自動フォールバック対応) に楽譜を送信中...');

    try {
      setTimeout(() => {
        setProgressStep('五線譜・音符・休符・拍子をAIで読譜中...');
      }, 1500);

      setTimeout(() => {
        setProgressStep('mdmml 形式の Markdown テーブルを生成中...');
      }, 4000);

      const result = await transcribeScoreImageApi(imagePreview, keyToUse || undefined);
      onSuccess(result.markdown, result.modelUsed);
      onClose();
    } catch (err: any) {
      setError(err.message || '楽譜の解析に失敗しました');
    } finally {
      setIsLoading(false);
      setProgressStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base flex items-center space-x-1.5">
                <span>譜面画像から MML を自動生成</span>
                <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-mono px-1.5 py-0.5 rounded">
                  Gemini Vision
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                楽譜画像をアップロードすると、AIが音符・和音・リズムを読み取ってMMLを作成します。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* スクロール可能コンテンツ */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* 画像アップロード領域 */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 block">
              1. 譜面画像を選択 または ドラッグ＆ドロップ (Ctrl+V で貼り付け可)
            </label>

            {imagePreview ? (
              <div className="relative border border-slate-700 bg-slate-950 rounded-xl overflow-hidden group">
                {fileName && (
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-300 truncate">
                    {fileName}
                  </div>
                )}
                <div className="max-h-56 overflow-auto flex items-center justify-center p-2 bg-slate-950/60">
                  <img
                    src={imagePreview}
                    alt="Uploaded score"
                    className="max-h-52 w-auto object-contain rounded-lg shadow-md"
                  />
                </div>
                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setImagePreview(null);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-900/90 hover:bg-red-950/80 border border-slate-700 text-slate-300 hover:text-red-300 rounded-lg backdrop-blur transition cursor-pointer"
                  >
                    画像をクリア
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 hover:bg-slate-900/60 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="p-3 bg-slate-800/60 group-hover:bg-indigo-950/50 rounded-full text-slate-400 group-hover:text-indigo-400 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    クリックして画像を選択、またはここにドラッグ＆ドロップ
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPEG, WebP に対応（画面キャプチャの貼り付けもOK）
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectFile(f);
                  }}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Gemini API Key 設定欄 */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Gemini API キー</span>
                {hasServerKey && (
                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-1.5 py-0.2 rounded font-mono ml-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>サーバーキー有効</span>
                  </span>
                )}
              </label>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Google AI Studio で無料取得</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasServerKey
                    ? 'サーバー設定のキーを使用中（個別のキーを指定する場合のみ入力）'
                    : 'AIzaSy... (Gemini API Key を入力)'
                }
                className="w-full pl-3 pr-10 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              ※APIキーはお使いのブラウザ内（localStorage）にのみ安全に保持されます。
            </p>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-indigo-300 font-mono flex items-center space-x-1.5">
            {isLoading && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>{progressStep}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              キャンセル
            </button>

            <button
              type="button"
              disabled={isLoading || !imagePreview}
              onClick={handleConvert}
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI解析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>MMLに変換する</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
