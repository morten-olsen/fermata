import type { SourceAdapter } from "./types";
import { JellyfinAdapter } from "./jellyfin";

type AdapterConstructor = new (id: string, name: string) => SourceAdapter;

const registry = new Map<string, AdapterConstructor>();

export function registerAdapter(type: string, ctor: AdapterConstructor): void {
  registry.set(type, ctor);
}

export function createAdapter(
  type: string,
  id: string,
  name: string
): SourceAdapter {
  const Ctor = registry.get(type);
  if (!Ctor) {
    throw new Error(`Unknown source adapter type: "${type}"`);
  }
  return new Ctor(id, name);
}

export function getRegisteredTypes(): string[] {
  return [...registry.keys()];
}

// ── Register built-in adapters ─────────────────────────
registerAdapter("jellyfin", JellyfinAdapter);
