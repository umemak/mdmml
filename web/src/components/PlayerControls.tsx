import React from 'react';
import {
  Play,
  Pause,
  Square,
  Download,
  Volume2,
  Music,
  Activity,
  Sliders,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { MidiMetadata, PlayerState, SoundEngine } from '../player';

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
  engine: SoundEngine;
  onEngineChange: (engine: SoundEngine) => void;
  isLoadingSoundfont: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  metadata,
  state,
  currentTime,
  progress,
  activeTracks,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onDownload,
  volume,
  onVolumeChange,
  isConverting,
  engine,
  onEngineChange,
  isLoadingSoundfont,
}) => {
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

      {/* 音源切り替えセレクター */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium">再生音源:</span>
        </div>
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => onEngineChange('soundfont')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1 ${
              engine === 'soundfont'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 mr-1 text-cyan-300" />
            <span>GM SoundFont (リアル楽器)</span>
          </button>

          <button
            onClick={() => onEngineChange('synth')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              engine === 'synth'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>8-bit レトロシンセ</span>
          </button>
        </div>
      </div>

      {/* Soundfont ロード中インジケータ */}
      {isLoadingSoundfont && (
        <div className="flex items-center space-x-2 text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 px-3 py-1.5 rounded-lg animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>SoundFont音源データを読み込み中...</span>
        </div>
      )}

      {/* シークバー & 再生時間 */}
      <div className="space-y-1.5">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={metadata.duration || 1}
            step="0.05"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(metadata.duration)}</span>
        </div>
      </div>

      {/* コントロールボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {state === 'playing' ? (
            <button
              onClick={onPause}
              className="p-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-full transition cursor-pointer"
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

          <button
            onClick={onStop}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition cursor-pointer"
            title="停止"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* 音量調整 */}
        <div className="flex items-center space-x-2 text-slate-400">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min="-30"
            max="0"
            step="1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
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
                className={`flex flex-col justify-between p-2.5 rounded-lg border text-xs transition-all duration-100 ${
                  isActive
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/20 scale-[1.02]'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'
                      }`}
                    />
                    <span className="font-medium truncate">{track.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">
                    {track.notesCount} notes
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 truncate max-w-[140px]">
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
