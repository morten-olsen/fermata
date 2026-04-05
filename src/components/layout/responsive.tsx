import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

export type BreakpointConfig<T> = Partial<Record<Breakpoint, T>>;

const BREAKPOINTS: { name: Breakpoint; minWidth: number }[] = [
  { name: "xl", minWidth: 1280 },
  { name: "lg", minWidth: 1024 },
  { name: "md", minWidth: 768 },
  { name: "sm", minWidth: 640 },
];

const ORDERED: Breakpoint[] = ["base", "sm", "md", "lg", "xl"];

/**
 * Returns the active breakpoint based on window width.
 * Matches the breakpoints defined in tailwind.config.js.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    for (const bp of BREAKPOINTS) {
      if (width >= bp.minWidth) return bp.name;
    }
    return "base";
  }, [width]);
}

/**
 * Returns the resolved value for the current breakpoint.
 * Falls back to the nearest smaller breakpoint that has a value.
 *
 * @example
 * const padding = useResponsiveValue({ base: 16, md: 24, lg: 32 });
 */
export function useResponsiveValue<T>(config: BreakpointConfig<T>): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const activeIndex = ORDERED.indexOf(breakpoint);

    for (let i = activeIndex; i >= 0; i--) {
      const value = config[ORDERED[i]];
      if (value !== undefined) return value;
    }

    // Shouldn't happen if 'base' is provided, but return first defined value
    for (const bp of ORDERED) {
      const value = config[bp];
      if (value !== undefined) return value;
    }

    throw new Error(
      "useResponsiveValue: no value found for any breakpoint"
    );
  }, [breakpoint, config]);
}

/**
 * Convenience hook for responsive column counts.
 *
 * @example
 * const columns = useColumns({ base: 2, sm: 3, md: 4, lg: 5 });
 */
export function useColumns(config: BreakpointConfig<number>): number {
  return useResponsiveValue(config);
}
