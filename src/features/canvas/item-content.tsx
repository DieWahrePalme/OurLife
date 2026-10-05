import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '@/features/goals/command';
import { useGoalsStore } from '@/features/goals/goals-store';
import { moodFor } from './moods';
import type { CanvasItem } from './types';
import { strings } from '@/constants/strings';

const PHOTO_WIDTH = 200;
const TAPE_WIDTH = 120;
const TAPE_HEIGHT = 34;
const STICKER_SIZE = 56;
const CARD_WIDTH = 210;
const INK = '#2E2B3A';

interface ItemContentProps {
  item: CanvasItem;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
}

function GoalChip({ item }: { item: CanvasItem }) {
  const goal = useGoalsStore((state) => state.goals.find((g) => g.id === item.content));
  const amount = item.amount ?? 0;
  return (
    <View style={[styles.goalChip, { borderColor: item.color }]}>
      <Text style={styles.goalName}>{goal ? goal.name : 'Deleted goal'}</Text>
      <Text style={[styles.goalAmount, { color: amount < 0 ? '#C0463A' : '#2F9E6F' }]}>
        {formatAmount(amount, goal?.unit ?? '')}
      </Text>
    </View>
  );
}

export function ItemContent({ item, onChange }: ItemContentProps) {
  switch (item.kind) {
    case 'sticker':
      return <Text style={styles.sticker}>{item.content}</Text>;
    case 'tape':
      return <View style={[styles.tape, { backgroundColor: item.color }]} />;
    case 'photo':
      return (
        <View style={styles.polaroid}>
          <Image
            source={{ uri: item.content }}
            style={{ width: PHOTO_WIDTH, aspectRatio: item.aspect ?? 1 }}
            contentFit="cover"
            accessibilityLabel={strings.photoLabel}
          />
        </View>
      );
    case 'goal':
      return <GoalChip item={item} />;
    case 'mood': {
      const mood = moodFor(item.content);
      return (
        <View style={[styles.mood, { backgroundColor: mood.color }]}>
          <Text style={styles.moodFace}>{mood.face}</Text>
          <Text style={styles.moodLabel}>{mood.label}</Text>
        </View>
      );
    }
    case 'focus':
      return (
        <View style={[styles.card, { borderColor: item.color }]}>
          <Text style={[styles.cardTitle, { color: item.color }]}>{strings.focusTitle}</Text>
          <Text style={styles.focusText}>{item.content}</Text>
        </View>
      );
    case 'todo': {
      const tasks = item.tasks ?? [];
      return (
        <View style={[styles.card, { borderColor: item.color }]}>
          <Text style={[styles.cardTitle, { color: item.color }]}>{strings.todoTitle}</Text>
          {tasks.map((task, index) => (
            <Pressable
              key={`${index}-${task.text}`}
              accessibilityRole="checkbox"
              accessibilityLabel={strings.taskLabel(task.text, task.done)}
              accessibilityState={{ checked: task.done }}
              onPress={() =>
                onChange(item.id, { tasks: tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t)) })
              }
              style={styles.taskRow}
            >
              <View style={[styles.box, { borderColor: item.color, backgroundColor: task.done ? item.color : 'transparent' }]}>
                {task.done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={[styles.taskText, task.done && styles.taskDone]}>{task.text}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    default:
      return <Text style={[styles.text, { color: item.color }]}>{item.content}</Text>;
  }
}

const styles = StyleSheet.create({
  sticker: { fontSize: STICKER_SIZE },
  text: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42, maxWidth: 260 },
  tape: { width: TAPE_WIDTH, height: TAPE_HEIGHT, opacity: 0.8, borderRadius: 2 },
  polaroid: { backgroundColor: '#fff', padding: 8, paddingBottom: 22, borderRadius: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  mood: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  moodFace: { fontSize: 26 },
  moodLabel: { fontFamily: 'Caveat_700Bold', fontSize: 26, lineHeight: 38, color: INK },
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, backgroundColor: '#FFFFFF' },
  goalName: { fontFamily: 'Caveat_700Bold', fontSize: 26, lineHeight: 36, color: INK },
  goalAmount: { fontSize: 16, fontWeight: '700' },
  card: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderWidth: 2, borderRadius: 12, padding: 12, gap: 4 },
  cardTitle: { fontFamily: 'Caveat_700Bold', fontSize: 28, lineHeight: 38 },
  focusText: { fontFamily: 'Caveat_700Bold', fontSize: 24, lineHeight: 34, color: INK },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#fff', fontSize: 14, fontWeight: '700' },
  taskText: { flex: 1, fontFamily: 'Caveat_700Bold', fontSize: 22, lineHeight: 30, color: INK },
  taskDone: { textDecorationLine: 'line-through', opacity: 0.55 },
});
