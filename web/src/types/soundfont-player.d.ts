declare module 'soundfont-player' {
  export interface Player {
    play(
      note: string | number,
      time?: number,
      options?: {
        duration?: number;
        gain?: number;
        attack?: number;
        decay?: number;
        sustain?: number;
        release?: number;
        loop?: boolean;
      }
    ): {
      stop(time?: number): void;
    };
    stop(time?: number): void;
  }

  export interface InstrumentOptions {
    soundfont?: 'FluidR3_GM' | 'MusyngKite';
    format?: 'mp3' | 'ogg';
    nameToUrl?: (name: string, soundfont: string, format: string) => string;
    destination?: AudioNode;
  }

  export function instrument(
    ac: AudioContext | BaseAudioContext,
    name: string,
    options?: InstrumentOptions
  ): Promise<Player>;
}
