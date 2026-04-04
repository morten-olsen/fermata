import { Platform } from "react-native";

import * as NowPlaying from "@/modules/now-playing/src";

import { log } from "@/src/shared/lib/log";

import type { Services } from "../services/services";
import { PlaybackService } from "../playback/playback.service";
import type { QueueItem } from "../playback/playback.types";

const SEEK_INTERVAL_MS = 10_000;

class NowPlayingService {
  #services: Services;
  #unsubs: Array<() => void> = [];
  #active = false;

  constructor(services: Services) {
    this.#services = services;
  }

  public initialize = () => {
    if (Platform.OS === 'web') return;

    const playback = this.#services.get(PlaybackService);

    // Listen for remote commands from the notification
    const commandSub = NowPlaying.addCommandListener((event) => {
      this.#handleCommand(event);
    });
    this.#unsubs.push(() => commandSub.remove());

    this.#unsubs.push(playback.on('trackChanged', (track) => {
      if (track) {
        this.#showForTrack(track);
      }
    }));

    this.#unsubs.push(playback.on('stateChanged', () => {
      const state = playback.getState();

      if (state.status === 'idle') {
        if (this.#active) {
          NowPlaying.hide();
          this.#active = false;
        }
        return;
      }

      if (state.status === 'playing' || state.status === 'paused') {
        NowPlaying.updatePlaybackState({
          playing: state.status === 'playing',
          positionMs: state.positionMs,
        });
      }
    }));

    log("NowPlayingService initialized");
  };

  #showForTrack = (track: QueueItem) => {
    const artworkUrl = this.#resolveArtworkUrl(track);

    NowPlaying.updateMetadata({
      title: track.title,
      artist: track.artistName,
      albumTitle: track.albumTitle,
      artworkUrl,
      durationMs: track.duration * 1000,
    });

    // Music gets skip buttons, podcasts/audiobooks get seek buttons
    const isMusic = track.type === 'track' && !track.tracksProgress;
    NowPlaying.setButtons({
      skipNext: isMusic,
      skipPrevious: isMusic,
      seekForward: !isMusic,
      seekBackward: !isMusic,
    });

    if (!this.#active) {
      NowPlaying.show();
      this.#active = true;
    }

    const playback = this.#services.get(PlaybackService);
    const state = playback.getState();
    NowPlaying.updatePlaybackState({
      playing: state.status === 'playing',
      positionMs: state.positionMs,
    });
  };

  #handleCommand = (event: NowPlaying.NowPlayingCommandEvent) => {
    const playback = this.#services.get(PlaybackService);

    switch (event.command) {
      case 'play':
      case 'pause':
        void playback.togglePlayPause();
        break;
      case 'skipNext':
        void playback.skipNext();
        break;
      case 'skipPrevious':
        void playback.skipPrevious();
        break;
      case 'seekForward': {
        const state = playback.getState();
        void playback.seekTo(state.positionMs + SEEK_INTERVAL_MS);
        break;
      }
      case 'seekBackward': {
        const state = playback.getState();
        void playback.seekTo(Math.max(0, state.positionMs - SEEK_INTERVAL_MS));
        break;
      }
      case 'seek':
        if (event.positionMs != null) {
          void playback.seekTo(event.positionMs);
        }
        break;
    }
  };

  #resolveArtworkUrl = (track: QueueItem): string | undefined => {
    return track.artworkUri ?? undefined;
  };

  public dispose = () => {
    for (const unsub of this.#unsubs) unsub();
    this.#unsubs = [];
    if (this.#active) {
      NowPlaying.hide();
      this.#active = false;
    }
  };
}

export { NowPlayingService };
