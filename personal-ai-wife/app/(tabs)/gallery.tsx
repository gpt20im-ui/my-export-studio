import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState';
import { GradientBackground } from '../../src/components/Screen';
import { Button, Chip, EmptyState, Header, IconButton, InlineError } from '../../src/components/ui';
import { colors, radius, spacing, type IconName } from '../../src/theme';
import type { GalleryItem } from '../../src/types';
import { errorMessage, pick, sleep, uid } from '../../src/utils';

type Mood = 'romantic' | 'cozy' | 'playful' | 'cosmic';

const MOODS: { id: Mood; label: string; icon: IconName; palettes: [string, string][]; titles: string[] }[] = [
  {
    id: 'romantic',
    label: 'Romantic',
    icon: 'heart',
    palettes: [['#FF5D9E', '#7C3AED'], ['#FF9CC6', '#B83AD6'], ['#E8C170', '#FF5D9E']],
    titles: ['Love Letter Sky', 'Midnight Roses', 'Held Hands'],
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: 'cafe',
    palettes: [['#F5C16B', '#FF5D7A'], ['#8A4FFF', '#E8C170'], ['#3B1470', '#F5C16B']],
    titles: ['Blanket and Chai', 'Lamp Light Evening', 'Warm Window'],
  },
  {
    id: 'playful',
    label: 'Playful',
    icon: 'balloon',
    palettes: [['#47C7E8', '#FF5D9E'], ['#FFB86B', '#B83AD6'], ['#6EE7B7', '#7C3AED']],
    titles: ['Confetti Afternoon', 'Dance in the Kitchen', 'Silly Selfie Day'],
  },
  {
    id: 'cosmic',
    label: 'Cosmic',
    icon: 'planet',
    palettes: [['#120824', '#7C3AED'], ['#07030D', '#47C7E8'], ['#241040', '#FF5D9E']],
    titles: ['Orbit of Two', 'Nebula Dreams', 'Moon Garden'],
  },
];

