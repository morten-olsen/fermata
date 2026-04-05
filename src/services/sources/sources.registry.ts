import type { SourceRow } from "../database/database.schemas";

import type { SourceAdapter } from "./sources.adapter";
import { createJellyfinAdapter } from "./jellyfin/jellyfin.adapter";
import { authenticate as jellyfinAuth } from "./jellyfin/jellyfin.api";
import { createAudiobookshelfAdapter } from "./audiobookshelf/audiobookshelf.adapter";
import { authenticate as absAuth } from "./audiobookshelf/audiobookshelf.api";

// ── Adapter factory ───────────────────────────────────

type AdapterFactory = (source: SourceRow) => SourceAdapter;

const adapterRegistry = new Map<string, AdapterFactory>([
  ['jellyfin', createJellyfinAdapter],
  ['audiobookshelf', createAudiobookshelfAdapter],
]);

const createAdapter = (source: SourceRow): SourceAdapter => {
  const factory = adapterRegistry.get(source.type);
  if (!factory) {
    throw new Error(`Unknown source adapter type: "${source.type}"`);
  }
  return factory(source);
};

// ── Authentication ────────────────────────────────────

type SourceCredentials = {
  baseUrl: string;
  username: string;
  password: string;
};

type SourceConfig = {
  baseUrl: string;
  userId: string;
  accessToken: string;
};

type AuthenticateFn = (credentials: SourceCredentials) => Promise<SourceConfig>;

const jellyfinAuthenticate: AuthenticateFn = async ({ baseUrl, username, password }) => {
  const result = await jellyfinAuth(baseUrl, username, password);
  return { baseUrl, userId: result.userId, accessToken: result.accessToken };
};

const absAuthenticate: AuthenticateFn = async ({ baseUrl, username, password }) => {
  const result = await absAuth(baseUrl, username, password);
  return { baseUrl, userId: result.userId, accessToken: result.token };
};

const authRegistry = new Map<string, AuthenticateFn>([
  ['jellyfin', jellyfinAuthenticate],
  ['audiobookshelf', absAuthenticate],
]);

const authenticateSource = async (type: string, credentials: SourceCredentials): Promise<SourceConfig> => {
  const authFn = authRegistry.get(type);
  if (!authFn) {
    throw new Error(`Unknown source type for authentication: "${type}"`);
  }
  return authFn(credentials);
};

export { createAdapter, authenticateSource };
export type { SourceCredentials, SourceConfig };
