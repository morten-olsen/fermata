import TrackPlayer, { Event } from "react-native-track-player";

/**
 * Background playback service registered with React Native Track Player.
 * Handles remote control events (lock screen, notification controls).
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext()
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious()
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    TrackPlayer.seekTo(position)
  );
}
