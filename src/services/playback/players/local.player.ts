import { Platform } from "react-native";

import { createAudioPlaylist, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlaylist, AudioPlayer, AudioSource, AudioPlaylistStatus } from "expo-audio";

import { log, warn } from "@/src/shared/lib/log";

import type { ReconcilePayload, TrackMetadata } from "../playback.types";
import { PlaybackPlayer } from "../playback.player";

/**
 * Local playback player backed by expo-audio AudioPlaylist.
 *
 * Uses AudioPlaylist for gapless queue playback with background audio.
 * Lock screen controls use a separate AudioPlayer on native (since
 * AudioPlaylist doesn't expose setActiveForLockScreen) and MediaSession
 * API on web.
 */
class LocalPlaybackPlayer extends PlaybackPlayer {
  readonly handlesQueue = true;

  #playlist: AudioPlaylist | null = null;
  /** Headless player used only for lock screen metadata on native */
  #lockScreenPlayer: AudioPlayer | null = null;
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

    // On native, create a headless player for lock screen controls
    if (Platform.OS !== 'web') {
      this.#lockScreenPlayer = createAudioPlayer(null, { updateInterval: 0 });
    }

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

    const current = payload.queue[payload.currentIndex];
    if (current) {
      this.#setLockScreen(current.metadata);
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

  public pause = async () => {
    this.#playlist?.pause();
  };

  public resume = async () => {
    this.#playlist?.play();
  };

  public seek = async (positionMs: number) => {
    if (!this.#playlist) return;
    await this.#playlist.seekTo(positionMs / 1000);
  };

  public setVolume = async (volume: number) => {
    if (this.#playlist) {
      this.#playlist.volume = volume;
    }
  };

  public stop = async () => {
    this.#playlist?.pause();
    this.#playlist?.clear();
    this.#lastIndex = -1;
  };

  public dispose = async () => {
    this.#playlist?.destroy();
    this.#playlist = null;
    this.#lockScreenPlayer?.remove();
    this.#lockScreenPlayer = null;
    this.#lastIndex = -1;
  };

  /** Update lock screen metadata. Called by the service on track change. */
  public updateLockScreen = (metadata: TrackMetadata) => {
    this.#setLockScreen(metadata);
  };

  #setLockScreen = (metadata: TrackMetadata) => {
    const meta = {
      title: metadata.title,
      artist: metadata.artistName,
      albumTitle: metadata.albumTitle,
      artworkUrl: metadata.artworkUrl,
    };

    // Native: use the headless AudioPlayer's lock screen API
    if (this.#lockScreenPlayer) {
      this.#lockScreenPlayer.setActiveForLockScreen(true, meta);
      return;
    }

    // Web: use MediaSession API directly
    if (Platform.OS === 'web' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artistName,
        album: metadata.albumTitle,
        artwork: metadata.artworkUrl
          ? [{ src: metadata.artworkUrl, sizes: '256x256', type: 'image/jpeg' }]
          : [],
      });
    }
  };
}

export { LocalPlaybackPlayer };
