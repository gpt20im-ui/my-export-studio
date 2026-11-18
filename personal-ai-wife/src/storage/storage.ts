import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'personal-ai-wife:v1:';

export async function loadJSON<T>(name: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(PREFIX + name);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted entry: fall back to defaults instead of crashing the app.
    return fallback;
  }
}

export async function saveJSON(name: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(PREFIX + name, JSON.stringify(value));
}

export async function clearAllData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(PREFIX));
  if (mine.length > 0) await AsyncStorage.multiRemove(mine);
}
