import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { generateRandomId } from "@/src/utils/utils.id";
import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { log, warn } from "@/src/shared/lib/log";

import { DatabaseService } from "../database/database.service";
import { PlaybackService } from "../playback/playback.service";
import type { PlaybackPlayer } from "../playback/playback.player";
import { LocalPlaybackPlayer } from "../playback/players/local.player";
import { HAPlaybackPlayer } from "../playback/players/ha.player";
import type { Services } from "../services/services";

import {
  connectToHA,
  subscribeToAllEntities,
} from "./home-assistant/home-assistant.api";
import type { Connection } from "./home-assistant/home-assistant.api";
import type { HAMediaPlayerState } from "./home-assistant/home-assistant.types";
import type {
  ActiveTarget,
  OutputConfig,
  OutputConnectionState,
  OutputEntity,
  OutputsServiceEvents,
  Speaker,
} from "./outputs.types";

const BACKGROUND_GRACE_PERIOD = 30_000;
const RECONNECT_DELAYS = [0, 1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = 5;

type OutputEntry = {
  config: OutputConfig;
  connection: Connection | null;
  entityUnsub: (() => void) | null;
  entities: OutputEntity[];
  entityStates: Partial<Record<string, HAMediaPlayerState>>;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
};

class OutputsService extends EventEmitter<OutputsServiceEvents> {
  #services: Services;
  #outputs = new Map<string, OutputEntry>();
  #localPlayer: LocalPlaybackPlayer;
  #activeTarget: ActiveTarget | null = null;
  #connectionState: OutputConnectionState = 'connected';
  #isInitialized = false;
  #backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  #appStateRegistered = false;

  constructor(services: Services) {
    super();
    this.#services = services;
    this.#localPlayer = new LocalPlaybackPlayer();
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  // ── Initialization ──────────────────────────────────

  public initialize = async () => {
    if (this.#isInitialized) return;

    await this.#localPlayer.setup();

    // Set local player as default
    const playbackService = this.#services.get(PlaybackService);
    playbackService.setPlayer(this.#localPlayer);

    await this.#loadOutputs();
    this.#isInitialized = true;
    this.#registerAppStateListener();
    log("OutputsService initialized");
  };

  // ── Getters ─────────────────────────────────────────

  public getOutputs = (): OutputConfig[] =>
    Array.from(this.#outputs.values()).map((e) => e.config);

  public getSpeakers = (): Speaker[] => {
    const speakers: Speaker[] = [];
    for (const [, entry] of this.#outputs) {
      for (const entity of entry.entities) {
        speakers.push({
          ...entity,
          outputId: entry.config.id,
          outputName: entry.config.name,
        });
      }
    }
    return speakers;
  };

  public getActiveTarget = (): ActiveTarget | null => this.#activeTarget;

  public getConnectionState = (): OutputConnectionState => this.#connectionState;

  public getLocalPlayer = (): LocalPlaybackPlayer => this.#localPlayer;

  // ── Output CRUD ─────────────────────────────────────

  public addOutput = async (type: string, name: string, config: Record<string, string>) => {
    const id = generateRandomId();
    const db = await this.#db();
    const now = new Date().toISOString();

    await db.sql`
      INSERT INTO outputConfigs (id, type, name, config, createdAt)
      VALUES (${id}, ${type}, ${name}, ${JSON.stringify(config)}, ${now})
    `;
    await db.save();

    const outputConfig: OutputConfig = { id, type, name, config, createdAt: now };
    const entry = this.#createEntry(outputConfig);
    this.#outputs.set(id, entry);

    // Connect in background
    if (type === 'home-assistant') {
      void this.#connectHA(entry);
    }

    this.emit('configChanged');
    this.emit('speakersChanged');
  };

  public removeOutput = async (id: string) => {
    const entry = this.#outputs.get(id);
    if (!entry) return;

    if (this.#activeTarget?.outputId === id) {
      await this.setLocalActive();
    }

    this.#disconnectEntry(entry);
    this.#outputs.delete(id);

    const db = await this.#db();
    await db.sql`DELETE FROM outputConfigs WHERE id = ${id}`;
    await db.save();

    this.emit('configChanged');
    this.emit('speakersChanged');
  };

  // ── Speaker selection ───────────────────────────────

  public setActiveSpeaker = async (outputId: string, entityId: string) => {
    const entry = this.#outputs.get(outputId);
    if (!entry) { warn("setActiveSpeaker: output not found:", outputId); return; }

    // Ensure connected
    if (!entry.connection) {
      this.#connectionState = 'connecting';
      this.emit('connectionStateChanged');
      try {
        await this.#connectHA(entry);
      } catch (e) {
        warn("setActiveSpeaker: connect failed:", e);
        this.#connectionState = 'error';
        this.emit('connectionStateChanged');
        return;
      }
    }

    if (!entry.connection) {
      this.#connectionState = 'error';
      this.emit('connectionStateChanged');
      return;
    }

    // Stop current player
    const playbackService = this.#services.get(PlaybackService);
    try { await playbackService.getState().status !== 'idle' && await this.#getCurrentPlayer()?.stop(); } catch { /* best effort */ }

    // Create HA player for this entity
    const haPlayer = new HAPlaybackPlayer(entry.connection, entityId);
    haPlayer.start((cb) => {
      // Wire entity state updates to the player
      const key = `player-${entityId}`;
      const handler = () => cb(entry.entityStates);
      // Call immediately with current state
      handler();
      // Return a cleanup function — we'll track this via the entry
      return () => { /* cleanup handled by haPlayer.dispose() */ };
    });

    this.#activeTarget = { outputId, entityId };
    this.#connectionState = 'connected';

    playbackService.setPlayer(haPlayer);

    this.emit('activeTargetChanged');
    this.emit('connectionStateChanged');
    log("Active speaker:", entityId, "on", entry.config.name);
  };

  public setLocalActive = async () => {
    const playbackService = this.#services.get(PlaybackService);
    try { await this.#getCurrentPlayer()?.stop(); } catch { /* best effort */ }

    this.#activeTarget = null;
    this.#connectionState = 'connected';

    playbackService.setPlayer(this.#localPlayer);

    this.emit('activeTargetChanged');
    this.emit('connectionStateChanged');
    log("Switched to local output");
  };

  public authenticateHA = async (url: string, accessToken: string): Promise<Connection> =>
    connectToHA(url, accessToken);

  // ── Private ─────────────────────────────────────────

  #getCurrentPlayer = (): PlaybackPlayer | null => {
    if (!this.#activeTarget) return this.#localPlayer;
    // The current player is whatever the PlaybackService has
    return null; // PlaybackService manages its own player reference
  };

  #loadOutputs = async () => {
    const db = await this.#db();
    type RawRow = { id: string; type: string; name: string; config: string; createdAt: string };
    const rows = await db.sql<RawRow>`SELECT * FROM outputConfigs`;

    for (const row of rows) {
      const config: OutputConfig = {
        ...row,
        config: JSON.parse(row.config) as Record<string, string>,
      };
      const entry = this.#createEntry(config);
      this.#outputs.set(row.id, entry);

      if (config.type === 'home-assistant') {
        void this.#connectHA(entry).catch((e: unknown) => {
          warn("Failed to connect output:", config.name, e);
        });
      }
    }
  };

  #createEntry = (config: OutputConfig): OutputEntry => ({
    config,
    connection: null,
    entityUnsub: null,
    entities: [],
    entityStates: {},
    reconnectAttempts: 0,
    reconnectTimer: null,
  });

  #connectHA = async (entry: OutputEntry) => {
    const { config } = entry;
    const url = config.config.url ?? '';
    const accessToken = config.config.accessToken ?? '';

    if (!url || !accessToken) {
      warn("OutputsService: missing HA config for", config.name);
      return;
    }

    const connection = await connectToHA(url, accessToken);
    entry.connection = connection;
    entry.reconnectAttempts = 0;

    // Listen for disconnection
    connection.addEventListener("disconnected", () => {
      if (this.#activeTarget?.outputId === config.id) {
        this.#connectionState = 'error';
        this.emit('connectionStateChanged');
      }
      this.#scheduleReconnect(entry);
    });

    // Subscribe to entities
    entry.entityUnsub = subscribeToAllEntities(connection, (entities, raw) => {
      const changed =
        entities.length !== entry.entities.length ||
        entities.some((e, i) => e.entityId !== entry.entities[i]?.entityId || e.state !== entry.entities[i]?.state);

      entry.entityStates = raw;
      if (changed) {
        entry.entities = entities;
        this.emit('speakersChanged');
      }
    });

    log("OutputsService: connected to", config.name);
  };

  #disconnectEntry = (entry: OutputEntry) => {
    if (entry.reconnectTimer) {
      clearTimeout(entry.reconnectTimer);
      entry.reconnectTimer = null;
    }
    entry.entityUnsub?.();
    entry.entityUnsub = null;
    if (entry.connection) {
      entry.connection.close();
      entry.connection = null;
    }
    entry.entities = [];
    entry.entityStates = {};
  };

  #scheduleReconnect = (entry: OutputEntry) => {
    if (entry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      warn("OutputsService: max reconnect attempts for", entry.config.name);
      return;
    }

    const delay = RECONNECT_DELAYS[Math.min(entry.reconnectAttempts, RECONNECT_DELAYS.length - 1)];
    entry.reconnectAttempts++;

    log(`OutputsService: reconnecting ${entry.config.name} in ${delay}ms (attempt ${entry.reconnectAttempts})`);
    entry.reconnectTimer = setTimeout(() => {
      entry.reconnectTimer = null;
      void this.#connectHA(entry).catch(() => {
        this.#scheduleReconnect(entry);
      });
    }, delay);
  };

  // ── Battery-conscious lifecycle ─────────────────────

  #registerAppStateListener = () => {
    if (this.#appStateRegistered) return;
    this.#appStateRegistered = true;
    AppState.addEventListener("change", this.#handleAppState);
  };

  #handleAppState = (nextState: AppStateStatus) => {
    if (this.#activeTarget === null) return;

    if (nextState === "active") {
      if (this.#backgroundTimer) {
        clearTimeout(this.#backgroundTimer);
        this.#backgroundTimer = null;
      }
      // Reconnect any disconnected outputs
      for (const [, entry] of this.#outputs) {
        if (entry.config.type === 'home-assistant' && !entry.connection) {
          log("App foregrounded — reconnecting:", entry.config.name);
          void this.#connectHA(entry);
        }
      }
      return;
    }

    if (nextState === "background") {
      const playbackService = this.#services.get(PlaybackService);
      const state = playbackService.getState();

      if (state.status === 'playing') {
        log("App backgrounded while playing — keeping connections");
        return;
      }

      const delay = state.positionMs > 0 ? BACKGROUND_GRACE_PERIOD : 0;
      log(`App backgrounded while idle — disconnecting in ${delay}ms`);

      this.#backgroundTimer = setTimeout(() => {
        this.#backgroundTimer = null;
        const current = this.#services.get(PlaybackService).getState();
        if (current.status !== 'playing') {
          log("Background grace period expired — disconnecting outputs");
          for (const [, entry] of this.#outputs) {
            if (entry.config.type === 'home-assistant') {
              this.#disconnectEntry(entry);
            }
          }
        }
      }, delay);
    }
  };
}

export { OutputsService };
