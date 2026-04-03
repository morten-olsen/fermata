import { memo, useCallback } from "react";
import { View, Text, Pressable, Modal, FlatList } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors } from "@/src/shared/theme/theme";

import {
  useOutputSpeakers,
  useActiveTarget,
  useOutputConnectionState,
  useSetActiveSpeaker,
  useSetLocalActive,
} from "@/src/hooks/outputs/outputs";

interface OutputPickerProps {
  visible: boolean;
  onDismiss: () => void;
}

export const OutputPicker = memo(function OutputPicker({
  visible,
  onDismiss,
}: OutputPickerProps) {
  const { data: speakers = [] } = useOutputSpeakers();
  const { data: activeTarget } = useActiveTarget();
  const { data: connectionState } = useOutputConnectionState();
  const { mutate: setActiveSpeaker } = useSetActiveSpeaker();
  const { mutate: setLocalActive } = useSetLocalActive();

  const handleSelectLocal = useCallback(() => {
    void setLocalActive(undefined);
    onDismiss();
  }, [setLocalActive, onDismiss]);

  const handleSelectSpeaker = useCallback(
    (outputId: string, entityId: string) => {
      void setActiveSpeaker({ outputId, entityId });
      onDismiss();
    },
    [setActiveSpeaker, onDismiss],
  );

  const handleAddOutput = useCallback(() => {
    onDismiss();
    router.push("/(tabs)/settings/add-output");
  }, [onDismiss]);

  const isLocalActive = activeTarget === null || activeTarget === undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable
        onPress={onDismiss}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-fermata-surface rounded-t-2xl"
          style={{ maxHeight: "50%" }}
        >
          {/* Header */}
          <View className="px-5 pt-5 pb-3">
            <Text className="text-fermata-text text-lg font-semibold">
              Playing on
            </Text>
          </View>

          {/* Local device */}
          <Pressable
            onPress={handleSelectLocal}
            className="flex-row items-center px-5 py-3"
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={isLocalActive ? colors.accent : colors.textSecondary}
            />
            <Text
              className={`flex-1 text-base ml-3 ${
                isLocalActive
                  ? "text-fermata-accent font-medium"
                  : "text-fermata-text"
              }`}
            >
              This Device
            </Text>
            {isLocalActive && (
              <Ionicons name="checkmark" size={20} color={colors.accent} />
            )}
          </Pressable>

          {/* HA speakers */}
          <FlatList
            data={speakers}
            keyExtractor={(item) => `${item.outputId}:${item.entityId}`}
            renderItem={({ item }) => {
              const isActive =
                activeTarget !== null &&
                activeTarget !== undefined &&
                activeTarget.outputId === item.outputId &&
                activeTarget.entityId === item.entityId;
              const isConnecting =
                isActive && connectionState === "connecting";
              const isError = isActive && connectionState === "error";
              const isUnavailable = item.state === "unavailable";
              return (
                <Pressable
                  onPress={() =>
                    handleSelectSpeaker(item.outputId, item.entityId)
                  }
                  disabled={isUnavailable}
                  className="flex-row items-center px-5 py-3"
                  style={isUnavailable ? { opacity: 0.4 } : undefined}
                >
                  <Ionicons
                    name="volume-high-outline"
                    size={20}
                    color={isActive ? colors.accent : colors.textSecondary}
                  />
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-base ${
                        isActive
                          ? "text-fermata-accent font-medium"
                          : "text-fermata-text"
                      }`}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isConnecting && (
                      <Text className="text-fermata-muted text-xs">
                        Connecting...
                      </Text>
                    )}
                    {isError && (
                      <Text className="text-red-400 text-xs">
                        Connection error — tap to retry
                      </Text>
                    )}
                    {isUnavailable && (
                      <Text className="text-fermata-muted text-xs">
                        Unavailable
                      </Text>
                    )}
                  </View>
                  {isActive && !isConnecting && !isError && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </Pressable>
              );
            }}
          />

          {/* Add HA instance */}
          <Pressable
            onPress={handleAddOutput}
            className="flex-row items-center px-5 py-3 mb-6"
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.accent}
            />
            <Text className="text-fermata-accent text-base font-medium ml-3">
              Add Home Assistant...
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
