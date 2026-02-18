import { create } from 'zustand';

interface LoadingState {
  globalLoading: boolean;
  loadingText: string;
  setGlobalLoading: (loading: boolean, text?: string) => void;
  showLoading: (text?: string) => void;
  hideLoading: () => void;
}

export const useLoadingStore = create<LoadingState>()((set) => ({
  globalLoading: false,
  loadingText: '',
  setGlobalLoading: (loading, text = '') => set({ globalLoading: loading, loadingText: text }),
  showLoading: (text = '加载中...') => set({ globalLoading: true, loadingText: text }),
  hideLoading: () => set({ globalLoading: false, loadingText: '' }),
}));
