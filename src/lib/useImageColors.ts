import { useEffect, useState } from "react";

// Lazy-load to avoid crash when native module isn't available (Expo Go)
let ImageColors: typeof import("react-native-image-colors").default | null =
  null;
try {
  ImageColors = require("react-native-image-colors").default;
} catch {
  // Native module not available — color extraction disabled
}

interface AlbumColors {
  primary: string;
  secondary: string;
}

const DEFAULT_COLORS: AlbumColors = {
  primary: "#0A0A0B",
  secondary: "#141416",
};

export function useImageColors(uri: string | undefined): AlbumColors {
  const [albumColors, setAlbumColors] = useState<AlbumColors>(DEFAULT_COLORS);

  useEffect(() => {
    if (!uri || !ImageColors) {
      setAlbumColors(DEFAULT_COLORS);
      return;
    }

    let cancelled = false;

    ImageColors.getColors(uri, {
      fallback: "#0A0A0B",
      cache: true,
      key: uri,
      quality: "low",
    }).then((result) => {
      if (cancelled) return;

      if (result.platform === "ios") {
        setAlbumColors({
          primary: result.background,
          secondary: result.secondary,
        });
      } else if (result.platform === "android") {
        setAlbumColors({
          primary: result.darkMuted,
          secondary: result.darkVibrant,
        });
      } else {
        setAlbumColors({
          primary: result.darkMuted,
          secondary: result.darkVibrant,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return albumColors;
}
