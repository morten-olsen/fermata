import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";

import { useSourcesStore } from "@/src/features/sources/sources";
import { useSyncStore } from "@/src/features/sync/sync";
import { useLibraryStore } from "@/src/features/library/library";
import { useDownloadStore } from "@/src/features/downloads/downloads";

import { colors } from "@/src/shared/theme/theme";

function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4 mb-2"
    >
      <Ionicons
        name={icon}
        size={22}
        color={destructive ? "#FF6B6B" : colors.textSecondary}
      />
      <Text
        className={`flex-1 text-base ml-3 ${destructive ? "text-red-400" : "text-fermata-text"}`}
      >
        {label}
      </Text>
      {detail && (
        <Text className="text-fermata-text-secondary text-sm mr-2">
          {detail}
        </Text>
      )}
      {onPress && !destructive && (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

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

        {/* Sources section */}
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
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
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

        {/* Library section */}
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

        {/* Stats */}
        <View className="bg-fermata-surface rounded-xl px-4 py-4 mb-2">
          <View className="flex-row justify-between">
            <StatItem label="Artists" value={stats.artists} />
            <StatItem label="Albums" value={stats.albums} />
            <StatItem label="Tracks" value={stats.tracks} />
            <StatItem label="Playlists" value={stats.playlists} />
          </View>
        </View>

        {/* Downloads section */}
        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Downloads
        </Text>

        <View className="bg-fermata-surface rounded-xl px-4 py-4 mb-2">
          <View className="flex-row justify-between">
            <StatItem label="Downloaded" value={dlStats.completedTracks} />
            <StatItem label="Pending" value={dlStats.pendingTracks} />
            <StatItem label="Failed" value={dlStats.errorTracks} />
            <StatItem
              label="Storage"
              value={0}
              formatted={formatBytes(dlStats.totalBytes)}
            />
          </View>
        </View>

        {dlStats.errorTracks > 0 && (
          <SettingsRow
            icon="refresh-outline"
            label="Retry Failed Downloads"
            onPress={async () => {
              await retryFailed();
              refreshDlStats();
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

        {/* Output section */}
        <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2 ml-1 mt-6">
          Output
        </Text>

        <SettingsRow
          icon="volume-high-outline"
          label="Playback Output"
          detail="This Device"
        />

        {/* Footer */}
        <Text className="text-center text-fermata-muted text-xs mt-12 mb-8">
          Fermata 𝄐 v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  label,
  value,
  formatted,
}: {
  label: string;
  value: number;
  formatted?: string;
}) {
  return (
    <View className="items-center">
      <Text className="text-fermata-text text-lg font-semibold">
        {formatted ?? value.toLocaleString()}
      </Text>
      <Text className="text-fermata-text-secondary text-xs">{label}</Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
