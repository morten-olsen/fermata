import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";

import {
  useSources,
  useRemoveSource,
  useReAuthenticate,
} from "@/src/hooks/sources/sources";
import { useSyncAll, useSyncProgress } from "@/src/hooks/sync/sync";
import { useLibraryStats } from "@/src/hooks/library/library";
import {
  useDownloadStats,
  useRetryFailedDownloads,
  useRemoveAllDownloads,
} from "@/src/hooks/downloads/downloads";
import {
  useOutputConfigs,
  useActiveTarget,
  useOutputSpeakers,
  useRemoveOutput,
} from "@/src/hooks/outputs/outputs";
import { useService } from "@/src/hooks/service/service";
import { SourcesService } from "@/src/services/sources/sources";
import type { SourceRow } from "@/src/services/database/database.schemas";

import { BottomSheet } from "@/src/components/layout/layout";
import { SettingsRow, StatRow } from "@/src/components/data-display/data-display";

import { colors } from "@/src/shared/theme/theme";
import { formatBytes } from "@/src/shared/lib/format";

export default function SettingsScreen() {
  const { sources } = useSources();
  const { mutate: removeSource } = useRemoveSource();
  const { mutate: syncAll } = useSyncAll();
  const { isSyncing, progress } = useSyncProgress();
  const stats = useLibraryStats();
  const { data: dlStats } = useDownloadStats();
  const { mutate: retryFailed } = useRetryFailedDownloads();
  const { mutate: removeAllDownloads } = useRemoveAllDownloads();
  const sourcesService = useService(SourcesService);
  const [reAuthSource, setReAuthSource] = useState<SourceRow | null>(null);

  const handleSync = () => {
    void syncAll(sources);
  };

  const syncDetail = isSyncing
    ? progress
      ? `${progress.phase}...`
      : "Syncing..."
    : undefined;

  return (
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
      <ScrollView className="flex-1 px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-6">
          Settings
        </Text>

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1">
          Sources
        </Text>

        {sources.map((source) => {
          const isExpired = sourcesService.isAuthExpired(source.id);
          return (
            <View key={source.id} className="mb-2">
              <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4">
                <Ionicons
                  name={isExpired ? "warning" : "server-outline"}
                  size={22}
                  color={isExpired ? "#F59E0B" : colors.textSecondary}
                />
                <View className="flex-1 ml-3">
                  <Text className="text-fermata-text text-base">{source.name}</Text>
                  <Text className="text-fermata-text-secondary text-xs">
                    {isExpired ? "Authentication expired" : `${source.type} · ${source.config.baseUrl}`}
                  </Text>
                </View>
                {isExpired && (
                  <Pressable
                    onPress={() => setReAuthSource(source)}
                    className="p-2 mr-1"
                  >
                    <Ionicons name="key-outline" size={18} color={colors.accent} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => void removeSource(source.id)}
                  className="p-2"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable
          onPress={() => router.push("/(tabs)/settings/add-source")}
          className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4 mb-2"
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
          <Text className="text-fermata-accent text-base font-medium ml-3">
            Add Source
          </Text>
        </Pressable>

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Library
        </Text>

        <Pressable
          onPress={handleSync}
          disabled={isSyncing}
          className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4 mb-2"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="sync-outline" size={22} color={colors.textSecondary} />
          )}
          <Text className="flex-1 text-fermata-text text-base ml-3">
            Sync Library
          </Text>
          {syncDetail && (
            <Text className="text-fermata-text-secondary text-sm">
              {syncDetail}
            </Text>
          )}
        </Pressable>

        {(stats.artists > 0 || stats.albums > 0 || stats.tracks > 0) && (
          <StatRow
            items={[
              { label: "Artists", value: stats.artists },
              { label: "Albums", value: stats.albums },
              { label: "Tracks", value: stats.tracks },
            ]}
          />
        )}

        {(stats.shows > 0 || stats.episodes > 0) && (
          <StatRow
            items={[
              { label: "Shows", value: stats.shows },
              { label: "Episodes", value: stats.episodes },
            ]}
          />
        )}

        {stats.audiobooks > 0 && (
          <StatRow
            items={[
              { label: "Audiobooks", value: stats.audiobooks },
            ]}
          />
        )}

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Downloads
        </Text>

        <StatRow
          items={[
            { label: "Downloaded", value: dlStats?.completedItems ?? 0 },
            { label: "Pending", value: dlStats?.pendingItems ?? 0 },
            { label: "Failed", value: dlStats?.errorItems ?? 0 },
            { label: "Storage", value: 0, formatted: formatBytes(dlStats?.totalBytes ?? 0) },
          ]}
        />

        {(dlStats?.errorItems ?? 0) > 0 && (
          <SettingsRow
            icon="refresh-outline"
            label="Retry Failed Downloads"
            onPress={() => void retryFailed(undefined)}
          />
        )}

        {(dlStats?.completedItems ?? 0) > 0 && (
          <SettingsRow
            icon="trash-outline"
            label="Remove All Downloads"
            onPress={() => void removeAllDownloads(undefined)}
            destructive
          />
        )}

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Output
        </Text>

        <OutputSection />

        {!Updates.isEmbeddedLaunch && (
          <>
            <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
              Updates
            </Text>
            <UpdateSection />
          </>
        )}

        <Text className="text-center text-fermata-muted text-xs mt-12 mb-8">
          Fermata 𝄐 v0.1.0
        </Text>
      </ScrollView>

      {reAuthSource && (
        <ReAuthSheet
          source={reAuthSource}
          onDismiss={() => setReAuthSource(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Re-authenticate sheet ─────────────────────────────

function ReAuthSheet({
  source,
  onDismiss,
}: {
  source: SourceRow;
  onDismiss: () => void;
}) {
  const { mutate: reAuthenticate } = useReAuthenticate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim() && password.trim();

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);

    try {
      await reAuthenticate({
        sourceId: source.id,
        credentials: {
          baseUrl: source.config.baseUrl,
          username: username.trim(),
          password: password.trim(),
        },
      });
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
      setIsLoading(false);
    }
  }, [canSubmit, reAuthenticate, source, username, password, onDismiss]);

  return (
    <BottomSheet visible onDismiss={onDismiss}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          Re-authenticate
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          {source.name} · {source.config.baseUrl}
        </Text>

        <View style={{ gap: 12 }}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.muted}
            style={{
              backgroundColor: colors.elevated,
              color: colors.text,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            style={{
              backgroundColor: colors.elevated,
              color: colors.text,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
            }}
            secureTextEntry
          />
        </View>

        {error && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(239,68,68,0.15)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginTop: 12,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
            <Text style={{ color: "#FF6B6B", fontSize: 14, marginLeft: 8, flex: 1 }}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isLoading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 16,
            marginBottom: 8,
            backgroundColor: canSubmit && !isLoading ? colors.accent : colors.elevated,
          }}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color={colors.bg} />
              <Text style={{ color: colors.bg, fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
                Authenticating...
              </Text>
            </>
          ) : (
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: canSubmit ? colors.bg : colors.muted,
              }}
            >
              Re-authenticate
            </Text>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

// ── Update section ────────────────────────────────────

function UpdateSection() {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateReady, setUpdateReady] = useState(Updates.isUpdatePending);
  const [status, setStatus] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setStatus("Downloading update...");
        setDownloading(true);
        await Updates.fetchUpdateAsync();
        setDownloading(false);
        setUpdateReady(true);
        setStatus("Update ready — restart to apply");
      } else {
        setStatus("Already up to date");
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Update check failed");
      setDownloading(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleReload = useCallback(() => {
    void Updates.reloadAsync();
  }, []);

  return (
    <>
      <SettingsRow
        icon="cloud-download-outline"
        label="Check for Updates"
        detail={
          checking
            ? downloading
              ? "Downloading..."
              : "Checking..."
            : undefined
        }
        onPress={checking ? undefined : handleCheck}
      />

      {updateReady && (
        <SettingsRow
          icon="refresh-outline"
          label="Restart to Apply Update"
          onPress={handleReload}
        />
      )}

      {status && !checking && (
        <Text className="text-fermata-text-secondary text-xs ml-1 mb-2">
          {status}
        </Text>
      )}
    </>
  );
}

// ── Output section ────────────────────────────────────

function OutputSection() {
  const { data: outputs = [] } = useOutputConfigs();
  const { data: activeTarget } = useActiveTarget();
  const { data: availableSpeakers = [] } = useOutputSpeakers();
  const { mutate: removeOutput } = useRemoveOutput();

  const activeSpeaker = activeTarget
    ? availableSpeakers.find(
        (s) =>
          s.outputId === activeTarget.outputId &&
          s.entityId === activeTarget.entityId,
      )
    : null;
  const activeLabel = activeSpeaker?.name ?? "This Device";

  const speakerCountByOutput = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of availableSpeakers) {
      counts.set(s.outputId, (counts.get(s.outputId) ?? 0) + 1);
    }
    return counts;
  }, [availableSpeakers]);

  return (
    <>
      <SettingsRow
        icon="phone-portrait-outline"
        label="Active Speaker"
        detail={activeLabel}
      />

      {outputs.map((output) => (
        <View key={output.id} className="mb-2">
          <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4">
            <Ionicons
              name="home-outline"
              size={22}
              color={colors.textSecondary}
            />
            <View className="flex-1 ml-3">
              <Text className="text-fermata-text text-base">
                {output.name}
              </Text>
              <Text className="text-fermata-text-secondary text-xs">
                {output.type} · {speakerCountByOutput.get(output.id) ?? 0} speakers
              </Text>
            </View>
            <Pressable
              onPress={() => void removeOutput(output.id)}
              className="p-2"
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => router.push("/(tabs)/settings/add-output")}
        className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4 mb-2"
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
        <Text className="text-fermata-accent text-base font-medium ml-3">
          Add Home Assistant
        </Text>
      </Pressable>
    </>
  );
}
