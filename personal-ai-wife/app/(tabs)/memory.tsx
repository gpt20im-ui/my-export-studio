import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppState';
import { Screen } from '../../src/components/Screen';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  GlassCard,
  Header,
  SectionLabel,
  SettingRow,
} from '../../src/components/ui';
import { colors, radius, spacing, type IconName } from '../../src/theme';
import type { MemoryCategory } from '../../src/types';
import { formatDay } from '../../src/utils';

const CATEGORIES: { id: MemoryCategory; label: string; icon: IconName }[] = [
  { id: 'preference', label: 'Preference', icon: 'heart' },
  { id: 'fact', label: 'Fact', icon: 'information-circle' },
  { id: 'moment', label: 'Moment', icon: 'sparkles' },
];

export default function MemoryScreen() {
  const { data, setMemoryEnabled, addMemory, deleteMemory, clearMemories } = useApp();
  const { memories, memorySettings, profile } = data;

  const [text, setText] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preference');
  const [note, setNote] = useState<string | null>(null);

  const add = () => {
    const clean = text.trim();
    if (clean.length < 3) {
      setNote('Please write at least a few letters.');
      return;
    }
    const item = addMemory(clean, category, 'manual');
    if (!item) {
      setNote('She already remembers that.');
      return;
    }
    setText('');
    setNote(null);
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Forget this?', `"${label}" will be removed from her memory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Forget', style: 'destructive', onPress: () => deleteMemory(id) },
    ]);
  };

  const confirmClear = () => {
    Alert.alert('Forget everything?', 'All saved memories will be deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Forget all', style: 'destructive', onPress: () => clearMemories() },
    ]);
  };

  const iconFor = (c: MemoryCategory): IconName => CATEGORIES.find((x) => x.id === c)?.icon ?? 'bookmark';

  return (
    <Screen scroll tab>
      <Header title="Memory" subtitle={`What ${profile.wifeName} remembers about you`} />

      <GlassCard>
        <SettingRow
          icon="bookmarks"
          title="Let her remember things"
          subtitle={
            memorySettings.enabled
              ? 'She will ask before saving anything'
              : 'Off: nothing new is suggested or used'
          }
          value={memorySettings.enabled}
          onValueChange={setMemoryEnabled}
        />
        <Body style={{ fontSize: 12, lineHeight: 18, marginTop: spacing.sm }}>
          Memories stay on your phone. In chat she may suggest saving something you said, and nothing is
          saved unless you tap Save.
        </Body>
      </GlassCard>

      <SectionLabel>Add a memory yourself</SectionLabel>
      <GlassCard>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setNote(null);
          }}
          placeholder="e.g. Likes masala chai in the evening"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={80}
          accessibilityLabel="New memory"
        />
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} icon={c.icon} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        <Button label="Save memory" icon="add" onPress={add} style={{ marginTop: spacing.md }} />
      </GlassCard>

      <SectionLabel>{`Saved memories (${memories.length})`}</SectionLabel>
      {memories.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="bookmarks-outline"
            title="Nothing saved yet"
            text="Tell her something like “I love chai” in the chat, or add a memory above."
          />
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ paddingVertical: spacing.sm }}>
            {memories.map((m, i) => (
              <View key={m.id} style={[styles.item, i > 0 && styles.itemBorder]}>
                <View style={styles.itemIcon}>
                  <Ionicons name={iconFor(m.category)} size={16} color={colors.pinkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>{m.text}</Text>
                  <Text style={styles.itemMeta}>
                    {formatDay(m.createdAt)} · {m.source === 'chat' ? 'from chat' : 'added by you'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmDelete(m.id, m.text)}
                  accessibilityRole="button"
                  accessibilityLabel={`Forget ${m.text}`}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </GlassCard>
          <Button label="Forget everything" variant="danger" icon="trash-outline" onPress={confirmClear} style={{ marginTop: spacing.md }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    color: colors.text,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  note: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,93,158,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  itemMeta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
});
