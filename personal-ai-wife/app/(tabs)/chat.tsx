import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState';
import { GradientBackground } from '../../src/components/Screen';
import { ChatBubble, TypingIndicator } from '../../src/components/ChatParts';
import { Avatar, Chip, IconButton, InlineError } from '../../src/components/ui';
import { getReply } from '../../src/ai/provider';
import {
  QUICK_REPLIES,
  initiationMessage,
  introMessage,
  resolveLanguage,
} from '../../src/ai/engine';
import { extractMemoryCandidate } from '../../src/ai/memoryExtractor';
import { colors, gradients, radius, spacing } from '../../src/theme';
import type { Message } from '../../src/types';
import { errorMessage, formatDay, isSameDay, sleep, uid } from '../../src/utils';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, addMessage, patchMessage, clearMessages, addMemory } = useApp();
  const { profile, personality, memories, memorySettings, messages, notifications } = data;

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<FlatList<Message>>(null);
  const mounted = useRef(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const retryRef = useRef<{ text: string; history: Message[] } | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // First hello, or she starts the conversation after a long break (if allowed).
  useFocusEffect(
    useCallback(() => {
      const msgs = messagesRef.current;
      const last = msgs[msgs.length - 1];
      let kind: 'intro' | 'initiate' | null = null;
      if (!last) kind = 'intro';
      else if (notifications.initiateInChat && Date.now() - last.ts > SIX_HOURS) kind = 'initiate';
      if (!kind) return;

      setTyping(true);
      let fired = false;
      const timer = setTimeout(() => {
        fired = true;
        const lang = resolveLanguage(profile.language, '', msgs);
        const text =
          kind === 'intro'
            ? introMessage(profile, lang)
            : initiationMessage(profile, lang, new Date().getHours());
        addMessage({ id: uid(), role: 'wife', text, ts: Date.now(), kind: 'text', initiated: true });
        setTyping(false);
      }, 1400);
      return () => {
        clearTimeout(timer);
        if (!fired) setTyping(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifications.initiateInChat, profile.language, profile.userName, profile.wifeName]),
  );

  const requestReply = useCallback(
    async (text: string, history: Message[]) => {
      retryRef.current = { text, history };
      setTyping(true);
      setError(null);
      try {
        const started = Date.now();
        const reply = await getReply({
          text,
          history,
          profile,
          personality,
          memories: memorySettings.enabled ? memories : [],
        });
        const minWait = Math.min(2600, 700 + reply.length * 16);
        await sleep(Math.max(0, minWait - (Date.now() - started)));
        if (!mounted.current) return;
        addMessage({ id: uid(), role: 'wife', text: reply, ts: Date.now(), kind: 'text' });
        retryRef.current = null;
      } catch (e) {
        if (mounted.current) setError(errorMessage(e, "I couldn't answer just now."));
      } finally {
        if (mounted.current) setTyping(false);
      }
    },
    [addMessage, memories, memorySettings.enabled, personality, profile],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;
      const candidate = memorySettings.enabled ? extractMemoryCandidate(text) : null;
      const known =
        candidate && memories.some((m) => m.text.toLowerCase() === candidate.text.toLowerCase());
      const userMsg: Message = {
        id: uid(),
        role: 'user',
        text,
        ts: Date.now(),
        kind: 'text',
        memoryProposal:
          candidate && !known
            ? { text: candidate.text, category: candidate.category, status: 'pending' }
            : undefined,
      };
      addMessage(userMsg);
      setInput('');
      requestReply(text, [...messagesRef.current, userMsg]);
    },
    [addMessage, memories, memorySettings.enabled, requestReply, typing],
  );

  const retry = () => {
    const r = retryRef.current;
    if (r) requestReply(r.text, r.history);
  };

  const confirmClear = () => {
    Alert.alert('Clear chat?', 'This deletes the whole conversation from this phone. Saved memories are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearMessages() },
    ]);
  };

  const saveMemory = (m: Message) => {
    if (!m.memoryProposal) return;
    addMemory(m.memoryProposal.text, m.memoryProposal.category, 'chat');
    patchMessage(m.id, { memoryProposal: { ...m.memoryProposal, status: 'saved' } });
  };

  const dismissMemory = (m: Message) => {
    if (!m.memoryProposal) return;
    patchMessage(m.id, { memoryProposal: { ...m.memoryProposal, status: 'dismissed' } });
  };

  const quickLang = profile.language === 'auto' ? 'english' : profile.language;
  const showQuick = messages.length <= 1 && !typing;

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const showDay = !prev || !isSameDay(prev.ts, item.ts);
    const proposal = item.memoryProposal;
    return (
      <View>
        {showDay ? <Text style={styles.day}>{formatDay(item.ts)}</Text> : null}
        <ChatBubble message={item} />
        {proposal && proposal.status === 'pending' ? (
          <View style={styles.consentCard}>
            <Ionicons name="bookmark" size={16} color={colors.gold} />
            <Text style={styles.consentText}>Remember “{proposal.text}”?</Text>
            <Pressable
              onPress={() => saveMemory(item)}
              accessibilityRole="button"
              accessibilityLabel="Save to memory"
              style={styles.consentYes}
            >
              <Text style={styles.consentYesText}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => dismissMemory(item)}
              accessibilityRole="button"
              accessibilityLabel="Do not save"
              hitSlop={6}
            >
              <Text style={styles.consentNo}>No</Text>
            </Pressable>
          </View>
        ) : null}
        {proposal && proposal.status === 'saved' ? (
          <Text style={styles.savedNote}>Saved to memory</Text>
        ) : null}
      </View>
    );
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Avatar avatarId={profile.avatarId} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.wifeName}</Text>
            <Text style={styles.status}>AI companion · not a real person</Text>
          </View>
          <IconButton icon="mic" label="Open voice messages" onPress={() => router.navigate('/voice')} />
          <IconButton icon="trash-outline" label="Clear chat" onPress={confirmClear} color={colors.textDim} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            <View>
              {typing ? <TypingIndicator name={profile.wifeName} /> : null}
              {error ? <InlineError message={error} onRetry={retry} /> : null}
            </View>
          }
        />

        {showQuick ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_REPLIES[quickLang].map((q) => (
              <Chip key={q} label={q} onPress={() => send(q)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${profile.wifeName}…`}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            maxLength={1000}
            accessibilityLabel="Type a message"
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [{ opacity: !input.trim() || typing ? 0.45 : pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    backgroundColor: 'rgba(7,3,13,0.55)',
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  status: { color: colors.goldSoft, fontSize: 12, marginTop: 2 },
  list: { padding: spacing.lg, paddingBottom: spacing.md },
  day: {
    alignSelf: 'center',
    color: colors.textFaint,
    fontSize: 12,
    marginVertical: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    overflow: 'hidden',
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    maxWidth: '92%',
    marginBottom: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(232,193,112,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,193,112,0.4)',
  },
  consentText: { flexShrink: 1, color: colors.text, fontSize: 13 },
  consentYes: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  consentYesText: { color: colors.bg0, fontWeight: '800', fontSize: 13 },
  consentNo: { color: colors.textDim, fontWeight: '600', fontSize: 13 },
  savedNote: {
    alignSelf: 'flex-end',
    color: colors.gold,
    fontSize: 11,
    marginTop: -6,
    marginBottom: spacing.md,
    marginRight: 6,
  },
  quickRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.glassStrong,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
