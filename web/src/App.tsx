import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Music,
  Github,
  AlertTriangle,
  Radio,
  User as UserIcon,
  LogIn,
  LogOut,
  Save,
  FolderOpen,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { initWasm, convertToSMF } from './wasm';
import { MidiAudioPlayer, MidiMetadata, PlayerState } from './player';
import { PRESETS, Preset } from './presets';
import { Editor } from './components/Editor';
import { PlayerControls } from './components/PlayerControls';
import { CheatSheet } from './components/CheatSheet';
import { AuthModal } from './components/AuthModal';
import { SaveScoreModal } from './components/SaveScoreModal';
import { ScoresListModal } from './components/ScoresListModal';
import {
  fetchCurrentUser,
  logout,
  createScore,
  updateScore,
  fetchScoreDetail,
  User,
} from './api';

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

  // 認証 & D1 楽譜状態
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [scoresListModalOpen, setScoresListModalOpen] = useState(false);
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(null);
  const [currentScoreTitle, setCurrentScoreTitle] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const playerRef = useRef<MidiAudioPlayer | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // 初回ログイン状態チェック
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setCurrentUser(user);
    });
  }, []);

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
    setCurrentScoreId(null);
    setCurrentScoreTitle('');
    handleConvert(preset.markdown);
  };

  // 保存ボタン押下
  const handleOpenSaveModal = () => {
    if (!currentUser) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    setSaveModalOpen(true);
  };

  // スコア保存処理
  const handleSaveScore = async (title: string, asNew: boolean) => {
    if (!currentUser) return;

    if (asNew || !currentScoreId) {
      const saved = await createScore(title, markdown);
      setCurrentScoreId(saved.id);
      setCurrentScoreTitle(saved.title);
      showToast(`「${saved.title}」をD1に保存しました`);
    } else {
      const updated = await updateScore(currentScoreId, title, markdown);
      setCurrentScoreTitle(updated.title);
      showToast(`「${updated.title}」を上書き保存しました`);
    }
  };

  // 保存済み楽譜選択時
  const handleSelectSavedScore = async (scoreId: string) => {
    try {
      const detail = await fetchScoreDetail(scoreId);
      setCurrentScoreId(detail.id);
      setCurrentScoreTitle(detail.title);
      setMarkdown(detail.content);
      setSelectedPreset('custom');
      handleConvert(detail.content);
      showToast(`「${detail.title}」を読み込みました`);
    } catch (err: any) {
      alert('楽譜の読み込みに失敗しました: ' + (err.message || ''));
    }
  };

  // 新規スコア作成
  const handleNewScore = () => {
    setCurrentScoreId(null);
    setCurrentScoreTitle('');
    setMarkdown(PRESETS[0].markdown);
    setSelectedPreset(PRESETS[0].id);
    handleConvert(PRESETS[0].markdown);
    showToast('新規の楽譜を開始しました');
  };

  // ログアウト処理
  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    showToast('ログアウトしました');
  };

  // MIDI ダウンロード
  const handleDownload = () => {
    if (!smfBytes) return;
    const blob = new Blob([smfBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename =
      (currentScoreTitle || metadata?.title ? (currentScoreTitle || metadata?.title || '').replace(/[\/\\?%*:|"<>]/g, '_') : 'music') +
      '.mid';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 bg-indigo-600 text-white text-xs font-medium rounded-xl shadow-2xl shadow-indigo-500/40 border border-indigo-400/30 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
                  D1 Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Markdown table MML to Standard MIDI File (SMF)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 認証 & D1 楽譜操作エリア */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-xl">
                <button
                  onClick={handleOpenSaveModal}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-sm shadow-indigo-500/30"
                  title="Cloudflare D1 に保存"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {currentScoreId ? '上書き保存' : 'D1に保存'}
                  </span>
                  <span className="sm:hidden">保存</span>
                </button>

                <button
                  onClick={() => setScoresListModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  title="保存した楽譜を開く"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">マイ楽譜</span>
                </button>

                <div className="h-4 w-px bg-slate-800 hidden md:block" />

                <div className="hidden md:flex items-center space-x-1 text-xs text-slate-400 px-1">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="max-w-[120px] truncate text-[11px] font-mono">
                    {currentUser.email}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="ログアウト"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ログイン / 新規登録</span>
                </button>
              </div>
            )}

            {/* Wasm 稼働ステータス */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  wasmReady ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-mono text-[11px]">
                {wasmReady ? 'Wasm Ready' : 'Loading...'}
              </span>
            </div>

            {/* Cloudflare D1 バッジ */}
            <div className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Database className="w-3.5 h-3.5" />
              <span>D1 DB</span>
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
        {/* 現在編集中ラベル */}
        {currentScoreTitle && (
          <div className="flex items-center space-x-2 text-xs bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 px-3.5 py-2 rounded-xl">
            <Music className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              編集中: <strong className="text-white font-medium">{currentScoreTitle}</strong>
              {currentScoreId && ' (Cloudflare D1に保存済み)'}
            </span>
          </div>
        )}

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
              onSave={handleOpenSaveModal}
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
                (SMF) に変換し、Web Audio API (Tone.js + SoundFont) で合成・再生します。
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Go 1.24+ WebAssembly</span>
                <span>Cloudflare Workers + D1 Database</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          mdmml &copy; {new Date().getFullYear()} - Created with Go & Cloudflare Workers D1
        </p>
      </footer>

      {/* モーダル群 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`ログインしました (${user.email})`);
        }}
      />

      <SaveScoreModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveScore}
        initialTitle={currentScoreTitle || metadata?.title || '無題の楽譜'}
        isEditingExisting={Boolean(currentScoreId)}
      />

      <ScoresListModal
        isOpen={scoresListModalOpen}
        onClose={() => setScoresListModalOpen(false)}
        onSelectScore={handleSelectSavedScore}
        onNewScore={handleNewScore}
        currentScoreId={currentScoreId}
      />
    </div>
  );
}

export default App;
