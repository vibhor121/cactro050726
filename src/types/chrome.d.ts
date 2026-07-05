declare namespace chrome {
  namespace storage {
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }

    interface LocalStorageArea {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }

    const local: LocalStorageArea;

    namespace onChanged {
      function addListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void,
      ): void;
      function removeListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void,
      ): void;
    }
  }

  namespace runtime {
    namespace onInstalled {
      function addListener(callback: () => void): void;
    }
  }
}

declare const chrome: typeof chrome;
