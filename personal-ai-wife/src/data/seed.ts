import type { AppData, GalleryItem } from '../types';

const now = Date.now();

function art(
  n: number,
  title: string,
  caption: string,
  colors: [string, string],
  icon: string,
): GalleryItem {
  return {
    id: `seed-${n}`,
    kind: 'art',
    title,
    caption,
    colors,
    icon,
    favorite: false,
    createdAt: now - n * 1000,
  };
}

export const SEED_GALLERY: GalleryItem[] = [
  art(1, 'Moonlit Walk', 'A quiet walk under a purple sky.', ['#3B1470', '#FF5D9E'], 'moon'),
  art(2, 'Chai at Sunrise', 'Warm cups and slow mornings.', ['#F5C16B', '#FF5D7A'], 'cafe'),
  art(3, 'Rainy Window', 'Raindrops, music and nowhere to be.', ['#2B2A6B', '#47C7E8'], 'rainy'),
  art(4, 'Starry Terrace', 'Counting stars from the rooftop.', ['#120824', '#B07CFF'], 'star'),
  art(5, 'Rose Garden', 'Petals, perfume and golden light.', ['#FF9CC6', '#B83AD6'], 'rose'),
  art(6, 'Golden Hour', 'Everything glows a little warmer.', ['#E8C170', '#FF5D9E'], 'sunny'),
];

export const DEFAULT_DATA: AppData = {
  profile: {
    userName: '',
    wifeName: 'Meera',
    avatarId: 'rose',
    language: 'auto',
    onboarded: false,
    acceptedAiNotice: false,
  },
  personality: {
    traits: { romantic: 3, caring: 4, playful: 2, supportive: 3 },
    replyLength: 'medium',
    useEmojis: true,
  },
  notifications: {
    enabled: false,
    morning: { enabled: true, hour: 8, minute: 0 },
    midday: { enabled: false, hour: 13, minute: 0 },
    night: { enabled: true, hour: 22, minute: 30 },
    initiateInChat: true,
  },
  memorySettings: { enabled: true },
  messages: [],
  memories: [],
  gallery: SEED_GALLERY,
};
