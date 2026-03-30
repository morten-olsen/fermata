import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSourcesStore } from "@/src/stores/sources";
import { useSyncStore } from "@/src/stores/sync";
import { useLibraryStore } from "@/src/stores/library";
import { colors } from "@/src/theme";

export default function AddSourceScreen() {
  const addSource = useSourcesStore((s) => s.addSource);
  const syncOne = useSyncStore((s) => s.syncOne);

  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const urlTrimmed = serverUrl.trim();
  const urlValid = urlTrimmed.length === 0 || isValidUrl(urlTrimmed);
  const canSubmit =
    name.trim() && urlTrimmed && urlValid && username.trim() && password.trim();

  const handleConnect = async () => {
    if (!canSubmit) return;
    setIsConnecting(true);
    setError(null);

    try {
      await addSource("jellyfin", name.trim(), serverUrl.trim(), {
        username: username.trim(),
        password: password.trim(),
      });

      // Navigate back immediately — sync runs in the background
      router.back();

      // Kick off sync without blocking the UI
      const adapter = useSourcesStore
        .getState()
        .sources.at(-1)?.adapter;
      if (adapter) {
        syncOne(adapter).then(() => {
          useLibraryStore.getState().refreshAll();
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-4">
          {/* Header */}
          <View className="flex-row items-center justify-between py-3 mb-4">
            <Pressable onPress={() => router.back()}>
              <Text className="text-fermata-accent text-base">Cancel</Text>
            </Pressable>
            <Text className="text-fermata-text text-lg font-semibold">
              Add Source
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Source type indicator */}
          <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-3 mb-6">
            <Ionicons name="server" size={20} color={colors.accent} />
            <Text className="text-fermata-text text-base ml-3">Jellyfin</Text>
          </View>

          {/* Form */}
          <View className="gap-3">
            <View>
              <Text className="text-fermata-text-secondary text-sm mb-1 ml-1">
                Display Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="My Jellyfin Server"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-fermata-text-secondary text-sm mb-1 ml-1">
                Server URL
              </Text>
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://jellyfin.example.com"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {!urlValid && (
                <Text className="text-red-400 text-xs mt-1 ml-1">
                  Enter a valid URL starting with http:// or https://
                </Text>
              )}
            </View>

            <View>
              <Text className="text-fermata-text-secondary text-sm mb-1 ml-1">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-fermata-text-secondary text-sm mb-1 ml-1">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                secureTextEntry
              />
            </View>
          </View>

          {/* Error */}
          {error && (
            <View className="flex-row items-center bg-red-900/30 rounded-xl px-4 py-3 mt-4">
              <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
              <Text className="text-red-400 text-sm ml-2 flex-1">{error}</Text>
            </View>
          )}

          {/* Connect button */}
          <Pressable
            onPress={handleConnect}
            disabled={!canSubmit || isConnecting}
            className={`flex-row items-center justify-center py-4 rounded-xl mt-6 ${
              canSubmit && !isConnecting
                ? "bg-fermata-accent"
                : "bg-fermata-elevated"
            }`}
          >
            {isConnecting ? (
              <>
                <ActivityIndicator size="small" color={colors.bg} />
                <Text className="text-fermata-bg font-semibold text-base ml-2">
                  Connecting...
                </Text>
              </>
            ) : (
              <Text
                className={`font-semibold text-base ${
                  canSubmit ? "text-fermata-bg" : "text-fermata-muted"
                }`}
              >
                Connect
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
