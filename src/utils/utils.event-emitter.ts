type EventListener<T extends unknown[]> = (...args: T) => void | Promise<void>;

type OnOptions = {
  abortSignal?: AbortSignal;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class EventEmitter<T extends Record<string, (...args: any[]) => void | Promise<void>>> {
  #listeners = new Map<keyof T, Set<EventListener<unknown[]>>>();

  on = <K extends keyof T>(event: K, callback: EventListener<Parameters<T[K]>>, options: OnOptions = {}) => {
    const { abortSignal } = options;
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    const callbackClone = (...args: Parameters<T[K]>) => callback(...args);
    const abortController = new AbortController();
    const listeners = this.#listeners.get(event);
    if (!listeners) {
      throw new Error('Event registration failed');
    }
    abortSignal?.addEventListener('abort', () => { abortController.abort(); });
    listeners.add(callbackClone);
    abortController.signal.addEventListener('abort', () => {
      listeners.delete(callbackClone);
    });
    return () => { abortController.abort(); };
  };

  once = <K extends keyof T>(event: K, callback: EventListener<Parameters<T[K]>>, options: OnOptions = {}) => {
    const abortController = new AbortController();
    options.abortSignal?.addEventListener('abort', () => { abortController.abort(); });
    return this.on(
      event,
      async (...args) => {
        abortController.abort();
        await callback(...args);
      },
      {
        ...options,
        abortSignal: abortController.signal,
      },
    );
  };

  emit = <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => {
    const listeners = this.#listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      void listener(...args);
    }
  };

  emitAsync = async <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => {
    const listeners = this.#listeners.get(event);
    if (!listeners) {
      return;
    }
    await Promise.all([...listeners].map((listener) => Promise.resolve(listener(...args))));
  };
}

export { EventEmitter };

