/** Config stored in the output_configs table for an HA instance (not per-speaker) */
export interface HAOutputConfig {
  url: string;
  accessToken: string;
}

/** A media_player entity discovered from a connected HA instance */
export interface HAEntity {
  entityId: string;
  name: string;
  state: string; // "playing" | "paused" | "idle" | "off" | "unavailable"
}

/** Relevant subset of a Home Assistant media_player entity state */
export interface HAMediaPlayerState {
  state: string; // "playing" | "paused" | "idle" | "off" | "unavailable"
  attributes: {
    friendly_name?: string;
    media_position?: number; // seconds
    media_position_updated_at?: string; // ISO timestamp
    media_duration?: number; // seconds
    volume_level?: number; // 0–1
    media_title?: string;
    media_artist?: string;
    media_album_name?: string;
    media_content_id?: string;
    supported_features?: number;
  };
  last_updated: string;
}
