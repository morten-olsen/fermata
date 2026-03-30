import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";

interface PlaylistRowProps {
  name: string;
  trackCount: number;
  isFavourite?: boolean;
  sourceId?: string | null;
  onPress: () => void;
}

export function PlaylistRow({
  name,
  trackCount,
  isFavourite,
  sourceId,
  onPress,
}: PlaylistRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="list" size={20} color={colors.muted} />
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "500", color: colors.text }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {trackCount} {trackCount === 1 ? "track" : "tracks"}
          {sourceId ? "" : " · Local"}
        </Text>
      </View>

      {isFavourite && (
        <Ionicons
          name="heart"
          size={14}
          color={colors.accent}
          style={{ marginRight: 8 }}
        />
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
