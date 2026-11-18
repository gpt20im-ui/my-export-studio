import type { MemoryCategory } from '../types';

export interface MemoryCandidate {
  text: string;
  category: MemoryCategory;
}

function clean(s: string): string {
  return s
    .trim()
    .replace(/\s+(very much|so much|a lot|bahut|बहुत)$/i, '')
    .replace(/[\s,;:]+$/, '')
    .slice(0, 60);
}

const END = '(?:[.!?,]|$)';

interface Rule {
  re: RegExp;
  build: (m: RegExpMatchArray) => MemoryCandidate | null;
}

const RULES: Rule[] = [
  {
    re: new RegExp(`\\bi\\s+(?:don'?t|do not|dont)\\s+like\\s+(.{2,40}?)${END}`, 'i'),
    build: (m) => ({ text: `Dislikes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bi\\s+(?:hate|dislike|can'?t stand|cant stand)\\s+(.{2,40}?)${END}`, 'i'),
    build: (m) => ({ text: `Dislikes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bi\\s+(?:really\\s+)?(?:like|love|enjoy|adore)\\s+(.{2,40}?)${END}`, 'i'),
    build: (m) => ({ text: `Likes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bmy\\s+fav(?:ou?rite)?\\s+([a-z ]{2,20}?)\\s+is\\s+(.{2,40}?)${END}`, 'i'),
    build: (m) => ({ text: `Favourite ${clean(m[1])}: ${clean(m[2])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bmera\\s+fav(?:ou?rite|orite)?\\s+([a-z ]{2,20}?)\\s+(.{2,30}?)\\s+hai${END}`, 'i'),
    build: (m) => ({ text: `Favourite ${clean(m[1])}: ${clean(m[2])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bmujhe\\s+(.{2,40}?)\\s+(?:pasand\\s+nahi|achh?a\\s+nahi\\s+lagta)`, 'i'),
    build: (m) => ({ text: `Dislikes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\bmujhe\\s+(.{2,40}?)\\s+(?:bahut\\s+)?(?:pasand|achh?a\\s+lagta)`, 'i'),
    build: (m) => ({ text: `Likes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: /मुझे\s+(.{2,40}?)\s+(?:बहुत\s+)?(?:पसंद|अच्छा लगता)/u,
    build: (m) => ({ text: `Likes ${clean(m[1])}`, category: 'preference' }),
  },
  {
    re: new RegExp(`\\b(?:my\\s+birthday\\s+is|mera\\s+birthday)\\s+(.{2,30}?)(?:\\s+hai)?${END}`, 'i'),
    build: (m) => ({ text: `Birthday: ${clean(m[1])}`, category: 'fact' }),
  },
  {
    re: new RegExp(`\\bi\\s+(?:work|am working)\\s+(as|at|in)\\s+(.{2,40}?)${END}`, 'i'),
    build: (m) => ({ text: `Works ${m[1].toLowerCase()} ${clean(m[2])}`, category: 'fact' }),
  },
];

/**
 * Looks for a personal detail in what the user wrote and suggests saving it.
 * Nothing is saved automatically: the chat screen asks the user first.
 */
export function extractMemoryCandidate(text: string): MemoryCandidate | null {
  if (text.includes('?')) return null;
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) {
      const c = rule.build(m);
      if (c && c.text.length >= 6) return c;
    }
  }
  return null;
}
