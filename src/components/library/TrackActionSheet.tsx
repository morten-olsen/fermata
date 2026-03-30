import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { resolveArtworkUrl } from "@/src/lib/artwork";
import { useLibraryStore, type PlaylistRow } from "@/src/stores/library";
import { useSourcesStore } from "@/src/stores/sources";
import { colors } from "@/src/theme";
import type { TrackActionTarget } from "@/src/lib/track-actions";

// Re-export so existing imports still work
export type { TrackActionTarget } from "@/src/lib/track-actions";

// ── Context ──

interface TrackActionsContextValue {
  showTrackActions: (track: TrackActionTarget) => void;
}

const TrackActionsContext = createContext<TrackActionsContextValue>({
  showTrackActions: () => {},
});

export function useTrackActions() {
  return useContext(TrackActionsContext);
}

// ── Provider (renders the modal) ──

export function TrackActionsProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<TrackActionTarget | null>(null);
  const dismiss = useCallback(() => setTrack(null), []);

  return (
    <TrackActionsContext.Provider value={{ showTrackActions: setTrack }}>
      {children}
      {track && (
        <TrackActionSheetContent track={track} onDismiss={dismiss} />
      )}
    </TrackActionsContext.Provider>
  );
}

// ── Sheet content ──

function TrackActionSheetContent({
  track,
  onDismiss,
}: {
  track: TrackActionTarget;
  onDismiss: () => void;
}) {
  const { toggleFavourite, playlists, loadPlaylists, addTrackToPlaylist, createPlaylist } =
    useLibraryStore();
  const { getAdapter } = useSourcesStore();
  const [isFav, setIsFav] = useState(track.isFavourite);
  const [addedToPlaylists, setAddedToPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleToggleFavourite = async () => {
    const newVal = !isFav;
    setIsFav(newVal);
    Haptics.impactAsync(
      newVal
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    await toggleFavourite(track.id);

    const adapter = getAdapter(track.sourceId);
    adapter?.toggleFavourite?.(track.sourceItemId, newVal).catch(() => {});
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    const adapter = getAdapter(track.sourceId);
    await addTrackToPlaylist(playlistId, track.id, adapter);
    setAddedToPlaylists((prev) => new Set(prev).add(playlistId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(onDismiss, 400);
  };

  const handleNewPlaylist = async () => {
    const adapter = getAdapter(track.sourceId);
    const name = `Playlist ${playlists.length + 1}`;
    const id = await createPlaylist(name, adapter);
    await addTrackToPlaylist(id, track.id, adapter);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(onDismiss, 400);
  };

  const handleGoToAlbum = () => {
    onDismiss();
    if (track.albumId) {
      router.push({
        pathname: "/(tabs)/library/album/[id]",
        params: { id: track.albumId },
      });
    }
  };

  const handleGoToArtist = () => {
    onDismiss();
    router.push({
      pathname: "/(tabs)/library/artist/[name]",
      params: { name: track.artistName },
    });
  };

  const artworkUrl = resolveArtworkUrl(
    track.sourceId,
    track.artworkSourceItemId ?? track.sourceItemId,
    "small"
  );

  return (
    <BottomSheet visible onDismiss={onDismiss}>
      <View style={{ paddingHorizontal: 20 }}>
        {/* Track info header */}
        <TrackHeader
          title={track.title}
          subtitle={`${track.artistName} — ${track.albumTitle}`}
          artworkUrl={artworkUrl}
        />

        {/* Favourite */}
        <ActionRow
          icon={isFav ? "heart" : "heart-outline"}
          iconColor={isFav ? colors.accent : colors.text}
          label={isFav ? "Favourited" : "Favourite"}
          onPress={handleToggleFavourite}
        />

        <Divider />

        {/* Mix Tapes section */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: colors.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
            marginTop: 2,
            marginLeft: 4,
          }}
        >
          Add to Playlist
        </Text>

        <ScrollView
          style={{ maxHeight: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {playlists.map((pl) => {
            const justAdded = addedToPlaylists.has(pl.id);
            return (
              <ActionRow
                key={pl.id}
                icon={pl.isMixTape ? "heart" : "musical-notes"}
                iconColor={pl.isMixTape ? colors.accent : colors.textSecondary}
                label={pl.name}
                trailing={
                  justAdded ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.accent}
                    />
                  ) : (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {pl.trackCount} tracks
                    </Text>
                  )
                }
                onPress={() => handleAddToPlaylist(pl.id)}
                disabled={justAdded}
              />
            );
          })}
          <ActionRow
            icon="add-circle-outline"
            iconColor={colors.accent}
            label="New Playlist"
            labelColor={colors.accent}
            onPress={handleNewPlaylist}
          />
        </ScrollView>

        <Divider />

        {/* Navigation */}
        {track.albumId && (
          <ActionRow
            icon="disc-outline"
            iconColor={colors.textSecondary}
            label="Go to Album"
            onPress={handleGoToAlbum}
          />
        )}
        <ActionRow
          icon="person-outline"
          iconColor={colors.textSecondary}
          label="Go to Artist"
          onPress={handleGoToArtist}
        />

        <View style={{ height: 8 }} />
      </View>
    </BottomSheet>
  );
}

// ── Shared sub-components ──

function TrackHeader({
  title,
  subtitle,
  artworkUrl,
}: {
  title: string;
  subtitle: string;
  artworkUrl: string | undefined;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          backgroundColor: colors.elevated,
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        {artworkUrl ? (
          <Image
            source={{ uri: artworkUrl }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="musical-notes" size={20} color={colors.muted} />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 8,
        opacity: 0.5,
      }}
    />
  );
}

function ActionRow({
  icon,
  iconColor,
  label,
  labelColor,
  trailing,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  labelColor?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 13,
          paddingHorizontal: 4,
        }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "500",
            color: labelColor ?? colors.text,
            marginLeft: 14,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {trailing}
      </View>
    </Pressable>
  );
}
