import { useCallback, useRef, useState } from "react";

type UseServiceMutationResult<TInput, TOutput> = {
  mutate: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  error: Error | null;
};

const useServiceMutation = <TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
): UseServiceMutationResult<TInput, TOutput> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const mutate = useCallback(async (input: TInput): Promise<TOutput> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(input);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (mountedRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fn]);

  return { mutate, loading, error };
};

export { useServiceMutation };
export type { UseServiceMutationResult };
