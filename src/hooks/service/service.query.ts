import { useCallback, useEffect, useRef, useState } from "react";

import type { RefetchSource } from "./service.reactive-list";

type Listenable<TEventMap extends Record<string, unknown>> = {
  on(
    event: keyof TEventMap & string,
    callback: () => void,
    options?: { abortSignal?: AbortSignal },
  ): unknown;
};

type UseServiceQueryOptions<
  TEventMap extends Record<string, unknown>,
  TData,
> = {
  emitter: Listenable<TEventMap>;
  query: () => Promise<TData>;
  events: (keyof TEventMap & string)[];
  /** Additional emitters whose events should trigger a refetch. */
  invalidateOn?: RefetchSource[];
};

type UseServiceQueryResult<TData> = {
  data: TData | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

const useServiceQuery = <
  TEventMap extends Record<string, unknown>,
  TData,
>(
  options: UseServiceQueryOptions<TEventMap, TData>,
): UseServiceQueryResult<TData> => {
  const { emitter, query, events, invalidateOn } = options;
  const [data, setData] = useState<TData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const invalidateOnRef = useRef(invalidateOn);
  invalidateOnRef.current = invalidateOn;

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

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetch();

    const controller = new AbortController();
    for (const event of eventsRef.current) {
      emitter.on(event, fetch, { abortSignal: controller.signal });
    }

    for (const source of invalidateOnRef.current ?? []) {
      for (const event of source.events) {
        source.emitter.on(event, fetch, { abortSignal: controller.signal });
      }
    }

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [emitter, fetch]);

  return { data, loading, error, refetch: fetch };
};

export { useServiceQuery };
export type { UseServiceQueryResult };
