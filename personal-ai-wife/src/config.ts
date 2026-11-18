// Central place for settings that come from environment variables.
//
// Expo only swaps in EXPO_PUBLIC_ values when they are written exactly as
// `process.env.EXPO_PUBLIC_NAME`, so do not store `process.env` in a variable.
// These values are packed into the app and readable by anyone who installs it,
// so never put real secrets here.

// Module-level declaration so TypeScript knows `process` exists (Expo provides it at build time).
declare const process: { env: Record<string, string | undefined> };

export const config = {
  /** Your own server that talks to the AI model. Empty = use the built-in mock AI. */
  aiBackendUrl: (process.env.EXPO_PUBLIC_AI_BACKEND_URL ?? '').trim(),
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
};
