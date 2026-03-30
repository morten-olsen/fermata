export interface PlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  trackId?: string;
}

export type Unsubscribe = () => void;

export interface OutputAdapter {
  id: string;
  type: string;
  name: string;

  initialize(): Promise<void>;
  dispose(): Promise<void>;

  play(streamUrl: string, trackId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;

  getState(): PlaybackState;
  onStateChange(callback: (state: PlaybackState) => void): Unsubscribe;
}
