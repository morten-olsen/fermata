import { memo } from "react";
import { Text } from "react-native";

import { SourceArtwork } from "@/src/shared/components/source-artwork";
import { PressableScale } from "@/src/shared/components/pressable-scale";

interface EpisodeCardProps {
  title: string;
  showTitle: string;
  artworkUri?: string | null;
  onPress: () => void;
}

export const EpisodeCard = memo(function EpisodeCard({
  title,
  showTitle,
  artworkUri,
  onPress,
}: EpisodeCardProps) {
  return (
    <PressableScale onPress={onPress} className="mb-4">
      <SourceArtwork artworkUri={artworkUri} fill fallbackIcon="mic" />
      <Text className="text-fermata-text text-sm font-medium mt-2" numberOfLines={2}>
        {title}
      </Text>
      <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
        {showTitle}
      </Text>
    </PressableScale>
  );
});
