import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState } from 'react-native';
import { DEFAULT_DATA } from '../data/seed';
import { clearAllData, loadJSON, saveJSON } from '../storage/storage';
import type {
  AppData,
  GalleryItem,
  MemoryCategory,
  MemoryItem,
  Message,
  NotificationSettings,
  Personality,
  Profile,
} from '../types';
import { errorMessage, uid } from '../utils';

type Status = 'loading' | 'ready' | 'error';

const KEYS = [
  'profile',
  'personality',
  'notifications',
  'memorySettings',
  'messages',
  'memories',
  'gallery',
] as const;

const MAX_MESSAGES = 600;

interface AppContextValue {
  status: Status;
  error: string | null;
  saveError: string | null;
  data: AppData;
  reload: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  setPersonality: (p: Personality) => void;
  setNotifications: (n: NotificationSettings) => void;
  setMemoryEnabled: (enabled: boolean) => void;
  addMessage: (m: Message) => void;
  patchMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
  addMemory: (text: string, category: MemoryCategory, source: 'chat' | 'manual') => MemoryItem | null;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;
  addGalleryItem: (item: GalleryItem) => void;
  toggleFavorite: (id: string) => void;
  deleteGalleryItem: (id: string) => void;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function mergeLoaded(loaded: Partial<AppData>): AppData {
  const d = DEFAULT_DATA;
  return {
    profile: { ...d.profile, ...(loaded.profile ?? {}) },
    personality: {
      ...d.personality,
      ...(loaded.personality ?? {}),
      traits: { ...d.personality.traits, ...(loaded.personality?.traits ?? {}) },
    },
    notifications: {
      ...d.notifications,
      ...(loaded.notifications ?? {}),
      morning: { ...d.notifications.morning, ...(loaded.notifications?.morning ?? {}) },
      midday: { ...d.notifications.midday, ...(loaded.notifications?.midday ?? {}) },
      night: { ...d.notifications.night, ...(loaded.notifications?.night ?? {}) },
    },
    memorySettings: { ...d.memorySettings, ...(loaded.memorySettings ?? {}) },
    messages: Array.isArray(loaded.messages) ? loaded.messages : d.messages,
    memories: Array.isArray(loaded.memories) ? loaded.memories : d.memories,
    gallery: Array.isArray(loaded.gallery) ? loaded.gallery : d.gallery,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savedRef = useRef<Record<string, unknown>>({});
  const dataRef = useRef<AppData>(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const values = await Promise.all(
        KEYS.map((k) => loadJSON<unknown>(k, undefined)),
      );
      const raw: Record<string, unknown> = {};
      KEYS.forEach((k, i) => {
        if (values[i] !== undefined) raw[k] = values[i];
      });
      const merged = mergeLoaded(raw as Partial<AppData>);
      const saved: Record<string, unknown> = {};
      KEYS.forEach((k) => {
        saved[k] = merged[k];
      });
      savedRef.current = saved;
      setData(merged);
      setStatus('ready');
    } catch (e) {
      setError(errorMessage(e, 'Could not open your saved data.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(async () => {
    const current = dataRef.current;
    for (const k of KEYS) {
      if (savedRef.current[k] !== current[k]) {
        try {
          await saveJSON(k, current[k]);
          savedRef.current[k] = current[k];
          setSaveError(null);
        } catch (e) {
          setSaveError(errorMessage(e, 'Could not save your changes.'));
        }
      }
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(() => {
      flush();
    }, 250);
    return () => clearTimeout(t);
  }, [data, status, flush]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    return () => sub.remove();
  }, [flush]);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }, []);

  const setPersonality = useCallback((p: Personality) => {
    setData((d) => ({ ...d, personality: p }));
  }, []);

  const setNotifications = useCallback((n: NotificationSettings) => {
    setData((d) => ({ ...d, notifications: n }));
  }, []);

  const setMemoryEnabled = useCallback((enabled: boolean) => {
    setData((d) => ({ ...d, memorySettings: { ...d.memorySettings, enabled } }));
  }, []);

  const addMessage = useCallback((m: Message) => {
    setData((d) => {
      const next = [...d.messages, m];
      return { ...d, messages: next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next };
    });
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    setData((d) => ({
      ...d,
      messages: d.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setData((d) => ({ ...d, messages: [] }));
  }, []);

  const addMemory = useCallback(
    (text: string, category: MemoryCategory, source: 'chat' | 'manual'): MemoryItem | null => {
      const clean = text.trim();
      if (!clean) return null;
      const exists = dataRef.current.memories.some(
        (m) => m.text.toLowerCase() === clean.toLowerCase(),
      );
      if (exists) return null;
      const item: MemoryItem = { id: uid(), text: clean, category, createdAt: Date.now(), source };
      setData((d) => ({ ...d, memories: [item, ...d.memories] }));
      return item;
    },
    [],
  );

  const deleteMemory = useCallback((id: string) => {
    setData((d) => ({ ...d, memories: d.memories.filter((m) => m.id !== id) }));
  }, []);

  const clearMemories = useCallback(() => {
    setData((d) => ({ ...d, memories: [] }));
  }, []);

  const addGalleryItem = useCallback((item: GalleryItem) => {
    setData((d) => ({ ...d, gallery: [item, ...d.gallery] }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      gallery: d.gallery.map((g) => (g.id === id ? { ...g, favorite: !g.favorite } : g)),
    }));
  }, []);

  const deleteGalleryItem = useCallback((id: string) => {
    setData((d) => ({ ...d, gallery: d.gallery.filter((g) => g.id !== id) }));
  }, []);

  const resetAll = useCallback(async () => {
    await clearAllData();
    savedRef.current = {};
    KEYS.forEach((k) => {
      savedRef.current[k] = DEFAULT_DATA[k];
    });
    setData(DEFAULT_DATA);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      error,
      saveError,
      data,
      reload: load,
      setProfile,
      setPersonality,
      setNotifications,
      setMemoryEnabled,
      addMessage,
      patchMessage,
      clearMessages,
      addMemory,
      deleteMemory,
      clearMemories,
      addGalleryItem,
      toggleFavorite,
      deleteGalleryItem,
      resetAll,
    }),
    [
      status,
      error,
      saveError,
      data,
      load,
      setProfile,
      setPersonality,
      setNotifications,
      setMemoryEnabled,
      addMessage,
      patchMessage,
      clearMessages,
      addMemory,
      deleteMemory,
      clearMemories,
      addGalleryItem,
      toggleFavorite,
      deleteGalleryItem,
      resetAll,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
