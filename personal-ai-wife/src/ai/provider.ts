import { config } from '../config';
import { errorMessage } from '../utils';
import { generateMockReply, type EngineInput } from './engine';

/**
 * Returns the wife's reply to a message.
 *
 * - With no backend configured (the default) the built-in mock AI answers
 *   instantly on the phone.
 * - When EXPO_PUBLIC_AI_BACKEND_URL is set, the message is sent to YOUR server,
 *   which holds the real AI key. The app itself never contains any API key.
 *
 * The server is expected to answer with JSON: { "reply": "text" }.
 */
export async function getReply(input: EngineInput): Promise<string> {
  if (!config.aiBackendUrl) {
    return generateMockReply(input);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(config.aiBackendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input.text,
        history: input.history.slice(-20).map((m) => ({ role: m.role, text: m.text })),
        persona: {
          wifeName: input.profile.wifeName,
          userName: input.profile.userName,
          language: input.profile.language,
          traits: input.personality.traits,
          replyLength: input.personality.replyLength,
          useEmojis: input.personality.useEmojis,
        },
        // Only memories the user agreed to save are ever sent.
        memories: input.memories.map((m) => m.text),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`The AI server returned an error (${res.status}). Please try again.`);
    }
    const json = (await res.json()) as { reply?: string };
    if (!json.reply || !json.reply.trim()) {
      throw new Error('The AI server sent an empty reply.');
    }
    return json.reply.trim();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('The AI took too long to answer. Please try again.');
    }
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach the AI server. Check your internet connection.");
    }
    throw new Error(errorMessage(e));
  } finally {
    clearTimeout(timer);
  }
}
