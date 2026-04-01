import TrackPlayer, { Event } from "react-native-track-player";

import { usePlaybackStore } from "./playback.store";

/**
 * Background playback service registered with React Native Track Player.
 * Handles remote control events (lock screen, notification controls).
 *
 * Dispatches to the playback store, which delegates to the active output
 * adapter. This means lock screen controls work for both local and network
 * outputs (e.g. controlling a Home Assistant speaker from the lock screen).
 */
export function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void usePlaybackStore.getState().togglePlayPause();
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void usePlaybackStore.getState().togglePlayPause();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void usePlaybackStore.getState().skipNext();
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void usePlaybackStore.getState().skipPrevious();
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    void usePlaybackStore.getState().seekTo(position * 1000);
  });
}
