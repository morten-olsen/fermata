import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { create } from "zustand";

import { log, warn } from "@/src/shared/lib/log";
import { generateId } from "@/src/shared/lib/ids";

import type {
  OutputAdapter,
  OutputConnectionState,
  OutputEntity,
  OutputPersistedConfig,
  Unsubscribe,
} from "./outputs.types";
import { createOutputAdapter } from "./outputs.registry";
import { LocalOutputAdapter } from "./local/local";
import {
  getAllOutputConfigs,
  upsertOutputConfig,
  deleteOutputConfig,
} from "./outputs.queries";

interface OutputEntry {
  id: string;
  type: string;
  name: string;
  config: OutputPersistedConfig;
  adapter: OutputAdapter;
  entityUnsub: Unsubscribe | null;
}

interface ActiveTarget {
  outputId: string;
  entityId: string;
}

interface OutputsStoreState {
  outputs: OutputEntry[];
  localAdapter: OutputAdapter;
  activeTarget: ActiveTarget | null;
  connectionState: OutputConnectionState;
  isInitialized: boolean;
  availableSpeakers: Array<OutputEntity & { outputId: string; outputName: string }>;

  initialize: () => Promise<void>;
  loadOutputs: () => Promise<void>;
  addOutput: (
    type: string,
    name: string,
    config: OutputPersistedConfig,
  ) => Promise<void>;
  removeOutput: (id: string) => Promise<void>;
  setActiveSpeaker: (outputId: string, entityId: string) => Promise<void>;
  setLocalActive: () => Promise<void>;
  getActiveAdapter: () => OutputAdapter;
}

const LOCAL_ADAPTER = new LocalOutputAdapter("local", "This Device");

export const useOutputsStore = create<OutputsStoreState>((set, get) => ({
  outputs: [],
  localAdapter: LOCAL_ADAPTER,
  activeTarget: null,
  connectionState: "disconnected",
  isInitialized: false,
  availableSpeakers: [],

  initialize: async () => {
    if (get().isInitialized) return;

    await LOCAL_ADAPTER.connect();
    set({ connectionState: LOCAL_ADAPTER.getConnectionState() });

    await get().loadOutputs();
    set({ isInitialized: true });

    // Register lifecycle listener only after initialization
    registerAppStateListener();

    log("OutputsStore initialized");
  },

  loadOutputs: async () => {
    try {
      const rows = await getAllOutputConfigs();
      const entries: OutputEntry[] = [];

      for (const row of rows) {
        try {
          const config = JSON.parse(row.config) as OutputPersistedConfig;
          const adapter = createOutputAdapter(row.type, row.id, row.name);
          adapter.configure?.(config);

          const entityUnsub = wireEntityDiscovery(adapter, get, set);

          // Connect to discover entities (non-blocking)
          if (adapter.capabilities.isNetworkOutput) {
            void adapter.connect().catch((e: unknown) => {
              warn("Failed to connect output:", row.name, e);
            });
          }

          entries.push({ id: row.id, type: row.type, name: row.name, config, adapter, entityUnsub });
        } catch {
          warn("Failed to restore output:", row.id, row.type);
        }
      }

      set({ outputs: entries });
      refreshSpeakers(get, set);
    } catch (e) {
      warn("Failed to load outputs:", e);
    }
  },

  addOutput: async (type, name, config) => {
    const id = generateId();
    const adapter = createOutputAdapter(type, id, name);
    adapter.configure?.(config);

    const entityUnsub = wireEntityDiscovery(adapter, get, set);

    if (adapter.capabilities.isNetworkOutput) {
      void adapter.connect().catch((e: unknown) => {
        warn("Failed to connect new output:", name, e);
      });
    }

    await upsertOutputConfig({
      id,
      type,
      name,
      config: JSON.stringify(config),
      createdAt: new Date(),
    });

    set((state) => ({
      outputs: [...state.outputs, { id, type, name, config, adapter, entityUnsub }],
    }));
    refreshSpeakers(get, set);
  },

  removeOutput: async (id) => {
    const entry = get().outputs.find((o) => o.id === id);
    if (entry) {
      entry.entityUnsub?.();
      await entry.adapter.disconnect();
    }

    if (get().activeTarget?.outputId === id) {
      set({ activeTarget: null, connectionState: "connected" });
    }

    await deleteOutputConfig(id);
    set((state) => ({
      outputs: state.outputs.filter((o) => o.id !== id),
    }));
    refreshSpeakers(get, set);
  },

  setActiveSpeaker: async (outputId, entityId) => {
    const currentAdapter = get().getActiveAdapter();
    try {
      await currentAdapter.stop();
    } catch {
      // Best effort
    }

    const entry = get().outputs.find((o) => o.id === outputId);
    if (!entry) {
      warn("setActiveSpeaker: output not found:", outputId);
      return;
    }

    if (entry.adapter.capabilities.isNetworkOutput) {
      if (entry.adapter.getConnectionState() !== "connected") {
        set({ connectionState: "connecting" });
        try {
          await entry.adapter.connect();
        } catch (e) {
          warn("Failed to connect to output:", outputId, e);
          set({ connectionState: "error" });
          return;
        }
      }
      entry.adapter.setActiveEntity?.(entityId);
    }

    set({
      activeTarget: { outputId, entityId },
      connectionState: entry.adapter.getConnectionState(),
    });

    // Subscribe to connection state changes to keep store in sync
    entry.adapter.onConnectionStateChange((state) => {
      const current = get().activeTarget;
      if (current?.outputId === entry.id) {
        set({ connectionState: state });
      }
    });

    await transferPlaybackCallback?.();
    log("Active speaker:", entityId, "on", entry.name);
  },

  setLocalActive: async () => {
    const currentAdapter = get().getActiveAdapter();
    try {
      await currentAdapter.stop();
    } catch {
      // Best effort
    }

    // Clear active entity on all adapters that support it
    for (const entry of get().outputs) {
      entry.adapter.setActiveEntity?.(null);
    }

    set({ activeTarget: null, connectionState: "connected" });
    await transferPlaybackCallback?.();
    log("Switched to local output");
  },

  getActiveAdapter: () => {
    const { activeTarget, outputs } = get();
    if (activeTarget === null) return LOCAL_ADAPTER;
    const entry = outputs.find((o) => o.id === activeTarget.outputId);
    return entry?.adapter ?? LOCAL_ADAPTER;
  },
}));

