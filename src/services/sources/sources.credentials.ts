import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
} from "@/src/shared/lib/secure-store";

type StoredCredentials = {
  username: string;
  password: string;
};

const credentialsKey = (sourceId: string) => `source-credentials:${sourceId}`;

async function saveCredentials(
  sourceId: string,
  credentials: StoredCredentials,
): Promise<void> {
  await setSecureItem(credentialsKey(sourceId), JSON.stringify(credentials));
}

async function loadCredentials(
  sourceId: string,
): Promise<StoredCredentials | null> {
  const raw = await getSecureItem(credentialsKey(sourceId));
  if (!raw) return null;
  return JSON.parse(raw) as StoredCredentials;
}

async function deleteCredentials(sourceId: string): Promise<void> {
  await deleteSecureItem(credentialsKey(sourceId));
}

export { saveCredentials, loadCredentials, deleteCredentials };
export type { StoredCredentials };
