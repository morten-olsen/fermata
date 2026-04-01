import { memo } from "react";
import { View } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/shared/theme/theme";

export type ArtworkAspect = "square" | "portrait";
type ArtworkSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<ArtworkSize, number> = {
  sm: 44,
  md: 80,
  lg: 192,
  xl: 256,
};

const RADIUS_MAP: Record<ArtworkSize, number> = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 16,
};

const ICON_SIZE_MAP: Record<ArtworkSize, number> = {
  sm: 18,
  md: 32,
  lg: 48,
  xl: 64,
};

interface ArtworkProps {
  uri: string | null | undefined;
  /** @default "square" */
  aspect?: ArtworkAspect;
  /** Predefined size. Ignored when `width` is provided. @default "md" */
  size?: ArtworkSize;
  /** Custom width — height is derived from aspect ratio. */
  width?: number;
  /** Fallback icon name when no artwork. @default "disc" */
  fallbackIcon?: string;
  /** Whether to use the slower 300ms transition for large artwork. @default false */
  heroTransition?: boolean;
  /** Badge element rendered at bottom-right (e.g. download indicator). */
  badge?: React.ReactNode;
}

export const Artwork = memo(function Artwork({
  uri,
  aspect = "square",
  size = "md",
  width: customWidth,
  fallbackIcon = "disc",
  heroTransition = false,
  badge,
}: ArtworkProps) {
  const w = customWidth ?? SIZE_MAP[size];
  const h = aspect === "portrait" ? w * (4 / 3) : w;
  const radius = customWidth
    ? w >= 192 ? 16 : 12
    : RADIUS_MAP[size];
  const iconSize = customWidth
    ? Math.max(18, Math.round(w * 0.25))
    : ICON_SIZE_MAP[size];

  return (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={uri}
          transition={heroTransition ? 300 : 200}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={fallbackIcon as keyof typeof Ionicons.glyphMap} size={iconSize} color={colors.muted} />
        </View>
      )}
      {badge && (
        <View
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
          }}
        >
          {badge}
        </View>
      )}
    </View>
  );
});
