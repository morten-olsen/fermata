import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";

import { useSourcesStore } from "@/src/features/sources/sources";
import { useSyncStore } from "@/src/features/sync/sync";
import { useLibraryStore } from "@/src/features/library/library";
import { useDownloadStore } from "@/src/features/downloads/downloads";
import { useOutputsStore } from "@/src/features/outputs/outputs";

import { SettingsRow } from "@/src/shared/components/settings-row";
import { StatRow } from "@/src/shared/components/stat-row";
import { colors } from "@/src/shared/theme/theme";
import { formatBytes } from "@/src/shared/lib/format";

export default function SettingsScreen() {
  const { sources, removeSource, getAllAdapters } = useSourcesStore(
    useShallow((s) => ({
      sources: s.sources,
      removeSource: s.removeSource,
      getAllAdapters: s.getAllAdapters,
    })),
  );
  const { isSyncing, progress, syncAll } = useSyncStore(
    useShallow((s) => ({
      isSyncing: s.isSyncing,
      progress: s.progress,
      syncAll: s.syncAll,
    })),
  );
  const { stats, refreshAll } = useLibraryStore(
    useShallow((s) => ({ stats: s.stats, refreshAll: s.refreshAll })),
  );
  const {
    stats: dlStats,
    removeAll: removeAllDownloads,
    retryFailed,
    refreshStats: refreshDlStats,
  } = useDownloadStore(
    useShallow((s) => ({
      stats: s.stats,
      removeAll: s.removeAll,
      retryFailed: s.retryFailed,
      refreshStats: s.refreshStats,
    })),
  );

  const handleSync = async () => {
    await syncAll(getAllAdapters());
    await refreshAll();
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

        {sources.map((source) => (
          <View key={source.id} className="mb-2">
            <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4">
              <Ionicons name="server-outline" size={22} color={colors.textSecondary} />
              <View className="flex-1 ml-3">
                <Text className="text-fermata-text text-base">{source.name}</Text>
                <Text className="text-fermata-text-secondary text-xs">
                  {source.type} · {source.baseUrl}
                </Text>
              </View>
              <Pressable
                onPress={() => removeSource(source.id)}
                className="p-2"
              >
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        ))}

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

        <StatRow
          items={[
            { label: "Artists", value: stats.artists },
            { label: "Albums", value: stats.albums },
            { label: "Tracks", value: stats.tracks },
            { label: "Playlists", value: stats.playlists },
          ]}
        />

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Downloads
        </Text>

        <StatRow
          items={[
            { label: "Downloaded", value: dlStats.completedTracks },
            { label: "Pending", value: dlStats.pendingTracks },
            { label: "Failed", value: dlStats.errorTracks },
            { label: "Storage", value: 0, formatted: formatBytes(dlStats.totalBytes) },
          ]}
        />

        {dlStats.errorTracks > 0 && (
          <SettingsRow
            icon="refresh-outline"
            label="Retry Failed Downloads"
            onPress={async () => {
              await retryFailed();
              void refreshDlStats();
            }}
          />
        )}

        {dlStats.completedTracks > 0 && (
          <SettingsRow
            icon="trash-outline"
            label="Remove All Downloads"
            onPress={removeAllDownloads}
            destructive
          />
        )}

        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Output
        </Text>

        <OutputSection />

        <Text className="text-center text-fermata-muted text-xs mt-12 mb-8">
          Fermata 𝄐 v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function OutputSection() {
  const { outputs, activeTarget, availableSpeakers, removeOutput } =
    useOutputsStore(
      useShallow((s) => ({
        outputs: s.outputs,
        activeTarget: s.activeTarget,
        availableSpeakers: s.availableSpeakers,
        removeOutput: s.removeOutput,
      })),
    );

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
