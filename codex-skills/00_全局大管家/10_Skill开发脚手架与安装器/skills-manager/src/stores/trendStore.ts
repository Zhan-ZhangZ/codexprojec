import { create } from "zustand";

import { invoke, isTauriRuntime } from "@/lib/tauri";
import type {
  MarketplaceTrendItem,
  TrendSourceRefreshResult,
} from "@/types";

interface TrendState {
  items: MarketplaceTrendItem[];
  source: "all" | "github" | "x" | "huggingface";
  windowDays: 7 | 30;
  sourceResults: TrendSourceRefreshResult[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setSource: (source: TrendState["source"]) => void;
  setWindowDays: (windowDays: 7 | 30) => void;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useTrendStore = create<TrendState>((set, get) => ({
  items: [],
  source: "all",
  windowDays: 7,
  sourceResults: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  setSource: (source) => {
    set({ source });
    void get().load();
  },
  setWindowDays: (windowDays) => {
    set({ windowDays });
    void get().load();
  },
  load: async () => {
    if (!isTauriRuntime()) return;
    set({ isLoading: true, error: null });
    try {
      const items = await invoke<MarketplaceTrendItem[]>(
        "list_marketplace_trends",
        {
          source: get().source === "all" ? null : get().source,
          windowDays: get().windowDays,
        }
      );
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
  refresh: async () => {
    if (!isTauriRuntime()) return;
    set({ isRefreshing: true, error: null });
    try {
      const sourceResults = await invoke<TrendSourceRefreshResult[]>(
        "refresh_marketplace_trends",
        { source: get().source === "all" ? null : get().source }
      );
      set({ sourceResults, isRefreshing: false });
      await get().load();
    } catch (error) {
      set({ error: String(error), isRefreshing: false });
    }
  },
}));
