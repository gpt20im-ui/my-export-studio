export type Lang = 'english' | 'hinglish' | 'hindi';
export type LanguageSetting = Lang | 'auto';
export type ReplyLength = 'short' | 'medium' | 'long';
export type MemoryCategory = 'preference' | 'fact' | 'moment';
export type TraitKey = 'romantic' | 'caring' | 'playful' | 'supportive';

export interface MemoryProposal {
  text: string;
  category: MemoryCategory;
  status: 'pending' | 'saved' | 'dismissed';
}

export interface Message {
  id: string;
  role: 'user' | 'wife';
  text: string;
  ts: number;
  kind: 'text' | 'voice';
  voiceUri?: string;
  durationMs?: number;
  memoryProposal?: MemoryProposal;
  initiated?: boolean;
}

export interface Profile {
  userName: string;
  wifeName: string;
  avatarId: string;
  language: LanguageSetting;
  onboarded: boolean;
  acceptedAiNotice: boolean;
}

export interface Personality {
  /** Each trait is a level from 0 (off) to 4 (very strong). */
  traits: Record<TraitKey, number>;
  replyLength: ReplyLength;
  useEmojis: boolean;
}

export interface TimeSlot {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface NotificationSettings {
  enabled: boolean;
  morning: TimeSlot;
  midday: TimeSlot;
  night: TimeSlot;
  /** If true, she starts the conversation when you open the app after a break. */
  initiateInChat: boolean;
}

export interface MemoryItem {
  id: string;
  text: string;
  category: MemoryCategory;
  createdAt: number;
  source: 'chat' | 'manual';
}

export interface MemorySettings {
  enabled: boolean;
}

export interface GalleryItem {
  id: string;
  kind: 'art' | 'photo';
  title: string;
  caption: string;
  colors: [string, string];
  icon: string;
  uri?: string;
  favorite: boolean;
  createdAt: number;
}

export interface AppData {
  profile: Profile;
  personality: Personality;
  notifications: NotificationSettings;
  memorySettings: MemorySettings;
  messages: Message[];
  memories: MemoryItem[];
  gallery: GalleryItem[];
}