const GAP = spacing.md;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / 2);
  const { data, addGalleryItem, toggleFavorite, deleteGalleryItem } = useApp();
  const { gallery, profile } = data;

  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [mood, setMood] = useState<Mood>('romantic');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = filter === 'favorites' ? gallery.filter((g) => g.favorite) : gallery;
  const current = selected ? gallery.find((g) => g.id === selected.id) ?? null : null;

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await sleep(1600); // stands in for a real image-generation call
      const m = MOODS.find((x) => x.id === mood) ?? MOODS[0];
      const note = prompt.trim();
      addGalleryItem({
        id: uid(),
        kind: 'art',
        title: note ? note.slice(0, 28) : pick(m.titles),
        caption: `Imagined by ${profile.wifeName} · ${m.label} mood · prototype art`,
        colors: pick(m.palettes),
        icon: m.icon,
        favorite: false,
        createdAt: Date.now(),
      });
      setCreating(false);
      setPrompt('');
    } catch (e) {
      setError(errorMessage(e, 'Could not create the picture.'));
    } finally {
      setGenerating(false);
    }
  };

  const addFromPhone = async () => {
    setError(null);
    setPicking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (res.canceled || res.assets.length === 0) return;
      const asset = res.assets[0];
      addGalleryItem({
        id: uid(),
        kind: 'photo',
        title: 'My photo',
        caption: 'Added from your phone',
        colors: ['#3B1470', '#FF5D9E'],
        icon: 'image',
        uri: asset.uri,
        favorite: false,
        createdAt: Date.now(),
      });
    } catch (e) {
      setError(errorMessage(e, 'Could not open your photos.'));
    } finally {
      setPicking(false);
    }
  };

  const renderTile = ({ item }: { item: GalleryItem }) => (
    <Pressable
      onPress={() => setSelected(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      style={({ pressed }) => [styles.tile, { width: tileWidth, height: Math.round(tileWidth / 0.85) }, pressed && { opacity: 0.85 }]}
    >
      <Cover item={item} size={44} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.tileShade}>
        <Text style={styles.tileTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </LinearGradient>
      {item.favorite ? (
        <View style={styles.heartBadge}>
          <Ionicons name="heart" size={14} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <GradientBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Header title="Gallery" subtitle="Moments, imagined and real" />
          <View style={styles.actions}>
            <Button label="Create art" icon="sparkles" onPress={() => { setError(null); setCreating(true); }} style={{ flex: 1 }} />
            <Button label="Add photo" icon="image" variant="ghost" loading={picking} onPress={addFromPhone} style={{ flex: 1 }} />
          </View>
          <View style={styles.filters}>
            <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Favourites" icon="heart" selected={filter === 'favorites'} onPress={() => setFilter('favorites')} />
          </View>
          {error && !creating ? <View style={{ marginBottom: spacing.md }}><InlineError message={error} /></View> : null}
        </View>

        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          numColumns={2}
          renderItem={renderTile}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: GAP }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={filter === 'favorites' ? 'heart-outline' : 'images-outline'}
              title={filter === 'favorites' ? 'No favourites yet' : 'Your gallery is empty'}
              text={filter === 'favorites' ? 'Open a picture and tap the heart to keep it here.' : 'Create art or add a photo from your phone.'}
            />
          }
        />
      </View>

      {/* Full-screen viewer */}
      <Modal visible={current !== null} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          {current ? (
            <View style={[styles.viewer, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
              <View style={styles.viewerTop}>
                <IconButton icon="close" label="Close" onPress={() => setSelected(null)} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <IconButton
                    icon={current.favorite ? 'heart' : 'heart-outline'}
                    label={current.favorite ? 'Remove from favourites' : 'Add to favourites'}
                    onPress={() => toggleFavorite(current.id)}
                    color={current.favorite ? colors.pink : colors.text}
                  />
                  <IconButton
                    icon="trash-outline"
                    label="Delete picture"
                    color={colors.danger}
                    onPress={() => {
                      deleteGalleryItem(current.id);
                      setSelected(null);
                    }}
                  />
                </View>
              </View>
              <View style={styles.viewerImage}>
                <Cover item={current} size={96} />
              </View>
              <Text style={styles.viewerTitle}>{current.title}</Text>
              <Text style={styles.viewerCaption}>{current.caption}</Text>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Create sheet */}
      <Modal visible={creating} animationType="slide" transparent onRequestClose={() => !generating && setCreating(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create art</Text>
              <IconButton icon="close" label="Close" onPress={() => !generating && setCreating(false)} />
            </View>
            <Text style={styles.sheetLabel}>Mood</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => (
                <Chip key={m.id} label={m.label} icon={m.icon} selected={mood === m.id} onPress={() => setMood(m.id)} />
              ))}
            </View>
            <Text style={styles.sheetLabel}>Title (optional)</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. Our first sunset"
              placeholderTextColor={colors.textFaint}
              style={styles.sheetInput}
              maxLength={40}
              editable={!generating}
              accessibilityLabel="Picture title"
            />
            <Text style={styles.sheetNote}>
              Prototype: this makes a styled artwork card on your phone. Real AI image generation can be
              connected later through your own backend.
            </Text>
            {error ? <InlineError message={error} /> : null}
            <Button
              label={generating ? 'Creating…' : 'Create'}
              icon="sparkles"
              loading={generating}
              onPress={generate}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

function Cover({ item, size }: { item: GalleryItem; size: number }) {
  if (item.kind === 'photo' && item.uri) {
    return <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={item.title} />;
  }
  return (
    <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.cover]}>
      <Ionicons name={item.icon as IconName} size={size} color="rgba(255,255,255,0.88)" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  filters: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  tile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  cover: { alignItems: 'center', justifyContent: 'center' },
  tileShade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, paddingTop: 28 },
  tileTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  heartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,3,13,0.96)' },
  viewer: { flex: 1, paddingHorizontal: spacing.lg },
  viewerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  viewerImage: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  viewerTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.lg },
  viewerCaption: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1A0B2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sheetLabel: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetInput: {
    color: colors.text,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheetNote: { color: colors.textFaint, fontSize: 12, lineHeight: 18, marginVertical: spacing.md },
});
