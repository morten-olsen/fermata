import type { OutputAdapter, OutputAdapterConstructor } from "./outputs.types";
import { LocalOutputAdapter } from "./local/local";
import { HAOutputAdapter } from "./home-assistant/home-assistant";

const registry = new Map<string, OutputAdapterConstructor>();

export function registerOutputAdapter(
  type: string,
  ctor: OutputAdapterConstructor,
): void {
  registry.set(type, ctor);
}

export function createOutputAdapter(
  type: string,
  id: string,
  name: string,
): OutputAdapter {
  const Ctor = registry.get(type);
  if (!Ctor) {
    throw new Error(`Unknown output adapter type: "${type}"`);
  }
  return new Ctor(id, name);
}

export function getRegisteredOutputTypes(): string[] {
  return [...registry.keys()];
}

// ── Register built-in adapters ─────────────────────────
registerOutputAdapter("local", LocalOutputAdapter);
registerOutputAdapter("home-assistant", HAOutputAdapter);
