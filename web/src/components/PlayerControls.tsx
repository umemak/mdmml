import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Download,
  Volume2,
  Music,
  Activity,
  Sparkles,
  Loader2,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { MidiMetadata, PlayerState, getMeasureDuration } from '../player';

interface PlayerControlsProps {
  metadata: MidiMetadata | null;
  state: PlayerState;
  currentTime: number;
  progress: number;
  activeTracks: Set<number>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onDownload: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isConverting: boolean;
  isLoadingSoundfont: boolean;
}

function formatTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  metadata,
  state,
  currentTime,
  progress: _progress,
  activeTracks,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onDownload,
  volume,
  onVolumeChange,
  isConverting,
  isLoadingSoundfont,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const duration = metadata?.duration || 0;
  const bpm = metadata?.bpm || 120;
  const timeSig = metadata?.timeSignature || '4/4';

  const measureDuration = useMemo(() => {
    return getMeasureDuration(bpm, timeSig);
  }, [bpm, timeSig]);

  const totalMeasures = useMemo(() => {
    if (duration <= 0 || measureDuration <= 0) return 1;
    return Math.max(1, Math.ceil(duration / measureDuration));
  }, [duration, measureDuration]);

  // ドラッグ中はローカル値、通常時は再生位置
  const effectiveTime = isDragging ? dragValue : currentTime;

  const currentMeasure = useMemo(() => {
    if (measureDuration <= 0) return 1;
    return Math.min(totalMeasures, Math.floor(effectiveTime / measureDuration) + 1);
  }, [effectiveTime, measureDuration, totalMeasures]);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (effectiveTime / duration) * 100)) : 0;

  // 小節指定シーク
  const handleSeekMeasure = (measureNumber: number) => {
    const target = Math.max(0, Math.min(duration, (measureNumber - 1) * measureDuration));
    onSeek(target);
  };

  // 前の小節へ
  const handlePrevMeasure = () => {
    const currentStart = (currentMeasure - 1) * measureDuration;
    // 小節開始から0.4秒以上進んでいれば現在小節の頭、そうでなければ前小節へ
    if (effectiveTime - currentStart > 0.4) {
      handleSeekMeasure(currentMeasure);
    } else {
      handleSeekMeasure(Math.max(1, currentMeasure - 1));
    }
  };

  // 次の小節へ
  const handleNextMeasure = () => {
    handleSeekMeasure(Math.min(totalMeasures, currentMeasure + 1));
  };

  if (!metadata) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <Music className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
        <p className="text-sm">Markdownを入力すると、ここにMIDIプレビューとプレイヤーが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-5">
      {/* 曲情報ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">
              {metadata.title || 'Untitled Track'}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              SMF (Format 1)
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>GM SoundFont</span>
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
            <span>BPM: <strong className="text-slate-200">{metadata.bpm}</strong></span>
            <span>拍子: <strong className="text-slate-200">{metadata.timeSignature}</strong></span>
            <span>トラック数: <strong className="text-slate-200">{metadata.tracks.length}</strong></span>
          </div>
        </div>

        {/* ダウンロードボタン */}
        <button
          onClick={onDownload}
          className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>.mid 保存</span>
        </button>
      </div>

      {/* Soundfont ロード中インジケータ */}
      {isLoadingSoundfont && (
        <div className="flex items-center space-x-2 text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 px-3 py-1.5 rounded-lg animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>SoundFont音源データを読み込み中...</span>
        </div>
      )}

      {/* シークバー & 再生時間 & 現在の小節 */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.02"
            value={effectiveTime}
            onPointerDown={() => {
              setIsDragging(true);
              setDragValue(currentTime);
            }}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDragValue(val);
              if (!isDragging) {
                onSeek(val);
              }
            }}
            onPointerUp={(e) => {
              setIsDragging(false);
              const val = parseFloat((e.target as HTMLInputElement).value);
              onSeek(val);
            }}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-indigo-400 bg-slate-800"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-slate-200 font-medium">{formatTime(effectiveTime)}</span>
            <span className="text-slate-600">/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-sans font-medium">
              第 <strong>{currentMeasure}</strong> / {totalMeasures} 小節
            </span>
          </div>
        </div>
      </div>

      {/* 小節セレクター & ミニタイムライン */}
      <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>小節ジャンプ</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] text-slate-400">小節直接指定:</label>
            <select
              value={currentMeasure}
              onChange={(e) => handleSeekMeasure(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Array.from({ length: totalMeasures }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  第 {m} 小節 ({formatTime((m - 1) * measureDuration)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 小節クイックボタン一覧（クリックでその小節から即座に再生） */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {Array.from({ length: totalMeasures }, (_, i) => i + 1).map((m) => {
            const isCurr = m === currentMeasure;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSeekMeasure(m)}
                title={`第 ${m} 小節へジャンプ (${formatTime((m - 1) * measureDuration)})`}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition shrink-0 cursor-pointer ${
                  isCurr
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/40 ring-1 ring-indigo-400 scale-105'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* 再生・コントロールボタン */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* 先頭に戻る */}
          <button
            onClick={() => onSeek(0)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="曲の先頭（第1小節）に戻る"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* 前の小節へ */}
          <button
            onClick={handlePrevMeasure}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="前の小節へ移動"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* 再生 / 一時停止 */}
          {state === 'playing' ? (
            <button
              onClick={onPause}
              className="p-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-full transition cursor-pointer shadow-lg shadow-amber-500/20"
              title="一時停止"
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={isConverting || isLoadingSoundfont}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition shadow-lg shadow-indigo-500/30 cursor-pointer disabled:opacity-50"
              title="再生"
            >
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </button>
          )}

          {/* 停止 */}
          <button
            onClick={onStop}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition cursor-pointer"
            title="停止 (位置リセット)"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {/* 次の小節へ */}
          <button
            onClick={handleNextMeasure}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="次の小節へ移動"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* 音量調整 */}
        <div className="flex items-center space-x-2 text-slate-400 bg-slate-950/40 border border-slate-800/80 px-3 py-1.5 rounded-xl">
          <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="range"
            min="-30"
            max="0"
            step="1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
            title={`音量: ${volume} dB`}
          />
        </div>
      </div>

      {/* 各トラックの演奏状況インジケータ */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Tracks & Instruments</span>
          <span className="flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>演奏状況ビジュアライザ</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {metadata.tracks.map((track) => {
            const isActive = activeTracks.has(track.id);
            return (
              <div
                key={track.id}
                className={`flex flex-col justify-between p-2.5 rounded-lg border text-xs transition-colors duration-75 ${
                  isActive
                    ? 'bg-indigo-950/80 border-cyan-500/70 text-indigo-100 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {isActive && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-75 ${
                          isActive
                            ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                            : 'bg-slate-700'
                        }`}
                      />
                    </span>
                    <span className="font-medium truncate">{track.name}</span>
                    {isActive && (
                      <span className="flex items-end space-x-0.5 h-3 ml-1 shrink-0">
                        <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="w-0.5 h-1.5 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                        <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">
                    {track.notesCount} notes
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span
                    className={`px-1.5 py-0.5 rounded truncate max-w-[140px] transition-colors ${
                      isActive ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    @{track.instrumentNumber + 1} {track.instrumentName}
                  </span>
                  <span className="text-slate-500 font-mono">Ch {track.channel + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

