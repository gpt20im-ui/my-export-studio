/**
 * Firebase is PREPARED here but not connected yet, so the app works fully
 * offline today. When you are ready (see README, "Connecting Firebase later"):
 *
 *   1. Create a Firebase project and add the config values to a local ".env"
 *      file (copy ".env.example"). The web config is not secret, but keep it
 *      out of git.
 *   2. Install the SDK:  npm install firebase
 *   3. Replace the two functions in `cloudSync` below with real Firestore code.
 *
 * Never put admin keys, service-account files or AI keys in this app.
 */
import { config } from '../config';
import type { AppData } from '../types';

export const firebaseConfig = config.firebase;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export interface CloudSync {
  /** Save a copy of the user's data to the cloud. */
  backup(data: AppData): Promise<void>;
  /** Load the last cloud copy, or null if there is none. */
  restore(): Promise<AppData | null>;
}

const notConnected = (): Error =>
  new Error('Cloud sync is not connected yet. See the README section "Connecting Firebase later".');

export const cloudSync: CloudSync = {
  async backup() {
    throw notConnected();
  },
  async restore() {
    throw notConnected();
  },
};
