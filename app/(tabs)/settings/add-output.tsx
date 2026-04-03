import { useState, useCallback } from "react";
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

import { useAddOutput } from "@/src/hooks/outputs/outputs";
import { useService } from "@/src/hooks/service/service";
import { OutputsService } from "@/src/services/outputs/outputs.service";

import { colors } from "@/src/shared/theme/theme";
import { isValidHttpUrl } from "@/src/shared/lib/validate";

export default function AddOutputScreen() {
  const { mutate: addOutput } = useAddOutput();
  const outputsService = useService(OutputsService);

  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlTrimmed = serverUrl.trim();
  const urlValid = urlTrimmed.length === 0 || isValidHttpUrl(urlTrimmed);
  const canConnect =
    name.trim() && urlTrimmed && urlValid && accessToken.trim();

  const handleConnect = useCallback(async () => {
    if (!canConnect) return;
    setIsConnecting(true);
    setError(null);

    try {
      // Test the connection before saving
      const connection = await outputsService.authenticateHA(
        serverUrl.trim(),
        accessToken.trim(),
      );
      connection.close();

      const config = {
        url: serverUrl.trim(),
        accessToken: accessToken.trim(),
      };

      await addOutput({
        type: "home-assistant",
        name: name.trim(),
        config,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setIsConnecting(false);
    }
  }, [canConnect, serverUrl, accessToken, name, addOutput]);

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
              Add Home Assistant
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Info */}
          <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-3 mb-6">
            <Ionicons name="home" size={20} color={colors.accent} />
            <Text className="text-fermata-text-secondary text-sm ml-3 flex-1">
              Connect your Home Assistant to play music on any of its speakers.
            </Text>
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
                placeholder="Home"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-fermata-text-secondary text-sm mb-1 ml-1">
                Home Assistant URL
              </Text>
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://homeassistant.local:8123"
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
                Long-Lived Access Token
              </Text>
              <TextInput
                value={accessToken}
                onChangeText={setAccessToken}
                placeholder="Paste token from HA profile"
                placeholderTextColor={colors.muted}
                className="bg-fermata-surface text-fermata-text rounded-xl px-4 py-3 text-base"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text className="text-fermata-muted text-xs mt-1 ml-1">
                Create one in HA: Profile → Long-Lived Access Tokens
              </Text>
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
            disabled={!canConnect || isConnecting}
            className={`flex-row items-center justify-center py-4 rounded-xl mt-6 ${
              canConnect && !isConnecting
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
                  canConnect ? "text-fermata-bg" : "text-fermata-muted"
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
