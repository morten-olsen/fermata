import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────

type RefetchEmitter = {
  on(
    event: string,
    callback: () => void,
    options?: { abortSignal?: AbortSignal },
  ): unknown;
};

type PatchEmitter = {
  on(
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (...args: any[]) => void,
    options?: { abortSignal?: AbortSignal },
  ): unknown;
};

type RefetchSource = {
  emitter: RefetchEmitter;
  events: string[];
};

type ItemPatch<TItem> = {
  emitter: PatchEmitter;
  event: string;
  /**
   * Given event args, return the affected item key and an updater,
   * or null to skip (event not relevant to this list).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (...args: any[]) => { key: string; update: (item: TItem) => TItem } | null;
};

type ListPatch<TItem> = {
  emitter: PatchEmitter;
  event: string;
  /**
   * Given event args, return a mapper that updates the full list with structural sharing.
   * Return null to skip. The mapper should return the same item reference for unchanged items.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (...args: any[]) => ((item: TItem) => TItem) | null;
};

type UseReactiveListOptions<TItem> = {
  /** Async function returning the full enriched list. */
  query: () => Promise<TItem[]>;
  /** Extract a stable unique key from each item. */
  keyOf: (item: TItem) => string;
  /** Emitter/event pairs that trigger a full refetch (e.g. syncCompleted). */
  refetchOn?: RefetchSource[];
  /** Per-item patches applied via structural sharing (e.g. progress tick). */
  patchOn?: ItemPatch<TItem>[];
  /** List-wide patches with structural sharing (e.g. isPlaying toggle). */
  listPatchOn?: ListPatch<TItem>[];
};

type UseReactiveListResult<TItem> = {
  data: TItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

// ── Hook ─────────────────────────────────────────────────

const useReactiveList = <TItem>(
  options: UseReactiveListOptions<TItem>,
): UseReactiveListResult<TItem> => {
  const { query, keyOf, refetchOn, patchOn, listPatchOn } = options;
  const [data, setData] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const keyOfRef = useRef(keyOf);
  keyOfRef.current = keyOf;
  const refetchOnRef = useRef(refetchOn);
  refetchOnRef.current = refetchOn;
  const patchOnRef = useRef(patchOn);
  patchOnRef.current = patchOn;
  const listPatchOnRef = useRef(listPatchOn);
  listPatchOnRef.current = listPatchOn;

  const fetch = useCallback(() => {
    query()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (mountedRef.current) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  }, [query]);

  // Initial fetch + bulk refetch subscriptions
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetch();

    const controller = new AbortController();

    for (const source of refetchOnRef.current ?? []) {
      for (const event of source.events) {
        source.emitter.on(event, fetch, { abortSignal: controller.signal });
      }
    }

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetch]);

  // Per-item + list-wide patch subscriptions
  useEffect(() => {
    const controller = new AbortController();

    for (const patch of patchOnRef.current ?? []) {
      patch.emitter.on(patch.event, (...args: unknown[]) => {
        if (!mountedRef.current) return;

        const result = patch.apply(...args);
        if (!result) return;

        const { key, update } = result;
        setData((prev) => {
          const getKey = keyOfRef.current;
          const idx = prev.findIndex((item) => getKey(item) === key);
          if (idx === -1) return prev;
          const updated = update(prev[idx]);
          const next = [...prev];
          next[idx] = updated;
          return next;
        });
      }, { abortSignal: controller.signal });
    }

    for (const patch of listPatchOnRef.current ?? []) {
      patch.emitter.on(patch.event, (...args: unknown[]) => {
        if (!mountedRef.current) return;

        const mapper = patch.apply(...args);
        if (!mapper) return;

        setData((prev) => {
          const next = prev.map(mapper);
          return next.some((item, i) => item !== prev[i]) ? next : prev;
        });
      }, { abortSignal: controller.signal });
    }

    return () => { controller.abort(); };
  }, []);

  return { data, loading, error, refetch: fetch };
};

export { useReactiveList };
export type { ItemPatch, ListPatch, RefetchSource, UseReactiveListOptions, UseReactiveListResult };
