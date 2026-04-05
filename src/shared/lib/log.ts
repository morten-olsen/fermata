/* eslint-disable no-console */
/** Dev-only logging — no-ops in production builds */
export const log = __DEV__
  ? (...args: unknown[]) => console.log("[Fermata]", ...args)
  : () => {};

export const warn = __DEV__
  ? (...args: unknown[]) => console.warn("[Fermata]", ...args)
  : () => {};

export const error = __DEV__
  ? (...args: unknown[]) => console.error("[Fermata]", ...args)
  : () => {};
