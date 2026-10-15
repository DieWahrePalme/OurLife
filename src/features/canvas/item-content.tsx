import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '@/features/goals/command';
import { useGoalsStore } from '@/features/goals/goals-store';
import { moodFor } from './moods';
import { isKlipyUrl } from './klipy';
import { isCloudPhoto, usePhotoUri } from './photo-cloud';
import type { CanvasItem } from './types';
import { strings } from '@/constants/strings';

const PHOTO_WIDTH = 200;
const TAPE_WIDTH = 120;
const TAPE_HEIGHT = 34;
const STICKER_SIZE = 56;
const IMAGE_STICKER_SIZE = 140;
export const CARD_WIDTH = 210;
export const TEXT_MAX_WIDTH = 260;
/** Handwriting fonts draw their last letter past the measured width; this room keeps it from being cut off. */
const GLYPH_ROOM = 8;
const INK = '#2E2B3A';

/**
 * Everything is drawn at its final size (base size times `zoom`) instead of being stretched with a transform,
 * so text and pictures stay sharp when an item is enlarged.
 */
function makeStyles(zoom: number) {
  const z = (value: number) => value * zoom;
  return StyleSheet.create({
    sticker: { fontSize: z(STICKER_SIZE), lineHeight: z(STICKER_SIZE * 1.25), paddingRight: z(4) },
    tape: { width: z(TAPE_WIDTH), height: z(TAPE_HEIGHT), opacity: 0.8, borderRadius: 2 },
    polaroid: { backgroundColor: '#fff', padding: z(8), paddingBottom: z(22), borderRadius: z(3), shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: z(6), shadowOffset: { width: 0, height: z(3) }, elevation: 3 },
    missing: { alignItems: 'center', justifyContent: 'center', gap: z(6), backgroundColor: '#EFEAE4' },
    missingText: { fontSize: z(12), color: '#6F6A7A', textAlign: 'center', paddingHorizontal: z(8) },
    mood: { flexDirection: 'row', alignItems: 'center', gap: z(8), paddingVertical: z(6), paddingLeft: z(14), paddingRight: z(14), borderRadius: 999 },
    moodFace: { fontSize: z(26) },
    moodLabel: { fontFamily: 'Caveat_700Bold', fontSize: z(26), lineHeight: z(38), color: INK, paddingRight: z(GLYPH_ROOM) },
    goalChip: { flexDirection: 'row', alignItems: 'center', gap: z(8), paddingVertical: z(4), paddingLeft: z(14), paddingRight: z(14), borderRadius: 999, borderWidth: 2, backgroundColor: '#FFFFFF' },
    goalName: { fontFamily: 'Caveat_700Bold', fontSize: z(26), lineHeight: z(36), color: INK, paddingRight: z(GLYPH_ROOM) },
    goalAmount: { fontSize: z(16), fontWeight: '700' },
    card: { backgroundColor: '#FFFFFF', borderWidth: 2, borderRadius: z(12), padding: z(12), gap: z(4) },
    cardTitle: { fontFamily: 'Caveat_700Bold', fontSize: z(28), lineHeight: z(38), paddingRight: z(GLYPH_ROOM) },
    focusText: { fontFamily: 'Caveat_700Bold', fontSize: z(24), lineHeight: z(34), color: INK, paddingRight: z(GLYPH_ROOM) },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: z(10), minHeight: z(44) },
    box: { width: z(22), height: z(22), borderRadius: z(6), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    check: { color: '#fff', fontSize: z(14), fontWeight: '700' },
    taskText: { flex: 1, fontFamily: 'Caveat_700Bold', fontSize: z(22), lineHeight: z(30), color: INK, paddingRight: z(GLYPH_ROOM) },
    taskDone: { textDecorationLine: 'line-through', opacity: 0.55 },
    text: { fontFamily: 'Caveat_700Bold', fontSize: z(30), lineHeight: z(42), paddingRight: z(GLYPH_ROOM) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

interface ItemContentProps {
  item: CanvasItem;
  /** Enlargement of the item; layout is done at this size. */
  zoom: number;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
}

interface PartProps {
  item: CanvasItem;
  zoom: number;
  s: Styles;
}

function GoalChip({ item, s }: PartProps) {
  const goal = useGoalsStore((state) => state.goals.find((g) => g.id === item.content));
  const amount = item.amount ?? 0;
  return (
    <View style={[s.goalChip, { borderColor: item.color }]}>
      <Text style={s.goalName}>{goal ? goal.name : 'Deleted goal'}</Text>
      <Text style={[s.goalAmount, { color: amount < 0 ? '#C0463A' : '#2F9E6F' }]}>
        {formatAmount(amount, goal?.unit ?? '')}
      </Text>
    </View>
  );
}

function PhotoContent({ item, zoom, s }: PartProps) {
  const uri = usePhotoUri(item.content);
  const [failed, setFailed] = useState(false);
  const imageStyle = { width: PHOTO_WIDTH * zoom, aspectRatio: item.aspect ?? 1 };
  // A picture whose file only lives on the other phone (not shared yet) has nothing to show here.
  const missing = failed || (uri === null && !isCloudPhoto(item.content));
  return (
    <View style={s.polaroid}>
      {missing ? (
        <View style={[imageStyle, s.missing]}>
          <Ionicons name="cloud-offline-outline" size={28 * zoom} color="#6F6A7A" />
          <Text style={s.missingText}>{strings.photoNotThereYet}</Text>
        </View>
      ) : (
        <Image
          source={uri ? { uri } : undefined}
          style={imageStyle}
          contentFit="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={strings.photoLabel}
        />
      )}
    </View>
  );
}

/** A sticker or GIF from the library. Only KLIPY's own address is loaded, whatever a synced item says. */
function ImageSticker({ item, zoom }: PartProps) {
  return (
    <Image
      source={isKlipyUrl(item.content) ? { uri: item.content } : undefined}
      style={{ width: IMAGE_STICKER_SIZE * zoom, aspectRatio: item.aspect ?? 1 }}
      contentFit="contain"
      accessibilityLabel={strings.stickerLabel}
    />
  );
}

/** A sticker pasted from the clipboard: a picture in the cloud (or still a file on this phone), no frame. */
function PastedSticker({ item, zoom }: PartProps) {
  const uri = usePhotoUri(item.content);
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={{ width: IMAGE_STICKER_SIZE * zoom, aspectRatio: item.aspect ?? 1 }}
      contentFit="contain"
      accessibilityLabel={strings.stickerLabel}
    />
  );
}

export function ItemContent({ item, zoom, onChange }: ItemContentProps) {
  const s = useMemo(() => makeStyles(zoom), [zoom]);
  const part = { item, zoom, s };
  switch (item.kind) {
    case 'sticker':
      if (isKlipyUrl(item.content)) return <ImageSticker {...part} />;
      if (isCloudPhoto(item.content) || /^(file|data|blob):/i.test(item.content)) return <PastedSticker {...part} />;
      return <Text style={s.sticker}>{item.content}</Text>;
    case 'tape':
      return <View style={[s.tape, { backgroundColor: item.color }]} />;
    case 'photo':
      return <PhotoContent {...part} />;
    case 'goal':
      return <GoalChip {...part} />;
    case 'mood': {
      const mood = moodFor(item.content);
      return (
        <View style={[s.mood, { backgroundColor: mood.color }]}>
          <Text style={s.moodFace}>{mood.face}</Text>
          <Text style={s.moodLabel}>{mood.label}</Text>
        </View>
      );
    }
    case 'focus':
      return (
        <View style={[s.card, { borderColor: item.color, width: (item.width ?? CARD_WIDTH) * zoom }]}>
          <Text style={[s.cardTitle, { color: item.color }]}>{strings.focusTitle}</Text>
          <Text style={s.focusText}>{item.content}</Text>
        </View>
      );
    case 'todo': {
      const tasks = item.tasks ?? [];
      return (
        <View style={[s.card, { borderColor: item.color, width: (item.width ?? CARD_WIDTH) * zoom }]}>
          <Text style={[s.cardTitle, { color: item.color }]}>{strings.todoTitle}</Text>
          {tasks.map((task, index) => (
            <Pressable
              key={`${index}-${task.text}`}
              accessibilityRole="checkbox"
              accessibilityLabel={strings.taskLabel(task.text, task.done)}
              accessibilityState={{ checked: task.done }}
              onPress={() =>
                onChange(item.id, { tasks: tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t)) })
              }
              style={s.taskRow}
            >
              <View style={[s.box, { borderColor: item.color, backgroundColor: task.done ? item.color : 'transparent' }]}>
                {task.done ? <Text style={s.check}>✓</Text> : null}
              </View>
              <Text style={[s.taskText, task.done && s.taskDone]}>{task.text}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    default:
      return (
        <Text style={[s.text, { color: item.color }, item.width ? { width: item.width * zoom } : { maxWidth: TEXT_MAX_WIDTH * zoom }]}>
          {item.content}
        </Text>
      );
  }
}
