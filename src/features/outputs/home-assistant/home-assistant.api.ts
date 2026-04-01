import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService,
} from "home-assistant-js-websocket";
import type { Connection, HassEntities } from "home-assistant-js-websocket";

import { log } from "@/src/shared/lib/log";

import type { HAEntity, HAMediaPlayerState } from "./home-assistant.types";

export type { Connection };

/** Create an authenticated WebSocket connection to a Home Assistant instance */
export async function connectToHA(
  url: string,
  accessToken: string,
): Promise<Connection> {
  const wsUrl = url.replace(/\/$/, "");
  const auth = createLongLivedTokenAuth(wsUrl, accessToken);
  const connection = await createConnection({ auth });
  log("HA WebSocket connected to:", wsUrl);
  return connection;
}

/**
 * Subscribe to all entity state changes.
 * Calls back with the full set of media_player entities on every change.
 */
export function subscribeToAllEntities(
  connection: Connection,
  onEntities: (entities: HAEntity[], raw: Record<string, HAMediaPlayerState>) => void,
): () => void {
  return subscribeEntities(connection, (entities: HassEntities) => {
    const raw: Record<string, HAMediaPlayerState> = {};
    const players: HAEntity[] = [];
    for (const [id, entity] of Object.entries(entities)) {
      if (!id.startsWith("media_player.")) continue;
      const ha = entity as HAMediaPlayerState;
      raw[id] = ha;
      players.push({
        entityId: id,
        name: ha.attributes.friendly_name ?? id,
        state: ha.state,
      });
    }
    onEntities(players, raw);
  });
}

/** Play a media URL on a media_player entity */
export async function playMedia(
  connection: Connection,
  entityId: string,
  contentId: string,
  title?: string,
  artworkUrl?: string,
): Promise<void> {
  await callService(connection, "media_player", "play_media", {
    entity_id: entityId,
    media_content_id: contentId,
    media_content_type: "music",
    extra: {
      ...(title ? { title } : {}),
      ...(artworkUrl ? { thumb: artworkUrl } : {}),
    },
  });
}

/** Pause a media_player entity */
export async function pauseMedia(
  connection: Connection,
  entityId: string,
): Promise<void> {
  await callService(connection, "media_player", "media_pause", {
    entity_id: entityId,
  });
}

/** Resume a media_player entity */
export async function resumeMedia(
  connection: Connection,
  entityId: string,
): Promise<void> {
  await callService(connection, "media_player", "media_play", {
    entity_id: entityId,
  });
}

/** Stop a media_player entity */
export async function stopMedia(
  connection: Connection,
  entityId: string,
): Promise<void> {
  await callService(connection, "media_player", "media_stop", {
    entity_id: entityId,
  });
}

/** Seek to a position (seconds) on a media_player entity */
export async function seekMedia(
  connection: Connection,
  entityId: string,
  positionSeconds: number,
): Promise<void> {
  await callService(connection, "media_player", "media_seek", {
    entity_id: entityId,
    seek_position: positionSeconds,
  });
}

/** Set volume (0–1) on a media_player entity */
export async function setVolumeLevel(
  connection: Connection,
  entityId: string,
  volume: number,
): Promise<void> {
  await callService(connection, "media_player", "volume_set", {
    entity_id: entityId,
    volume_level: volume,
  });
}

/**
 * Interpolate the current media position from HA's snapshot-based reporting.
 * HA only updates media_position on state changes (play/pause/seek), but
 * provides media_position_updated_at so clients can calculate current position.
 */
export function interpolatePosition(state: HAMediaPlayerState): number {
  const pos = state.attributes.media_position ?? 0;
  const updatedAt = state.attributes.media_position_updated_at;

  if (state.state !== "playing" || !updatedAt) {
    return pos;
  }

  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 1000;
  return pos + Math.max(0, elapsed);
}
