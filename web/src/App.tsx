import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Music, Github, AlertTriangle, Cloud, Radio } from 'lucide-react';
import { initWasm, convertToSMF } from './wasm';
import { MidiAudioPlayer, MidiMetadata, PlayerState } from './player';
import { PRESETS, Preset } from './presets';
import { Editor } from './components/Editor';
import { PlayerControls } from './components/PlayerControls';
import { CheatSheet } from './components/CheatSheet';

export function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);

  const [markdown, setMarkdown] = useState(PRESETS[0].markdown);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].id);

  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [smfBytes, setSmfBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<MidiMetadata | null>(null);

  // プレイヤー状態
  const [playerState, setPlayerState] = useState<PlayerState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeTracks, setActiveTracks] = useState<Set<number>>(new Set());
  const [volume, setVolume] = useState(-6);
  const [engine, setEngine] = useState<'soundfont' | 'synth'>('soundfont');
  const [isLoadingSoundfont, setIsLoadingSoundfont] = useState(false);

  const playerRef = useRef<MidiAudioPlayer | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Wasm 初期化
  useEffect(() => {
    let mounted = true;
    initWasm()
      .then(() => {
        if (mounted) {
          setWasmReady(true);
        }
      })
      .catch((err) => {
        if (mounted) {
          setWasmError(err.message || 'Wasm初期化失敗');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // プレイヤーのインスタンス生成
  useEffect(() => {
    const player = new MidiAudioPlayer({
      onStateChange: (state) => setPlayerState(state),
      onProgress: (time, prog) => {
        setCurrentTime(time);
        setProgress(prog);
      },
      onActiveNotesChange: (tracks) => setActiveTracks(tracks),
      onLoadingSoundfont: (loading) => setIsLoadingSoundfont(loading),
    });
    player.setEngine(engine);
    playerRef.current = player;

    return () => {
      player.dispose();
    };
  }, []);

  const handleEngineChange = (newEngine: 'soundfont' | 'synth') => {
    setEngine(newEngine);
    playerRef.current?.setEngine(newEngine);
  };

  // Markdown -> SMF 変換処理
  const handleConvert = useCallback(
    async (srcMarkdown: string) => {
      if (!wasmReady) return;

      setIsConverting(true);
      setConvertError(null);

      try {
        const result = convertToSMF(srcMarkdown);
        if (!result.success || !result.smf) {
          setConvertError(result.error || '変換に失敗しました');
          setIsConverting(false);
          return;
        }

        setSmfBytes(result.smf);

        // MIDI パーサー & プレイヤーへロード
        if (playerRef.current) {
          const meta = await playerRef.current.loadMidiBytes(result.smf);
          setMetadata(meta);
        }
      } catch (err: any) {
        setConvertError(err.message || '予期せぬエラーが発生しました');
      } finally {
        setIsConverting(false);
      }
    },
    [wasmReady]
  );

  // Wasm準備完了時に初期プリセットを即変換
  useEffect(() => {
    if (wasmReady) {
      handleConvert(markdown);
    }
  }, [wasmReady, handleConvert]);

  // Markdown 変更時のハンドラ（デバウンスで自動変換）
  const handleMarkdownChange = (newVal: string) => {
    setMarkdown(newVal);
    setSelectedPreset('custom');

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      handleConvert(newVal);
    }, 600);
  };

  // プリセット選択時
  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setMarkdown(preset.markdown);
    handleConvert(preset.markdown);
  };

  // MIDI ダウンロード
  const handleDownload = () => {
    if (!smfBytes) return;
    const blob = new Blob([smfBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (metadata?.title ? metadata.title.replace(/[\/\\?%*:|"<>]/g, '_') : 'music') + '.mid';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ナビゲーションバー */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-lg text-slate-100">mdmml</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Web & Workers
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Markdown table MML to Standard MIDI File (SMF)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Wasm 稼働ステータス */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  wasmReady ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-mono text-[11px]">
                {wasmReady ? 'Go Wasm Ready' : 'Loading Wasm...'}
              </span>
            </div>

            {/* Cloudflare Workers バッジ */}
            <div className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare Workers</span>
            </div>

            {/* GitHub リンク */}
            <a
              href="https://github.com/umemak/mdmml"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="GitHub Repository"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Wasm エラー */}
        {wasmError && (
          <div className="p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl flex items-center space-x-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold">WebAssemblyの初期化に失敗しました</p>
              <p className="text-xs text-red-300/80">{wasmError}</p>
            </div>
          </div>
        )}

        {/* 変換エラー */}
        {convertError && (
          <div className="p-4 bg-amber-950/40 border border-amber-800 text-amber-200 rounded-xl flex items-center space-x-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">MMLの変換でエラーが発生しました</p>
              <p className="text-xs text-amber-300/80">{convertError}</p>
            </div>
          </div>
        )}

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 左カラム: エディタ & チートシート */}
          <div className="lg:col-span-7 space-y-4">
            <Editor
              value={markdown}
              onChange={handleMarkdownChange}
              onConvert={() => handleConvert(markdown)}
              isConverting={isConverting}
              selectedPreset={selectedPreset}
              onSelectPreset={handleSelectPreset}
            />
            <CheatSheet />
          </div>

          {/* 右カラム: プレイヤー & トラックビジュアライザ */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <PlayerControls
              metadata={metadata}
              state={playerState}
              currentTime={currentTime}
              progress={progress}
              activeTracks={activeTracks}
              onPlay={() => playerRef.current?.play()}
              onPause={() => playerRef.current?.pause()}
              onStop={() => playerRef.current?.stop()}
              onSeek={(t) => playerRef.current?.seek(t)}
              onDownload={handleDownload}
              volume={volume}
              onVolumeChange={(v) => {
                setVolume(v);
                playerRef.current?.setVolume(v);
              }}
              isConverting={isConverting}
              engine={engine}
              onEngineChange={handleEngineChange}
              isLoadingSoundfont={isLoadingSoundfont}
            />

            {/* ガイド・情報カード */}
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-slate-200 font-medium">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>mdmml の仕組み</span>
              </div>
              <p className="leading-relaxed">
                Markdownの表に書かれたMMLを、ブラウザ内の Go WebAssembly (Wasm) でリアルタイムに Standard MIDI File
                (SMF) に変換し、Web Audio API (Tone.js) で合成・再生します。
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Go 1.24+ WebAssembly</span>
                <span>Cloudflare Workers Static Assets</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          mdmml &copy; {new Date().getFullYear()} - Created with Go & Cloudflare Workers
        </p>
      </footer>
    </div>
  );
}

export default App;
