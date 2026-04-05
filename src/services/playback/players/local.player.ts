import { createAudioPlaylist, setAudioModeAsync } from "expo-audio";
import type { AudioPlaylist, AudioSource, AudioPlaylistStatus } from "expo-audio";

import { log } from "@/src/shared/lib/log";

import type { ReconcilePayload } from "../playback.types";
import { PlaybackPlayer } from "../playback.player";

class LocalPlaybackPlayer extends PlaybackPlayer {
  readonly handlesQueue = true;

  #playlist: AudioPlaylist | null = null;
  #lastPlaying = false;
  #lastIndex = -1;

  public setup = async () => {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    this.#playlist = createAudioPlaylist({
      updateInterval: 500,
      crossOrigin: 'anonymous',
    });

    this.#playlist.addListener('playlistStatusUpdate', (status: AudioPlaylistStatus) => {
      this.emit('progress', status.currentTime * 1000, status.duration * 1000);

      if (status.playing !== this.#lastPlaying) {
        this.#lastPlaying = status.playing;
        this.emit('stateChanged', status.playing);
      }
    });

    this.#playlist.addListener('trackChanged', ({ currentIndex }: { previousIndex: number; currentIndex: number }) => {
      if (this.#lastIndex >= 0 && currentIndex !== this.#lastIndex) {
        this.emit('trackEnded');
      }
      this.#lastIndex = currentIndex;
    });

    log("LocalPlaybackPlayer set up with expo-audio");
  };

  public reconcile = async (payload: ReconcilePayload) => {
    if (!this.#playlist) return;

    this.#playlist.clear();

    for (const item of payload.queue) {
      const source: AudioSource = {
        uri: item.streamUrl,
        headers: item.metadata.headers,
        name: item.metadata.title,
      };
      this.#playlist.add(source);
    }

    this.#lastIndex = payload.currentIndex;
    if (payload.currentIndex > 0) {
      this.#playlist.skipTo(payload.currentIndex);
    }

    this.#playlist.volume = payload.volume;
    this.#playlist.play();

    if (payload.positionMs > 0) {
      await this.#playlist.seekTo(payload.positionMs / 1000);
    }

    log("LocalPlaybackPlayer reconciled:", payload.queue.length, "tracks, index:", payload.currentIndex);
  };

  public skipTo = async (index: number, positionMs: number) => {
    if (!this.#playlist) return;
    this.#lastIndex = index;
    this.#playlist.skipTo(index);

    if (positionMs > 0) {
      await this.#playlist.seekTo(positionMs / 1000);
    }
  };

  public pause = (): Promise<void> => {
    this.#playlist?.pause();
    return Promise.resolve();
  };

  public resume = (): Promise<void> => {
    this.#playlist?.play();
    return Promise.resolve();
  };

  public seek = async (positionMs: number) => {
    if (!this.#playlist) return;
    await this.#playlist.seekTo(positionMs / 1000);
  };

  public setVolume = (volume: number): Promise<void> => {
    if (this.#playlist) {
      this.#playlist.volume = volume;
    }
    return Promise.resolve();
  };

  public stop = (): Promise<void> => {
    this.#playlist?.pause();
    this.#playlist?.clear();
    this.#lastIndex = -1;
    return Promise.resolve();
  };

  public dispose = (): Promise<void> => {
    this.#playlist?.destroy();
    this.#playlist = null;
    this.#lastIndex = -1;
    return Promise.resolve();
  };

}

export { LocalPlaybackPlayer };
