import * as Tone from 'tone';
import { Midi, Track } from '@tonejs/midi';
import Soundfont, { Player as SoundfontInstrument } from 'soundfont-player';

function decodeMidiText(str?: string): string {
  if (!str) return '';
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.replace(/^"(.*)"$/, '$1').trim();
  } catch {
    return str.replace(/^"(.*)"$/, '$1').trim();
  }
}

export function toSoundfontSlug(instrumentName: string): string {
  if (!instrumentName) return 'acoustic_grand_piano';
  return instrumentName
    .toLowerCase()
    .replace(/[()]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

export interface ParsedTrack {
  id: number;
  name: string;
  channel: number;
  instrumentNumber: number;
  instrumentName: string;
  instrumentSlug: string;
  notesCount: number;
}

export interface MidiMetadata {
  title: string;
  bpm: number;
  duration: number;
  timeSignature: string;
  tracks: ParsedTrack[];
}

export type PlayerState = 'stopped' | 'playing' | 'paused';
export type SoundEngine = 'soundfont' | 'synth';

export interface PlaybackCallback {
  onStateChange?: (state: PlayerState) => void;
  onProgress?: (time: number, progress: number) => void;
  onActiveNotesChange?: (activeTracks: Set<number>) => void;
  onLoadingSoundfont?: (loading: boolean, instrumentName?: string) => void;
}

export class MidiAudioPlayer {
  private midi: Midi | null = null;
  private synths: Tone.PolySynth[] = [];
  private soundfontInstruments: Map<string, SoundfontInstrument> = new Map();
  private trackInstruments: SoundfontInstrument[] = [];
  private engine: SoundEngine = 'soundfont';
  private state: PlayerState = 'stopped';
  private scheduledEvents: any[] = [];
  private animFrameId: number | null = null;
  private callbacks: PlaybackCallback = {};
  private activeTracks = new Set<number>();
  private startTime = 0;
  private pauseOffset = 0;
  private totalDuration = 0;
  private volumeDb = -6;

  constructor(callbacks?: PlaybackCallback) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: PlaybackCallback) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setEngine(engine: SoundEngine) {
    this.engine = engine;
  }

  public getEngine(): SoundEngine {
    return this.engine;
  }

  public async loadMidiBytes(bytes: Uint8Array): Promise<MidiMetadata> {
    this.stop();
    this.midi = new Midi(bytes);

    const rawTitle = this.midi.name || (this.midi.tracks[0]?.name ? this.midi.tracks[0].name : '');
    const title = decodeMidiText(rawTitle) || 'Untitled';
    const bpm = this.midi.header.tempos[0]?.bpm ? Math.round(this.midi.header.tempos[0].bpm) : 120;
    const timeSig = this.midi.header.timeSignatures[0]
      ? `${this.midi.header.timeSignatures[0].timeSignature[0]}/${this.midi.header.timeSignatures[0].timeSignature[1]}`
      : '4/4';

    this.totalDuration = this.midi.duration;

    // mdmml は名前だけのトラックとノートトラックが分かれることがあるため結合・補正
    const tracksWithNotes: Track[] = [];
    let lastTrackName = '';

    for (let i = 0; i < this.midi.tracks.length; i++) {
      const t = this.midi.tracks[i];
      const decodedName = decodeMidiText(t.name);
      if (decodedName) {
        lastTrackName = decodedName;
      }
      if (t.notes.length > 0) {
        if (!t.name && lastTrackName) {
          t.name = lastTrackName;
        }
        tracksWithNotes.push(t);
      }
    }

    const parsedTracks: ParsedTrack[] = tracksWithNotes.map((t, idx) => {
      const instName = t.instrument.name || 'Acoustic Grand Piano';
      const slug = toSoundfontSlug(instName);
      return {
        id: idx,
        name: decodeMidiText(t.name) || `Part ${idx + 1}`,
        channel: t.channel,
        instrumentNumber: t.instrument.number,
        instrumentName: instName,
        instrumentSlug: slug,
        notesCount: t.notes.length,
      };
    });

    // シンセ音源の初期化
    this.initSynths(parsedTracks.length);

    // SoundFont の事前ロード
    await this.preloadSoundfonts(parsedTracks);

    return {
      title,
      bpm,
      duration: this.totalDuration,
      timeSignature: timeSig,
      tracks: parsedTracks,
    };
  }

  private async preloadSoundfonts(tracks: ParsedTrack[]) {
    const rawContext = Tone.getContext().rawContext as AudioContext;
    if (!rawContext) return;

    this.callbacks.onLoadingSoundfont?.(true);

    const neededSlugs = Array.from(new Set(tracks.map((t) => t.instrumentSlug)));
    this.trackInstruments = [];

    try {
      await Promise.all(
        neededSlugs.map(async (slug) => {
          if (!this.soundfontInstruments.has(slug)) {
            try {
              const inst = await Soundfont.instrument(rawContext, slug as any, {
                soundfont: 'FluidR3_GM',
              });
              this.soundfontInstruments.set(slug, inst);
            } catch (err) {
              console.warn(`SoundFont ${slug} の取得に失敗しました。デフォルト音源を使用します。`, err);
              // フォールバック: acoustic_grand_piano
              if (!this.soundfontInstruments.has('acoustic_grand_piano')) {
                const fallback = await Soundfont.instrument(rawContext, 'acoustic_grand_piano' as any, {
                  soundfont: 'FluidR3_GM',
                });
                this.soundfontInstruments.set('acoustic_grand_piano', fallback);
                this.soundfontInstruments.set(slug, fallback);
              }
            }
          }
        })
      );

      // 各トラックに音源オブジェクトを割り当て
      tracks.forEach((t) => {
        const inst = this.soundfontInstruments.get(t.instrumentSlug) || this.soundfontInstruments.get('acoustic_grand_piano');
        if (inst) {
          this.trackInstruments.push(inst);
        }
      });
    } catch (err) {
      console.warn('SoundFont preload error:', err);
    } finally {
      this.callbacks.onLoadingSoundfont?.(false);
    }
  }

  private initSynths(count: number) {
    this.synths.forEach((s) => s.dispose());
    this.synths = [];

    const synthTypes: Array<'triangle' | 'square' | 'sawtooth' | 'sine'> = ['triangle', 'square', 'sawtooth', 'sine'];

    for (let i = 0; i < Math.max(count, 4); i++) {
      const oscType = synthTypes[i % synthTypes.length];
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: oscType },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.7,
          release: 0.2,
        },
      }).toDestination();
      synth.volume.value = this.volumeDb;
      this.synths.push(synth);
    }
  }

  public async play(): Promise<void> {
    if (!this.midi) return;
    await Tone.start();

    if (this.state === 'paused') {
      this.resume();
      return;
    }

    this.clearScheduledEvents();
    this.startTime = Tone.now() - this.pauseOffset;
    this.scheduleNotes(this.pauseOffset);
    this.state = 'playing';
    this.callbacks.onStateChange?.(this.state);
    this.startProgressLoop();
  }

  public pause(): void {
    if (this.state !== 'playing') return;
    const now = Tone.now();
    this.pauseOffset = now - this.startTime;
    this.clearScheduledEvents();
    this.stopAudioNodes();
    this.state = 'paused';
    this.callbacks.onStateChange?.(this.state);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.activeTracks.clear();
    this.callbacks.onActiveNotesChange?.(this.activeTracks);
  }

  public resume(): void {
    if (this.state !== 'paused' || !this.midi) return;
    this.clearScheduledEvents();
    this.startTime = Tone.now() - this.pauseOffset;
    this.scheduleNotes(this.pauseOffset);
    this.state = 'playing';
    this.callbacks.onStateChange?.(this.state);
    this.startProgressLoop();
  }

  public stop(): void {
    this.clearScheduledEvents();
    this.stopAudioNodes();
    this.pauseOffset = 0;
    this.state = 'stopped';
    this.callbacks.onStateChange?.(this.state);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.activeTracks.clear();
    this.callbacks.onActiveNotesChange?.(this.activeTracks);
    this.callbacks.onProgress?.(0, 0);
  }

  private stopAudioNodes() {
    this.synths.forEach((s) => s.releaseAll());
    this.soundfontInstruments.forEach((inst) => inst.stop());
  }

  public seek(targetSeconds: number): void {
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, Math.min(targetSeconds, this.totalDuration));
    this.callbacks.onProgress?.(this.pauseOffset, this.totalDuration > 0 ? this.pauseOffset / this.totalDuration : 0);
    if (wasPlaying) {
      this.play();
    }
  }

  public setVolume(decibels: number): void {
    this.volumeDb = decibels;
    this.synths.forEach((s) => {
      s.volume.value = decibels;
    });
  }

  private scheduleNotes(fromTime: number) {
    if (!this.midi) return;

    const baseAudioTime = Tone.now();
    const tracksWithNotes = this.midi.tracks.filter((t) => t.notes.length > 0);
    const volumeFactor = Math.pow(10, this.volumeDb / 20);

    tracksWithNotes.forEach((track, trackIndex) => {
      const synth = this.synths[trackIndex % this.synths.length];
      const sfInstrument = this.trackInstruments[trackIndex];

      track.notes.forEach((note) => {
        if (note.time + note.duration < fromTime) return;

        const noteStartTime = baseAudioTime + Math.max(0, note.time - fromTime);
        const duration = note.duration;
        const velocity = (note.velocity || 0.8) * volumeFactor;

        // UI ビジュアライザ更新イベント
        const eventId = Tone.Draw.schedule(() => {
          this.activeTracks.add(trackIndex);
          this.callbacks.onActiveNotesChange?.(new Set(this.activeTracks));

          window.setTimeout(() => {
            this.activeTracks.delete(trackIndex);
            this.callbacks.onActiveNotesChange?.(new Set(this.activeTracks));
          }, duration * 1000);
        }, noteStartTime);

        this.scheduledEvents.push(eventId);

        // 発音処理
        if (this.engine === 'soundfont' && sfInstrument) {
          sfInstrument.play(note.name, noteStartTime, {
            duration,
            gain: velocity * 2.0, // 音量バランス調整
          });
        } else if (synth) {
          synth.triggerAttackRelease(note.name, duration, noteStartTime, velocity);
        }
      });
    });

    const remainingTime = Math.max(0, this.totalDuration - fromTime);
    const stopTimer = window.setTimeout(() => {
      if (this.state === 'playing') {
        this.stop();
      }
    }, (remainingTime + 0.3) * 1000);

    this.scheduledEvents.push(stopTimer);
  }

  private clearScheduledEvents() {
    this.scheduledEvents.forEach((id) => {
      window.clearTimeout(id);
    });
    this.scheduledEvents = [];
  }

  private startProgressLoop() {
    const loop = () => {
      if (this.state !== 'playing') return;

      const current = Tone.now() - this.startTime;
      const progress = this.totalDuration > 0 ? Math.min(1, current / this.totalDuration) : 0;
      this.callbacks.onProgress?.(current, progress);

      if (current >= this.totalDuration + 0.3) {
        this.stop();
        return;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.animFrameId = requestAnimationFrame(loop);
  }

  public dispose() {
    this.stop();
    this.synths.forEach((s) => s.dispose());
    this.synths = [];
    this.soundfontInstruments.clear();
  }
}
