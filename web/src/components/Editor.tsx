import React, { useRef, useState } from 'react';
import { RefreshCw, Copy, Check, TableProperties, Save, Sparkles } from 'lucide-react';
import { PRESETS, Preset } from '../presets';
import { formatMarkdownTables } from '../utils/tableFormatter';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onConvert: () => void;
  isConverting: boolean;
  selectedPreset: string;
  onSelectPreset: (preset: Preset) => void;
  onSave?: () => void;
  onOpenTranscribe?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onConvert,
  isConverting,
  selectedPreset,
  onSelectPreset,
  onSave,
  onOpenTranscribe,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(false);

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
          <label htmlFor="preset-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            プリセット:
          </label>
          <select
            id="preset-select"
            value={selectedPreset}
            onChange={(e) => {
              const p = PRESETS.find((item) => item.id === e.target.value);
              if (p) onSelectPreset(p);
            }}
            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            <option value="custom">カスタム編集</option>
          </select>
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
          placeholder="| name | 1 | 2 |&#10;|---|---|---|&#10;| A | cdef | gabc |"
          spellCheck={false}
          className="w-full flex-1 min-w-0 min-h-[380px] p-4 pl-3 bg-transparent font-mono text-xs sm:text-sm text-slate-200 resize-none outline-none leading-relaxed selection:bg-indigo-500/30 overflow-auto whitespace-pre block"
        />
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
    </div>
  );
};
