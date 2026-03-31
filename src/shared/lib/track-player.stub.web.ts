/**
 * Web implementation of react-native-track-player using HTML5 Audio.
 * Mirrors the RNTP API surface consumed by playback.store.ts.
 */

export enum Event {
  RemotePlay = "remote-play",
  RemotePause = "remote-pause",
  RemoteNext = "remote-next",
  RemotePrevious = "remote-previous",
  RemoteSeek = "remote-seek",
  PlaybackState = "playback-state",
  PlaybackActiveTrackChanged = "playback-active-track-changed",
}

export enum State {
  None = "none",
  Playing = "playing",
  Paused = "paused",
  Buffering = "buffering",
  Ready = "ready",
}

export enum Capability {
  Play = "play",
  Pause = "pause",
  SkipToNext = "skip-to-next",
  SkipToPrevious = "skip-to-previous",
  SeekTo = "seek-to",
}

export enum AppKilledPlaybackBehavior {
  StopPlaybackAndRemoveNotification = "stop-playback-and-remove-notification",
}

// ── Event emitter ────────────────────────────────────────

type Listener = (data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

function emit(event: string, data: unknown) {
  const set = listeners.get(event);
  if (set) {
    for (const fn of set) fn(data);
  }
}

// ── Audio state ──────────────────────────────────────────

interface Track {
  id: string;
  url: string;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
  duration?: number;
}

let audio: HTMLAudioElement | null = null;
let queue: Track[] = [];
let currentIndex = -1;
let currentState: State = State.None;
let volume = 1;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("playing", () => {
      setState(State.Playing);
    });

    audio.addEventListener("pause", () => {
      if (!audio!.ended) {
        setState(State.Paused);
      }
    });

    audio.addEventListener("waiting", () => {
      setState(State.Buffering);
    });

    audio.addEventListener("ended", () => {
      // Auto-advance to next track
      if (currentIndex < queue.length - 1) {
        loadTrack(currentIndex + 1);
        audio!.play().catch(() => {});
      } else {
        setState(State.Paused);
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      // Update duration from actual audio if not provided in track metadata
      if (currentIndex >= 0 && currentIndex < queue.length) {
        const track = queue[currentIndex];
        if (!track.duration && audio!.duration && isFinite(audio!.duration)) {
          track.duration = audio!.duration;
        }
      }
    });
  }
  return audio;
}

function setState(state: State) {
  currentState = state;
  emit(Event.PlaybackState, { state });
}

function loadTrack(index: number) {
  if (index < 0 || index >= queue.length) return;

  const prevIndex = currentIndex;
  currentIndex = index;
  const track = queue[currentIndex];
  const el = getAudio();

  el.src = track.url;
  el.volume = volume;
  el.load();

  emit(Event.PlaybackActiveTrackChanged, {
    track: { ...track },
    index: currentIndex,
    lastTrack: prevIndex >= 0 ? queue[prevIndex] : null,
    lastIndex: prevIndex,
  });

  updateMediaSession(track);
}

// ── MediaSession (browser media controls) ────────────────

function updateMediaSession(track: Track) {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title ?? "",
    artist: track.artist ?? "",
    album: track.album ?? "",
    artwork: track.artwork
      ? [{ src: track.artwork, sizes: "256x256", type: "image/jpeg" }]
      : [],
  });

  navigator.mediaSession.setActionHandler("play", () => TrackPlayer.play());
  navigator.mediaSession.setActionHandler("pause", () => TrackPlayer.pause());
  navigator.mediaSession.setActionHandler("previoustrack", () =>
    TrackPlayer.skipToPrevious()
  );
  navigator.mediaSession.setActionHandler("nexttrack", () =>
    TrackPlayer.skipToNext()
  );
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime != null) TrackPlayer.seekTo(details.seekTime);
  });
}

// ── TrackPlayer API ──────────────────────────────────────

const TrackPlayer = {
  registerPlaybackService: () => {},

  setupPlayer: async () => {
    getAudio(); // Ensure audio element is created
  },

  updateOptions: async () => {},

  addEventListener: (event: string, handler: Listener) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(handler);
    return {
      remove: () => {
        listeners.get(event)?.delete(handler);
      },
    };
  },

  add: async (tracks: Track | Track[]) => {
    const toAdd = Array.isArray(tracks) ? tracks : [tracks];
    queue.push(...toAdd);
    // If nothing is loaded, load the first track
    if (currentIndex === -1 && queue.length > 0) {
      loadTrack(0);
    }
  },

  reset: async () => {
    const el = getAudio();
    el.pause();
    el.removeAttribute("src");
    el.load();
    queue = [];
    currentIndex = -1;
    setState(State.None);
    emit(Event.PlaybackActiveTrackChanged, {
      track: null,
      index: -1,
      lastTrack: null,
      lastIndex: -1,
    });
  },

  play: async () => {
    const el = getAudio();
    if (!el.src && currentIndex === -1 && queue.length > 0) {
      loadTrack(0);
    }
    await el.play();
  },

  pause: async () => {
    getAudio().pause();
  },

  skip: async (index: number) => {
    if (index < 0 || index >= queue.length) {
      throw new Error(`Invalid track index: ${index}`);
    }
    const wasPlaying = currentState === State.Playing;
    loadTrack(index);
    if (wasPlaying) {
      await getAudio().play();
    }
  },

  skipToNext: async () => {
    if (currentIndex >= queue.length - 1) {
      throw new Error("No next track");
    }
    const wasPlaying =
      currentState === State.Playing || currentState === State.Buffering;
    loadTrack(currentIndex + 1);
    if (wasPlaying) {
      await getAudio().play();
    }
  },

  skipToPrevious: async () => {
    if (currentIndex <= 0) {
      throw new Error("No previous track");
    }
    const wasPlaying =
      currentState === State.Playing || currentState === State.Buffering;
    loadTrack(currentIndex - 1);
    if (wasPlaying) {
      await getAudio().play();
    }
  },

  seekTo: async (positionSeconds: number) => {
    const el = getAudio();
    if (isFinite(positionSeconds)) {
      el.currentTime = positionSeconds;
    }
  },

  setVolume: async (vol: number) => {
    volume = Math.max(0, Math.min(1, vol));
    getAudio().volume = volume;
  },

  getProgress: async () => {
    const el = getAudio();
    return {
      position: el.currentTime || 0,
      duration: isFinite(el.duration) ? el.duration : 0,
      buffered: 0,
    };
  },

  getPlaybackState: async () => {
    return { state: currentState };
  },
};

export default TrackPlayer;
