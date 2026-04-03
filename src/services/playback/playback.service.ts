import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { Services } from "../services/services";

import type { PlaybackQueueItem } from "./playback.schemas";
import type { PlaybackPlayer } from "./playback.player";

type PlaybackServiceEvents = {
  start: (item: PlaybackQueueItem) => void;
  progress: (item: PlaybackQueueItem, position: number) => void;
  queueChanged: (items: PlaybackQueueItem[]) => void;
}

class PlaybackService extends EventEmitter<PlaybackServiceEvents> {
  #queue: PlaybackQueueItem[];
  #player: PlaybackPlayer;
  #current?: {
    index: number;
    position: number;
  }

  #services: Services;

  constructor(services: Services) {
    super();
    this.#queue = [];
  }

  public addToQueue = (item: PlaybackQueueItem, position?: nubmer) => {
    if (position !== undefined) {
    } else {
      this.#queue.push(item);
    }
  }

  public start = async () => {

  }
}

export { PlaybackService };
