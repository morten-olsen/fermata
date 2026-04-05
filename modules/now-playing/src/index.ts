import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter as ExpoEventEmitter, type Subscription } from 'expo-modules-core';

type NowPlayingMetadata = {
  title: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
  durationMs?: number;
};

type NowPlayingState = {
  playing: boolean;
  positionMs?: number;
  playbackRate?: number;
};

type NowPlayingButtons = {
  skipNext?: boolean;
  skipPrevious?: boolean;
  seekForward?: boolean;
  seekBackward?: boolean;
};

type NowPlayingCommand =
  | 'play'
  | 'pause'
  | 'skipNext'
  | 'skipPrevious'
  | 'seekForward'
  | 'seekBackward'
  | 'seek';

type NowPlayingCommandEvent = {
  command: NowPlayingCommand;
  positionMs?: number;
};

const isNative = Platform.OS !== 'web';
const NativeModule = isNative ? requireNativeModule('NowPlaying') : null;
const emitter = NativeModule ? new ExpoEventEmitter(NativeModule) : null;

function updateMetadata(metadata: NowPlayingMetadata): void {
  NativeModule?.updateMetadata(metadata);
}

function updatePlaybackState(state: NowPlayingState): void {
  NativeModule?.updatePlaybackState(state);
}

function setButtons(buttons: NowPlayingButtons): void {
  NativeModule?.setButtons(buttons);
}

function show(): void {
  NativeModule?.show();
}

function hide(): void {
  NativeModule?.hide();
}

function addCommandListener(listener: (event: NowPlayingCommandEvent) => void): Subscription {
  if (emitter) return emitter.addListener('onCommand', listener);
  return { remove: () => {} };
}

export {
  updateMetadata,
  updatePlaybackState,
  setButtons,
  show,
  hide,
  addCommandListener,
};

export type {
  NowPlayingMetadata,
  NowPlayingState,
  NowPlayingButtons,
  NowPlayingCommand,
  NowPlayingCommandEvent,
};
