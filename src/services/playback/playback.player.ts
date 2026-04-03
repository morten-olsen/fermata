import { EventEmitter } from "@/src/utils/utils.event-emitter";

type PlaybackPlayerEvents = {
  loading: () => void;
  progress: () => void;
}

abstract class PlaybackPlayer extends EventEmitter<PlaybackPlayerEvents> {
}

export { PlaybackPlayer };
