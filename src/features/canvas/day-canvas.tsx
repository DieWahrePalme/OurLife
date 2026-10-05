import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CanvasItemView } from './canvas-item';
import { pickPhoto } from './photos';
import { StickerSheet } from './sticker-sheet';
import { TextModal } from './text-modal';
import { Toolbar } from './toolbar';
import { useDayItems } from './use-day-items';
import { DEFAULT_PEN_COLOR, PEN_COLORS, type CanvasItem } from './types';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface DayCanvasProps {
  dayNumber: number;
  colors: PaletteColors;
}

const TAPE_COLORS = [PEN_COLORS[1], PEN_COLORS[2], PEN_COLORS[4], PEN_COLORS[5]] as const;
const SPAWN_SPREAD = 60;

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function DayCanvas({ dayNumber, colors }: DayCanvasProps) {
  const { items, error, add, update, remove, bringToFront } = useDayItems(dayNumber);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [textTarget, setTextTarget] = useState<string | 'new' | null>(null);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const selected = items.find((it) => it.id === selectedId) ?? null;

  const spawn = useCallback(
    (partial: Pick<CanvasItem, 'kind' | 'content' | 'color' | 'aspect'>) => {
      const jitter = () => (Math.random() - 0.5) * SPAWN_SPREAD;
      const item: CanvasItem = {
        id: newId(),
        x: Math.max(pageSize.width / 2 - 60 + jitter(), 8),
        y: Math.max(pageSize.height / 3 + jitter(), 8),
        scale: 1,
        rotation: 0,
        ...partial,
      };
      add(item);
      setSelectedId(item.id);
    },
    [add, pageSize],
  );

  const addPhoto = async () => {
    setPhotoError(null);
    try {
      const id = newId();
      const photo = await pickPhoto(id);
      if (photo) spawn({ kind: 'photo', content: photo.uri, color: DEFAULT_PEN_COLOR, aspect: photo.aspect });
    } catch {
      setPhotoError(strings.photoFailed);
    }
  };

  const saveText = (text: string) => {
    if (textTarget === 'new') spawn({ kind: 'text', content: text, color: DEFAULT_PEN_COLOR });
    else if (textTarget) update(textTarget, { content: text });
    setTextTarget(null);
  };

  const editingText = textTarget && textTarget !== 'new' ? (items.find((it) => it.id === textTarget)?.content ?? '') : '';

  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const onEdit = useCallback((id: string) => setTextTarget(id), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.pageWrap}>
        <Pressable
          accessibilityLabel="Page"
          onPress={() => setSelectedId(null)}
          onLayout={(e) => setPageSize(e.nativeEvent.layout)}
          style={[styles.page, { backgroundColor: colors.page, borderColor: colors.line }]}
        >
          {items.map((item) => (
            <CanvasItemView
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onChange={update}
            />
          ))}
        </Pressable>
        {error ?? photoError ? (
          <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.today }]}>
            {error ?? photoError}
          </Text>
        ) : null}
      </View>
      <Toolbar
        colors={colors}
        selectedColor={selected?.color ?? null}
        canRecolor={selected?.kind === 'text' || selected?.kind === 'tape'}
        onAddText={() => setTextTarget('new')}
        onAddSticker={() => setStickerOpen(true)}
        onAddPhoto={addPhoto}
        onAddTape={() => spawn({ kind: 'tape', content: '', color: TAPE_COLORS[Math.floor(Math.random() * TAPE_COLORS.length)] })}
        onPickColor={(color) => selected && update(selected.id, { color })}
        onToFront={() => selected && bringToFront(selected.id)}
        onDelete={() => {
          if (!selected) return;
          remove(selected.id);
          setSelectedId(null);
        }}
      />
      <TextModal
        visible={textTarget !== null}
        initialText={editingText}
        colors={colors}
        onSave={saveText}
        onCancel={() => setTextTarget(null)}
      />
      <StickerSheet
        visible={stickerOpen}
        colors={colors}
        onClose={() => setStickerOpen(false)}
        onPick={(glyph) => {
          spawn({ kind: 'sticker', content: glyph, color: DEFAULT_PEN_COLOR });
          setStickerOpen(false);
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  pageWrap: { flex: 1, padding: 12 },
  page: { flex: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden', maxWidth: 560, width: '100%', alignSelf: 'center' },
  error: { textAlign: 'center', paddingTop: 6, fontSize: 13 },
});