// ── Transfer playback callback ─────────────────────────

let transferPlaybackCallback: (() => Promise<void>) | null = null;

export function setTransferPlaybackCallback(cb: () => Promise<void>): void {
  transferPlaybackCallback = cb;
}

// ── Helpers ─────────────────────────────────────────────

/** Wire entity discovery for adapters that support it. Returns unsub or null. */
function wireEntityDiscovery(
  adapter: OutputAdapter,
  get: () => OutputsStoreState,
  set: (partial: Partial<OutputsStoreState>) => void,
): Unsubscribe | null {
  if (!adapter.onEntitiesChange) return null;
  return adapter.onEntitiesChange(() => {
    refreshSpeakers(get, set);
  });
}

/** Rebuild the flat list of available speakers from all connected outputs */
function refreshSpeakers(
  get: () => OutputsStoreState,
  set: (partial: Partial<OutputsStoreState>) => void,
): void {
  const speakers: OutputsStoreState["availableSpeakers"] = [];
  for (const entry of get().outputs) {
    const entities = entry.adapter.getEntities?.() ?? [];
    for (const entity of entities) {
      speakers.push({
        ...entity,
        outputId: entry.id,
        outputName: entry.name,
      });
    }
  }

  // No-op guard: skip if speaker list hasn't changed
  const prev = get().availableSpeakers;
  if (
    speakers.length === prev.length &&
    speakers.every(
      (s, i) => s.entityId === prev[i]?.entityId && s.state === prev[i]?.state,
    )
  ) {
    return;
  }

  set({ availableSpeakers: speakers });
}

// ── Battery-conscious lifecycle ─────────────────────────

const BACKGROUND_GRACE_PERIOD = 30_000;
let backgroundDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
let appStateListenerRegistered = false;

function registerAppStateListener(): void {
  if (appStateListenerRegistered) return;
  appStateListenerRegistered = true;
  AppState.addEventListener("change", handleAppStateChange);
}

function handleAppStateChange(nextState: AppStateStatus): void {
  const { activeTarget, getActiveAdapter, outputs } =
    useOutputsStore.getState();

  if (activeTarget === null) return;

  if (nextState === "active") {
    if (backgroundDisconnectTimer) {
      clearTimeout(backgroundDisconnectTimer);
      backgroundDisconnectTimer = null;
    }
    for (const entry of outputs) {
      if (
        entry.adapter.capabilities.isNetworkOutput &&
        entry.adapter.getConnectionState() === "disconnected"
      ) {
        log("App foregrounded — reconnecting:", entry.name);
        void entry.adapter.connect();
      }
    }
    return;
  }

  if (nextState === "background") {
    const adapter = getActiveAdapter();
    const state = adapter.getPlaybackState();

    if (state.isPlaying) {
      log("App backgrounded while playing — keeping connections");
      return;
    }

    const delay = state.positionMs > 0 ? BACKGROUND_GRACE_PERIOD : 0;
    log(`App backgrounded while idle — disconnecting in ${delay}ms`);

    backgroundDisconnectTimer = setTimeout(() => {
      backgroundDisconnectTimer = null;
      const current = useOutputsStore.getState();
      const active = current.getActiveAdapter();
      if (!active.getPlaybackState().isPlaying) {
        log("Background grace period expired — disconnecting outputs");
        for (const entry of current.outputs) {
          if (entry.adapter.capabilities.isNetworkOutput) {
            void entry.adapter.disconnect();
          }
        }
      }
    }, delay);
  }
}
