import React, { useRef, useState, useMemo } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  TableProperties,
  Save,
  Sparkles,
  Globe,
  FileCode,
  FilePlus,
  Music,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatMarkdownTables } from '../utils/tableFormatter';
import { validateMeasureLengths } from '../utils/measureValidator';
import { MeasureValidationModal } from './MeasureValidationModal';

const DEFAULT_SCORE_TEMPLATE = `---
Title: "無題の楽譜"
Tempo: 120

---

| name | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| RH | @1v100o4 c4 d4 | e4 f4 | g4 a4 | b4 >c4 |
| LH | @1v100o3 c2 | f2 | g2 | c2 |
`;

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onConvert: () => void;
  isConverting: boolean;
  currentTitle?: string;
  onOpenPublicScores?: () => void;
  onNewScore?: () => void;
  onSave?: () => void;
  onOpenTranscribe?: () => void;
  onSeekMeasure?: (measureNumber: number) => void;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onConvert,
  isConverting,
  currentTitle,
  onOpenPublicScores,
  onNewScore,
  onSave,
  onOpenTranscribe,
  onSeekMeasure,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);

  // 各パート・各小節の長さ検証レポート
  const validationReport = useMemo(() => {
    if (!value.trim()) return null;
    return validateMeasureLengths(value);
  }, [value]);

  // テーブル整形処理
  const handleFormat = () => {
    const formattedText = formatMarkdownTables(value);
    if (formattedText !== value) {
      onChange(formattedText);
      setFormatted(true);
      setTimeout(() => setFormatted(false), 1500);
    }
  };

  // キーボードショートカット対応
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      onSave?.();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onConvert();
    } else if ((e.altKey && e.shiftKey && (e.key === 'f' || e.key === 'F')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
      e.preventDefault();
      handleFormat();
    }
  };

  // スクロール同期
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = value.split('\n');
  const lineCount = lines.length;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg h-full">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          {/* 公開楽譜から開くボタン */}
          {onOpenPublicScores && (
            <button
              onClick={onOpenPublicScores}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition cursor-pointer shadow-sm"
              title="D1に保存された公開楽譜やプリセットから選んで読み込みます"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>公開楽譜を選ぶ</span>
            </button>
          )}

          {/* テンプレート挿入ボタン */}
          <button
            onClick={() => onChange(DEFAULT_SCORE_TEMPLATE)}
            className="inline-flex items-center space-x-1 px-2 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs rounded-lg transition cursor-pointer border border-slate-700/60"
            title="基本的なMMLの雛形を挿入します"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">ひな形</span>
          </button>

          {/* 新規作成 / クリア */}
          {value.trim() && (
            <button
              onClick={() => (onNewScore ? onNewScore() : onChange(''))}
              className="inline-flex items-center space-x-1 px-2 py-1.5 bg-slate-800/60 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs rounded-lg transition cursor-pointer border border-transparent hover:border-red-800/60"
              title="エディタをクリアして新しい楽譜を作成"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">クリア</span>
            </button>
          )}

          {currentTitle && (
            <span className="text-xs text-indigo-300 font-medium px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md truncate max-w-[140px] sm:max-w-[200px]">
              {currentTitle}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* AI楽譜読取ボタン */}
          {onOpenTranscribe && (
            <button
              onClick={onOpenTranscribe}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 text-white shadow-sm border border-indigo-400/40"
              title="譜面画像をアップロードしてAIでMMLを自動生成します"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>画像からMML生成</span>
            </button>
          )}

          {/* テーブル整形ボタン */}
          <button
            onClick={handleFormat}
            className={`inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer border ${
              formatted
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            title="Markdownテーブルの列幅を綺麗に揃えます (Alt+Shift+F)"
          >
            {formatted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>整形完了</span>
              </>
            ) : (
              <>
                <TableProperties className="w-3.5 h-3.5 text-indigo-400" />
                <span>テーブル整形</span>
              </>
            )}
          </button>

          {/* 小節内長さチェックボタン */}
          {validationReport && validationReport.totalMeasures > 0 && (
            <button
              onClick={() => setValidationModalOpen(true)}
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer border shadow-sm ${
                validationReport.hasErrors
                  ? 'bg-amber-950/70 hover:bg-amber-900/70 border-amber-500/70 text-amber-300 shadow-amber-500/20 animate-pulse'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300'
              }`}
              title="各パートの小節（セル）の音長が1小節分と一致しているか検証します"
            >
              {validationReport.hasErrors ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>小節エラー ({validationReport.errorCount})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">小節長 OK</span>
                  <span className="sm:hidden">OK</span>
                </>
              )}
            </button>
          )}

          {/* 保存ボタン */}
          {onSave && (
            <button
              onClick={onSave}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/60"
              title="楽譜をD1クラウドに保存 (Ctrl+S / Cmd+S)"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              <span>保存</span>
            </button>
          )}

          {/* コピーボタン */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition cursor-pointer border border-transparent hover:border-slate-700"
            title="Markdownをクリップボードにコピー"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'コピー完了' : 'コピー'}</span>
          </button>

          {/* MIDI再変換ボタン */}
          <button
            onClick={onConvert}
            disabled={isConverting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Ctrl + Enter または ⌘ + Enter"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
            <span>MIDI再変換</span>
          </button>
        </div>
      </div>

      {/* 小節長エラー時のインライン警告バナー */}
      {validationReport && validationReport.hasErrors && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>{validationReport.errorCount} 箇所</strong> の小節で長さの不一致（拍足らず・拍溢れ）が見つかりました
            </span>
          </div>
          <button
            onClick={() => setValidationModalOpen(true)}
            className="text-[11px] font-medium text-amber-300 hover:text-amber-100 underline cursor-pointer ml-2 shrink-0"
          >
            診断表を開く →
          </button>
        </div>
      )}

      {/* エディタエリア（行番号 + テキストエリア） */}
      <div className="relative flex-1 min-h-[380px] flex bg-slate-950 min-w-0 overflow-hidden">
        {/* 行番号 */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="select-none py-4 pl-3 pr-2 text-right font-mono text-xs sm:text-sm text-slate-600 border-r border-slate-800/80 overflow-hidden bg-slate-950/80 shrink-0 leading-relaxed"
          style={{ minWidth: '2.5rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* テキスト入力 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          wrap="off"
          placeholder="ここに入力、または「公開楽譜を選ぶ」「画像からMML生成」「ひな形」をお試しください"
          spellCheck={false}
          className="w-full flex-1 min-w-0 min-h-[380px] p-4 pl-3 bg-transparent font-mono text-xs sm:text-sm text-slate-200 resize-none outline-none leading-relaxed selection:bg-indigo-500/30 overflow-auto whitespace-pre block placeholder:text-slate-600"
        />

        {/* 空の時のクイックスタートガイド */}
        {!value.trim() && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
            <Music className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-300 mb-1">
              楽譜 Markdown を入力または選択してください
            </p>
            <p className="text-xs text-slate-500 mb-4 max-w-sm">
              五線譜の画像からAIで自動生成するか、公開楽譜（プリセット）を選んでプレビューできます。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
              {onOpenPublicScores && (
                <button
                  type="button"
                  onClick={onOpenPublicScores}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>公開楽譜を選ぶ</span>
                </button>
              )}
              {onOpenTranscribe && (
                <button
                  type="button"
                  onClick={onOpenTranscribe}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>画像からMML生成</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(DEFAULT_SCORE_TEMPLATE)}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700/60 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>ひな形を入力</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ステータスバー */}
      <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 font-mono gap-2">
        <div className="flex items-center space-x-3">
          <span>{lineCount} 行</span>
          <span>{value.length} 文字</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Alt+Shift+F</kbd> で表整形</span>
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Ctrl+Enter</kbd> で即時変換</span>
        </div>
      </div>

      {/* 小節内長さ検証モーダル */}
      <MeasureValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        report={validationReport}
        onJumpToMeasure={(m) => {
          setValidationModalOpen(false);
          onSeekMeasure?.(m);
        }}
      />
    </div>
  );
};
