import { Platform } from "react-native";

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

let mod: SecureStoreModule | null = null;

async function getModule(): Promise<SecureStoreModule | null> {
  if (Platform.OS === "web") return null;
  if (!mod) {
    mod = await import("expo-secure-store") as SecureStoreModule;
  }
  return mod;
}

async function getSecureItem(key: string): Promise<string | null> {
  const store = await getModule();
  if (!store) return null;
  return store.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  const store = await getModule();
  if (!store) return;
  await store.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  const store = await getModule();
  if (!store) return;
  await store.deleteItemAsync(key);
}

export { getSecureItem, setSecureItem, deleteSecureItem };
