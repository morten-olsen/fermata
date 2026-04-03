import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { View, Text, Pressable, ScrollView } from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SourcesService } from "@/src/services/sources/sources";
import { useService } from "@/src/hooks/service/service";
import { useToggleTrackFavourite } from "@/src/hooks/tracks/tracks";
import { usePlaylists, useCreatePlaylist, useAddTrackToPlaylist } from "@/src/hooks/playlists/playlists";

import { BottomSheet } from "@/src/shared/components/bottom-sheet";
import { colors } from "@/src/shared/theme/theme";

// ── Types ──

export interface TrackActionTarget {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumId?: string | null;
  sourceId: string;
  sourceItemId: string;
  isFavourite: boolean;
  artworkUri?: string | null;
}

export function toActionTarget(
  track: {
    id: string;
    title: string;
    artistName: string;
    albumTitle: string;
    albumId?: string | null;
    sourceId: string;
    sourceItemId: string;
    isFavourite?: number | boolean | null;
    artworkUri?: string | null;
  },
): TrackActionTarget {
  return {
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    albumTitle: track.albumTitle,
    albumId: track.albumId,
    sourceId: track.sourceId,
    sourceItemId: track.sourceItemId,
    isFavourite: !!track.isFavourite,
    artworkUri: track.artworkUri ?? null,
  };
}

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

// ── Provider ──

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
  const sourcesService = useService(SourcesService);
  const { mutate: toggleFavourite } = useToggleTrackFavourite();
  const { data: playlists = [] } = usePlaylists();
  const { mutate: createPlaylist } = useCreatePlaylist();
  const { mutate: addTrackToPlaylist } = useAddTrackToPlaylist();
  const [isFav, setIsFav] = useState(track.isFavourite);
  const [addedToPlaylists, setAddedToPlaylists] = useState(new Set<string>());

  const handleToggleFavourite = async () => {
    const newVal = !isFav;
    setIsFav(newVal);
    Haptics.impactAsync(
      newVal
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    await toggleFavourite(track.id);

    // Sync favourite to source if adapter supports it
    const source = await sourcesService.findById(track.sourceId);
    if (source) {
      const adapter = sourcesService.getAdapter(source);
      adapter.toggleFavourite?.(track.sourceItemId, newVal).catch(() => {});
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    await addTrackToPlaylist({ playlistId, trackId: track.id });
    setAddedToPlaylists((prev) => new Set(prev).add(playlistId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(onDismiss, 400);
  };

  const handleNewPlaylist = async () => {
    const name = `Playlist ${playlists.length + 1}`;
    const id = await createPlaylist(name);
    await addTrackToPlaylist({ playlistId: id, trackId: track.id });
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

  const artworkUrl = track.artworkUri;

  return (
    <BottomSheet visible onDismiss={onDismiss}>
      <View style={{ paddingHorizontal: 20 }}>
        {/* Track info header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.elevated, overflow: "hidden", marginRight: 12 }}>
            {artworkUrl ? (
              <Image source={{ uri: artworkUrl }} style={{ width: 48, height: 48 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="musical-notes" size={20} color={colors.muted} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }} numberOfLines={1}>
              {track.artistName} — {track.albumTitle}
            </Text>
          </View>
        </View>

        {/* Favourite */}
        <ActionRow
          icon={isFav ? "heart" : "heart-outline"}
          iconColor={isFav ? colors.accent : colors.text}
          label={isFav ? "Favourited" : "Favourite"}
          onPress={handleToggleFavourite}
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8, opacity: 0.5 }} />

        {/* Playlists */}
        <Text style={{ fontSize: 11, fontWeight: "500", color: colors.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 2, marginLeft: 4 }}>
          Add to Playlist
        </Text>

        <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
          {playlists.map((pl) => {
            const justAdded = addedToPlaylists.has(pl.id);
            return (
              <ActionRow
                key={pl.id}
                icon="musical-notes"
                iconColor={colors.textSecondary}
                label={pl.name}
                trailing={
                  justAdded ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  ) : (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{pl.trackCount} tracks</Text>
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

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8, opacity: 0.5 }} />

        {/* Navigation */}
        {track.albumId && (
          <ActionRow icon="disc-outline" iconColor={colors.textSecondary} label="Go to Album" onPress={handleGoToAlbum} />
        )}
        <ActionRow icon="person-outline" iconColor={colors.textSecondary} label="Go to Artist" onPress={handleGoToArtist} />

        <View style={{ height: 8 }} />
      </View>
    </BottomSheet>
  );
}

function ActionRow({
  icon, iconColor, label, labelColor, trailing, onPress, disabled,
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
    <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 4 }}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: labelColor ?? colors.text, marginLeft: 14 }} numberOfLines={1}>
          {label}
        </Text>
        {trailing}
      </View>
    </Pressable>
  );
}
