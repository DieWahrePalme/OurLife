import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CanvasItemView } from './canvas-item';
import { pickPhoto } from './photos';
import { MoodSheet } from './mood-sheet';
import { StickerSheet } from './sticker-sheet';
import { TextModal } from './text-modal';
import { Toolbar } from './toolbar';
import { useDayItems } from './use-day-items';
import { PEN_COLORS, type CanvasItem, type Task } from './types';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { commandText, isGoalCommand, parseGoalCommand } from '@/features/goals/command';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useGoalsStore } from '@/features/goals/goals-store';

interface DayCanvasProps {
  dayNumber: number;
  colors: PaletteColors;
}

const TAPE_COLORS = [PEN_COLORS[1], PEN_COLORS[2], PEN_COLORS[4], PEN_COLORS[5]] as const;
const SPAWN_SPREAD = 60;
const SPAWN_ROWS = 6;
const SPAWN_ROW_HEIGHT = 90;
/** A tap on an item also reaches the page underneath (on web); ignore that page tap. */
const SELECT_GRACE_MS = 300;
const RECOLOR_KINDS: readonly CanvasItem['kind'][] = ['text', 'tape', 'todo', 'focus', 'goal'];

type EditableKind = 'text' | 'todo' | 'focus';
type Editor = { mode: 'new'; kind: EditableKind } | { mode: 'edit'; id: string };

function tasksFromText(text: string, previous: readonly Task[] = []): Task[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line, done: previous.some((t) => t.text === line && t.done) }));
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function DayCanvas({ dayNumber, colors }: DayCanvasProps) {
  const { items, canEdit, error, add, update, remove, bringToFront } = useDayItems(dayNumber);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastSelectAt = useRef(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const penColor = useSettingsStore((state) => state.penColor);
  const goals = useGoalsStore((state) => state.goals);
  const loadGoals = useGoalsStore((state) => state.load);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const selected = items.find((it) => it.id === selectedId) ?? null;

  const spawn = useCallback(
    (partial: Pick<CanvasItem, 'kind' | 'content' | 'color' | 'aspect' | 'tasks' | 'amount'>) => {
      const jitter = () => (Math.random() - 0.5) * SPAWN_SPREAD;
      const item: CanvasItem = {
        id: newId(),
        x: Math.max(pageSize.width / 2 - 60 + jitter(), 8),
        y: Math.max(pageSize.height / 8 + (items.length % SPAWN_ROWS) * SPAWN_ROW_HEIGHT + jitter() / 3, 8),
        scale: 1,
        rotation: 0,
        ...partial,
      };
      add(item);
      setSelectedId(item.id);
    },
    [add, pageSize, items.length],
  );

  const addPhoto = async () => {
    setPhotoError(null);
    try {
      const id = newId();
      const photo = await pickPhoto(id);
      if (photo) spawn({ kind: 'photo', content: photo.uri, color: penColor, aspect: photo.aspect });
    } catch {
      setPhotoError(strings.photoFailed);
    }
  };

  const editedItem = editor?.mode === 'edit' ? (items.find((it) => it.id === editor.id) ?? null) : null;
  const editorKind: EditableKind | null = editor ? (editor.mode === 'new' ? editor.kind : (editedItem?.kind as EditableKind | undefined) ?? null) : null;

  /** Returns an error message to show in the editor, or null when saved. */
  const saveText = (text: string): string | null => {
    if (isGoalCommand(text) && editor && (editor.mode === 'new' ? editor.kind === 'text' : editedItem?.kind === 'text' || editedItem?.kind === 'goal')) {
      const result = parseGoalCommand(text, goals);
      if (!result.ok) return result.error;
      const patch = { kind: 'goal' as const, content: result.goal.id, amount: result.amount };
      if (editor.mode === 'new') spawn({ ...patch, color: penColor });
      else if (editedItem) update(editedItem.id, patch);
      setEditor(null);
      return null;
    }
    if (editor?.mode === 'new') {
      if (editor.kind === 'todo') spawn({ kind: 'todo', content: '', color: penColor, tasks: tasksFromText(text) });
      else spawn({ kind: editor.kind, content: text, color: penColor });
    } else if (editedItem) {
      if (editedItem.kind === 'todo') update(editedItem.id, { tasks: tasksFromText(text, editedItem.tasks) });
      else if (editedItem.kind === 'goal') return 'Write it like /goal car +50';
      else update(editedItem.id, { content: text });
    }
    setEditor(null);
    return null;
  };

  const editedGoal = editedItem?.kind === 'goal' ? goals.find((g) => g.id === editedItem.content) : undefined;
  const editingText = editedGoal && editedItem ? commandText(editedGoal, editedItem.amount ?? 0) : editedItem?.kind === 'todo' ? (editedItem.tasks ?? []).map((t) => t.text).join('\n') : (editedItem?.content ?? '');

  const removeItem = useCallback(
    (id: string) => {
      remove(id);
      setSelectedId((current) => (current === id ? null : current));
    },
    [remove],
  );

  const onSelect = useCallback((id: string) => {
    lastSelectAt.current = Date.now();
    setSelectedId(id);
  }, []);
  const onEdit = useCallback((id: string) => setEditor({ mode: 'edit', id }), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.pageWrap}>
        <Pressable
          accessible={false}
          onPress={() => {
            if (Date.now() - lastSelectAt.current > SELECT_GRACE_MS) setSelectedId(null);
          }}
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
              onRemove={removeItem}
            />
          ))}
        </Pressable>
        {error ?? photoError ? (
          <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.today }]}>
            {error ?? photoError}
          </Text>
        ) : null}
      </View>
      {canEdit ? (
      <Toolbar
        colors={colors}
        selectedColor={selected?.color ?? null}
        canRecolor={selected !== null && RECOLOR_KINDS.includes(selected.kind)}
        onAddText={() => setEditor({ mode: 'new', kind: 'text' })}
        onAddTodo={() => setEditor({ mode: 'new', kind: 'todo' })}
        onAddFocus={() => setEditor({ mode: 'new', kind: 'focus' })}
        onAddMood={() => setMoodOpen(true)}
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
      ) : null}
      <TextModal
        key={editor ? (editor.mode === 'edit' ? editor.id : `new-${editor.kind}`) : 'closed'}
        visible={editor !== null}
        initialText={editingText}
        placeholder={editorKind === 'todo' ? strings.todoPlaceholder : editorKind === 'focus' ? strings.focusPlaceholder : strings.textPlaceholder}
        colors={colors}
        goalNames={goals.map((g) => g.name)}
        onSave={saveText}
        onCancel={() => setEditor(null)}
      />
      <MoodSheet
        visible={moodOpen}
        colors={colors}
        onClose={() => setMoodOpen(false)}
        onPick={(key) => {
          spawn({ kind: 'mood', content: key, color: penColor });
          setMoodOpen(false);
        }}
      />
      <StickerSheet
        visible={stickerOpen}
        colors={colors}
        onClose={() => setStickerOpen(false)}
        onPick={(glyph) => {
          spawn({ kind: 'sticker', content: glyph, color: penColor });
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
