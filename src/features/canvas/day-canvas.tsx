import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { CanvasItemView } from './canvas-item';
import { isCloudPhoto } from './photo-cloud';
import { pasteClipboardImage, pickPhoto } from './photos';
import { MoodSheet } from './mood-sheet';
import { DrawBar } from './draw-bar';
import { DrawLayer } from './draw-layer';
import { buildDrawing, encodeDrawing, MAX_DRAWING_CHARS, STROKE_WIDTHS, type Point, type StrokeWidthKey } from './drawing';
import { TemplateSheet } from './template-sheet';
import { itemsFromTemplate } from './templates';
import { FirstPageTips } from './first-page-tips';
import { useTipsStore } from './tips-store';
import { Paper } from './paper';
import { sharePage } from './share-page';
import { DeletedWhileEditing } from './deleted-while-editing';
import { StickerSheet } from './sticker-sheet';
import { TextModal, type TextStyleChoice } from './text-modal';
import { Toolbar } from './toolbar';
import { UndoBar } from './undo-bar';
import { RoundButton } from './round-button';
import { ZoomControls } from './zoom-controls';
import { useCanvasView } from './use-canvas-view';
import { useTwoFingerTarget } from './use-two-finger';
import { boundsOf, estimateSize, findFreeSpot, itemContains, type Size } from './layout';
import { PAGE_HEIGHT, PAGE_WIDTH } from './page-size';
import { useDayItems } from './use-day-items';
import { usePhotoResync } from './use-photo-resync';
import { useUndoDelete } from './use-undo-delete';
import { MAX_CAPTION, MIN_SCALE, penInk, type CanvasItem, type Task } from './types';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { commandText, isGoalCommand, parseGoalCommand } from '@/features/goals/command';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useSkin } from '@/lib/use-theme';
import { useSeenStore } from '@/features/days/seen-store';
import { useGoalsStore } from '@/features/goals/goals-store';

interface DayCanvasProps {
  dayNumber: number;
  /** True for today: the empty page then asks about today, not about "this day". */
  isToday: boolean;
  colors: PaletteColors;
  /** Where the page sits sideways while turning: 0 in place, -1 / 1 one page width to the left / right. */
  slide: SharedValue<number>;
  /** Called once, when the saved copy of the page is drawn and the page has its size. */
  onReady?: () => void;
  /** A sideways swipe on the background (page turn): 1 = next page, -1 = the one before. */
  onSwipe: (direction: 1 | -1) => void;
}

const PAGE_PADDING = 12;
const PAGE_RADIUS = 14;
/** The strip under the page: status text on the left, zoom buttons on the right. Always there, so nothing jumps. */
const STRIP_HEIGHT = 44;
const DUPLICATE_OFFSET = 18;
/** How long a new item pulses so it is easy to find. */
const HIGHLIGHT_MS = 900;
/** How long the padlocks stay visible after a drag on a locked item. */
const PADLOCK_SHOWN_MS = 3000;
/** A swipe this soon after a drag started on a locked item does not turn the page. */
const LOCKED_TOUCH_MS = 900;
/** Time for the selection frame to disappear before the picture is taken. */
const SHARE_SETTLE_MS = 160;
const FLASH_MS = 3000;
/** Wait this long after a second tap before picking what is under the item (a double tap edits instead). */
const TAP_BELOW_DELAY_MS = 320;
const FADE_IN_MS = 160;
const EDIT_KINDS: readonly CanvasItem['kind'][] = ['text', 'todo', 'focus', 'goal', 'photo'];
const RECOLOR_KINDS: readonly CanvasItem['kind'][] = ['text', 'tape', 'todo', 'focus', 'goal'];

/** One line of a drawing while it is being made: page coordinates. */
interface PageStroke {
  color: string;
  width: number;
  points: readonly Point[];
}
/** Space between an item's frame and what is inside it (page pixels). */
const ITEM_FRAME_PADDING = 6;

type EditableKind = 'text' | 'todo' | 'focus';
type Editor = { mode: 'new'; kind: EditableKind } | { mode: 'edit'; id: string; snapshot: CanvasItem };

function tasksFromText(text: string, previous: readonly Task[] = []): Task[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line, done: previous.some((t) => t.text === line && t.done) }));
}

/** A picture file is shared by one item only: a copy would lose its file when the original is deleted. */
function canDuplicate(item: CanvasItem): boolean {
  if (item.kind === 'photo') return false;
  return !(item.kind === 'sticker' && (isCloudPhoto(item.content) || /^(file|data|blob):/i.test(item.content)));
}

/** Only what differs from the plain handwriting is saved, so older pages and old phones see nothing new. */
function styleFields(style: TextStyleChoice): Pick<CanvasItem, 'font' | 'textSize' | 'mark'> {
  return {
    font: style.font === 'hand' ? undefined : style.font,
    textSize: style.textSize === 'm' ? undefined : style.textSize,
    mark: style.mark ? true : undefined,
  };
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function DayCanvas({ dayNumber, isToday, colors, slide, onReady, onSwipe }: DayCanvasProps) {
  const { items, canEdit, localReady, error, add, addMany, addSilently, removeSilently, update, updateSilently, remove, restore, bringToFront, sendToBack, undo, redo, canUndo, canRedo } = useDayItems(dayNumber);
  const { deleted, deleteItem, undo: undoBar } = useUndoDelete(items, remove, restore);
  const photoSync = usePhotoResync(items, canEdit, updateSilently);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sizeOf = useCallback((item: CanvasItem): Size => sizes.current.get(item.id) ?? estimateSize(item), []);
  const onMeasured = useCallback((id: string, width: number, height: number) => {
    sizes.current.set(id, { w: width, h: height });
  }, []);

  const latestItems = useRef(items);
  useEffect(() => {
    latestItems.current = items;
  }, [items]);
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const selected = items.find((it) => it.id === selectedId && it.locked !== true) ?? null;
  const twoFingers = useTwoFingerTarget(selected?.id ?? '');
  /** A drag that starts on a locked item: it shakes, says it is locked, and its padlock shows for a moment. */
  const [shake, setShake] = useState({ id: '', tick: 0 });
  const [padlocksShown, setPadlocksShown] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const padlockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** A short message in the strip under the page. */
  const flash = useCallback((text: string) => {
    setNote(text);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setNote(null), FLASH_MS);
  }, []);
  const onBackgroundDrag = useCallback(
    (pageX: number, pageY: number) => {
      const locked = [...items].reverse().find((it) => it.locked === true && itemContains(it, sizeOf(it), { x: pageX, y: pageY }));
      if (!locked) return;
      lockedTouch.current = true;
      setTimeout(() => {
        lockedTouch.current = false;
      }, LOCKED_TOUCH_MS);
      setShake((previous) => ({ id: locked.id, tick: previous.tick + 1 }));
      setPadlocksShown(true);
      setNote(strings.lockedNote);
      clearTimeout(padlockTimer.current);
      padlockTimer.current = setTimeout(() => {
        setPadlocksShown(false);
        setNote(null);
      }, PADLOCK_SHOWN_MS);
    },
    [items, sizeOf],
  );
  /** A swipe that began on a locked item is the item's "no", not a page turn. */
  const lockedTouch = useRef(false);
  const turnPage = useCallback(
    (direction: 1 | -1) => {
      if (lockedTouch.current) return;
      setSelectedId(null);
      onSwipe(direction);
    },
    [onSwipe],
  );
  const { viewportRef, view } = useCanvasView({
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    padding: PAGE_PADDING,
    bottomRoom: 0,
    onBackgroundTap: clearSelection,
    onBackgroundDrag,
    target: twoFingers,
    onSwipe: turnPage,
  });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: `${slide.value * 100}%` }] }));

  const sheetRef = useRef<View>(null);
  /** The page as a picture. Nothing is selected while it is taken, so no frames or handles are in it. */
  const shareAsPicture = async () => {
    setSelectedId(null);
    await new Promise((resolve) => setTimeout(resolve, SHARE_SETTLE_MS));
    try {
      const result = await sharePage(sheetRef, dayNumber);
      if (result === 'saved') flash(strings.sharePageSaved);
      else if (result === 'unavailable') flash(strings.sharePageFailed);
    } catch {
      flash(strings.sharePageFailed);
    }
  };

  // What is on this page counts as seen (also what the other phone adds while the page is open).
  const markSeen = useSeenStore((state) => state.markSeen);
  useEffect(() => {
    if (canEdit) markSeen(dayNumber, items.map((it) => it.id));
  }, [canEdit, items, dayNumber, markSeen]);

  const tipsLoaded = useTipsStore((state) => state.loaded);
  const tipsSeen = useTipsStore((state) => state.seen);
  const dismissTips = useTipsStore((state) => state.dismiss);

  // Drawing with a finger. The strokes of one go are one drawing item that grows while the person draws; Done makes it
  // one step of undo.
  const [pen, setPen] = useState<{ color: string; widthKey: StrokeWidthKey } | null>(null);
  const [session, setSession] = useState<{ id: string; strokes: readonly PageStroke[] } | null>(null);

  const drawingItem = (id: string, strokes: readonly PageStroke[]): CanvasItem | null => {
    const built = buildDrawing(strokes);
    if (!built) return null;
    return {
      id,
      kind: 'drawing',
      x: built.left - ITEM_FRAME_PADDING,
      y: built.top - ITEM_FRAME_PADDING,
      scale: 1,
      rotation: 0,
      color: strokes[0].color,
      content: encodeDrawing(built.data),
      aspect: built.data.w / built.data.h,
    };
  };
  const startSession = (strokes: readonly PageStroke[]) => {
    const id = newId();
    const item = drawingItem(id, strokes);
    if (!item) return;
    addSilently(item);
    setSession({ id, strokes });
  };
  /** Makes the drawing one step of undo and starts the next one fresh. */
  const finishSession = () => {
    if (!session) return;
    const item = latestItems.current.find((it) => it.id === session.id);
    if (item) {
      removeSilently(session.id);
      add(item);
    }
    setSession(null);
  };
  const addStroke = (points: Point[]) => {
    if (!pen) return;
    const stroke: PageStroke = { color: pen.color, width: STROKE_WIDTHS[pen.widthKey], points };
    if (!session) return startSession([stroke]);
    const strokes = [...session.strokes, stroke];
    const item = drawingItem(session.id, strokes);
    if (!item) return;
    if (item.content.length > MAX_DRAWING_CHARS) {
      finishSession();
      flash(strings.drawContinued);
      startSession([stroke]);
      return;
    }
    updateSilently(session.id, { x: item.x, y: item.y, content: item.content, aspect: item.aspect, color: item.color });
    setSession({ id: session.id, strokes });
  };
  const undoStroke = () => {
    if (!session) return;
    const strokes = session.strokes.slice(0, -1);
    const item = strokes.length > 0 ? drawingItem(session.id, strokes) : null;
    if (!item) {
      removeSilently(session.id);
      setSession(null);
      return;
    }
    updateSilently(session.id, { x: item.x, y: item.y, content: item.content, aspect: item.aspect, color: item.color });
    setSession({ id: session.id, strokes });
  };
  const stopDrawing = () => {
    finishSession();
    setPen(null);
  };
  const toPage = (screenX: number, screenY: number): Point => {
    const s = view.scale.value > 0 ? view.scale.value : 1;
    return { x: (screenX - view.tx.value) / s, y: (screenY - view.ty.value) / s };
  };

  const reported = useRef(false);
  useEffect(() => {
    if (reported.current || !localReady || !view.ready) return;
    reported.current = true;
    onReady?.();
  }, [localReady, view.ready, onReady]);
  const { visibleRegion, pageFromWindow, zoomFactor } = view;
  const sizes = useRef(new Map<string, Size>());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const belowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(highlightTimer.current);
      clearTimeout(belowTimer.current);
      clearTimeout(padlockTimer.current);
      clearTimeout(flashTimer.current);
    },
    [],
  );  const skin = useSkin();
  const penColor = useSettingsStore((state) => state.penColor);
  const goals = useGoalsStore((state) => state.goals);
  const loadGoals = useGoalsStore((state) => state.load);
  const [editor, setEditor] = useState<Editor | null>(null);
  /** Text written for an item that was deleted on another phone meanwhile: the person decides what happens to it. */
  const [lastStyle, setLastStyle] = useState<TextStyleChoice | null>(null);
  const [orphan, setOrphan] = useState<{ snapshot: CanvasItem; text: string } | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const status = ((): { text: string; isProblem: boolean } | null => {
    if (note) return { text: note, isProblem: false };
    if (error) return { text: error, isProblem: true };
    if (photoError) return { text: photoError, isProblem: true };
    if (photoSync.failure !== null) return { text: strings.photoNotShared(photoSync.failure), isProblem: true };
    if (photoSync.sharing > 0) return { text: strings.photoSharing, isProblem: false };
    return null;
  })();

  const spawn = useCallback(
    (
      partial: Pick<CanvasItem, 'kind' | 'content' | 'color' | 'aspect' | 'tasks' | 'amount'> &
        Partial<Pick<CanvasItem, 'id' | 'font' | 'textSize' | 'mark' | 'pattern'>>,
    ) => {
      const size = estimateSize(partial);
      // Zoomed in to work on a detail: the new item gets smaller on the page so it looks normal size on screen.
      const scale = Math.min(1, Math.max(MIN_SCALE, 1 / zoomFactor()));
      const drawn = { w: size.w * scale, h: size.h * scale };
      // The emptiest place on screen; a full page gets the item below the last one.
      const spot = findFreeSpot(
        items.map((it) => boundsOf(it, sizeOf(it))),
        drawn,
        visibleRegion(),
        { w: PAGE_WIDTH, h: PAGE_HEIGHT },
      );
      // x / y are the corner of the box at scale 1; a smaller item shrinks towards its middle.
      const x = spot.x - (size.w - drawn.w) / 2;
      const y = spot.y - (size.h - drawn.h) / 2;
      const item: CanvasItem = { id: newId(), x, y, scale, rotation: 0, ...partial };
      add(item);
      setSelectedId(item.id);
      setHighlightId(item.id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    },
    [add, items, sizeOf, visibleRegion, zoomFactor],
  );

  /** Shown at once from the local copy; `usePhotoResync` sends it to the cloud and swaps in the shared copy. */
  const addPhoto = async () => {
    setPhotoError(null);
    try {
      const id = newId();
      const photo = await pickPhoto(id);
      if (!photo) return;
      spawn({ id, kind: 'photo', content: photo.uri, color: penColor, aspect: photo.aspect });
    } catch {
      setPhotoError(strings.photoFailed);
    }
  };

  /** A cut-out subject from Photos: kept as a sticker and shared like a photo. */
  const pasteSticker = async (): Promise<string | null> => {
    try {
      const id = newId();
      const image = await pasteClipboardImage(id);
      if (!image) return strings.pasteEmpty;
      spawn({ id, kind: 'sticker', content: image.uri, color: penColor, aspect: image.aspect });
      setStickerOpen(false);
      return null;
    } catch {
      return strings.pasteFailed;
    }
  };

  const lockSelected = () => {
    if (!selected) return;
    update(selected.id, { locked: true });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected || !canDuplicate(selected)) return;
    const copy: CanvasItem = { ...selected, id: newId(), x: selected.x + DUPLICATE_OFFSET, y: selected.y + DUPLICATE_OFFSET, locked: false };
    add(copy);
    setSelectedId(copy.id);
  };

  const editedItem = editor?.mode === 'edit' ? (items.find((it) => it.id === editor.id) ?? null) : null;
  const isCaption = editedItem?.kind === 'photo';
  const editorKind: EditableKind | null = editor ? (editor.mode === 'new' ? editor.kind : (editedItem?.kind as EditableKind | undefined) ?? null) : null;

  /** The edited text goes back on the page as a new item (a goal line becomes plain text). */
  const addOrphanAsNew = () => {
    if (!orphan) return;
    const { snapshot, text } = orphan;
    const kind = snapshot.kind === 'todo' || snapshot.kind === 'focus' ? snapshot.kind : 'text';
    if (kind === 'todo') spawn({ kind, content: '', color: snapshot.color, tasks: tasksFromText(text) });
    else spawn({ kind, content: text, color: snapshot.color });
    setOrphan(null);
  };

  /** Returns an error message to show in the editor, or null when saved. */
  const saveText = (text: string, style: TextStyleChoice): string | null => {
    if (editor?.mode === 'edit' && editedItem?.kind === 'photo') {
      update(editedItem.id, { caption: text.trim() === '' ? undefined : text.trim().slice(0, MAX_CAPTION) });
      setEditor(null);
      return null;
    }
    setLastStyle(style);
    if (editor?.mode === 'edit' && !editedItem) {
      setOrphan({ snapshot: editor.snapshot, text });
      setEditor(null);
      return null;
    }
    if (isGoalCommand(text) && editor && (editor.mode === 'new' ? editor.kind === 'text' : editedItem?.kind === 'text' || editedItem?.kind === 'goal')) {
      const result = parseGoalCommand(text, goals);
      if (!result.ok) return result.error;
      const patch = { kind: 'goal' as const, content: result.goal.id, amount: result.amount };
      if (editor.mode === 'new') spawn({ ...patch, color: style.color });
      else if (editedItem) update(editedItem.id, patch);
      setEditor(null);
      return null;
    }
    if (editor?.mode === 'new') {
      if (editor.kind === 'todo') spawn({ kind: 'todo', content: '', color: style.color, tasks: tasksFromText(text) });
      else if (editor.kind === 'focus') spawn({ kind: 'focus', content: text, color: style.color });
      else spawn({ kind: 'text', content: text, color: style.color, ...styleFields(style) });
    } else if (editedItem) {
      if (editedItem.kind === 'todo') update(editedItem.id, { tasks: tasksFromText(text, editedItem.tasks), color: style.color });
      else if (editedItem.kind === 'goal') return 'Write it like /goal car +50';
      else if (editedItem.kind === 'focus') update(editedItem.id, { content: text, color: style.color });
      else update(editedItem.id, { content: text, color: style.color, ...styleFields(style) });
    }
    setEditor(null);
    return null;
  };

  /** What the dialog starts with: the item's own style, or the style last used. */
  const editingStyle: TextStyleChoice = editedItem
    ? { font: editedItem.font ?? 'hand', textSize: editedItem.textSize ?? 'm', mark: editedItem.mark === true, color: editedItem.color }
    : (lastStyle ?? { font: 'hand', textSize: 'm', mark: false, color: penColor });

  const editedGoal = editedItem?.kind === 'goal' ? goals.find((g) => g.id === editedItem.content) : undefined;
  const editingText = editedGoal && editedItem ? commandText(editedGoal, editedItem.amount ?? 0) : editedItem?.kind === 'todo' ? (editedItem.tasks ?? []).map((t) => t.text).join('\n') : editedItem?.kind === 'photo' ? (editedItem.caption ?? '') : (editedItem?.content ?? '');

  const removeItem = useCallback(
    (id: string) => {
      deleteItem(id);
      setSelectedId((current) => (current === id ? null : current));
    },
    [deleteItem],
  );

  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const onEdit = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- the editor setter is stable; the compiler cannot tell here
    (id: string) => {
      clearTimeout(belowTimer.current);
      const snapshot = latestItems.current.find((it) => it.id === id);
      if (snapshot) setEditor({ mode: 'edit', id, snapshot });
    },
    [],
  );
  /** A tap on an item selects it; tapping the selected item again picks what lies under it at that spot. */
  const onTap = useCallback(
    (id: string, screenX: number, screenY: number) => {
      if (id !== selectedId) {
        setSelectedId(id);
        return;
      }
      clearTimeout(belowTimer.current);
      belowTimer.current = setTimeout(() => {
        pageFromWindow(screenX, screenY).then((point) => {
          const index = items.findIndex((it) => it.id === id);
          const under = [...items.slice(0, index).reverse(), ...items.slice(index + 1).reverse()].find(
            (it) => it.locked !== true && itemContains(it, sizeOf(it), point),
          );
          if (under) setSelectedId(under.id);
        });
      }, TAP_BELOW_DELAY_MS);
    },
    [selectedId, items, pageFromWindow, sizeOf],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <View ref={viewportRef} collapsable={false} style={styles.viewport} onLayout={view.onViewportLayout}>
        {view.ready ? (
          <>
            <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, slideStyle]}>
            {/* Behind the page: touches that miss every item land here (zoom, move the view, deselect). */}
            <GestureDetector gesture={view.gesture}>
              <View collapsable={false} style={StyleSheet.absoluteFill} />
            </GestureDetector>
            <Animated.View
              entering={FadeIn.duration(FADE_IN_MS)}
              pointerEvents="box-none"
              style={[styles.layer, { width: PAGE_WIDTH * view.renderScale, height: PAGE_HEIGHT * view.renderScale }, view.layerStyle]}
            >
              <Paper
                edition={skin.edition}
                colors={colors}
                width={PAGE_WIDTH * view.renderScale}
                height={PAGE_HEIGHT * view.renderScale}
                scale={view.renderScale}
                radius={PAGE_RADIUS * view.renderScale}
                pageLabel={strings.pageNumber(dayNumber)}
                sheetRef={sheetRef}
              >
                {items.length === 0 && canEdit ? (
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.emptyHint]}>
                    <Text style={[styles.emptyHintText, { color: colors.sheetInkSoft, fontFamily: colors.fontDisplay, fontSize: 32 * view.renderScale, lineHeight: 44 * view.renderScale }]}>{isToday ? strings.emptyDayHint : strings.emptyPastDayHint}</Text>
                  </View>
                ) : null}
                {items.map((item) => (
                  <CanvasItemView
                    key={item.id}
                    item={item}
                    canvasScale={view.scale}
                    renderScale={view.renderScale}
                    selected={item.id === selectedId}
                    highlight={item.id === highlightId}
                    twoFingers={twoFingers}
                    showPadlock={padlocksShown || selectedId !== null}
                    shakeTick={item.id === shake.id ? shake.tick : 0}
                    onSelect={onSelect}
                    onTap={onTap}
                    onMeasured={onMeasured}
                    onEdit={onEdit}
                    onChange={update}
                    onRemove={removeItem}
                  />
                ))}
              </Paper>
            </Animated.View>
            </Animated.View>
          </>
        ) : null}
        {pen && view.ready ? <DrawLayer color={penInk(pen.color)} previewWidth={STROKE_WIDTHS[pen.widthKey] * view.renderScale} toPage={toPage} onStroke={addStroke} /> : null}
        {items.length === 0 && canEdit && !pen && !view.isZoomed && view.ready ? (
          <Pressable accessibilityRole="button" onPress={() => setTemplatesOpen(true)} style={[styles.templateButton, { backgroundColor: colors.page, borderColor: colors.line }]}>
            <Text style={[styles.templateText, { color: colors.ink }]}>{strings.templatesButton}</Text>
          </Pressable>
        ) : null}
        {tipsLoaded && !tipsSeen && canEdit && view.ready ? <FirstPageTips colors={colors} onDismiss={dismissTips} /> : null}
        {deleted ? <UndoBar colors={colors} onUndo={undoBar} /> : null}
      </View>
      <View style={styles.strip}>
        <RoundButton icon="arrow-undo-outline" label={strings.historyUndo} colors={colors} onPress={undo} disabled={!canUndo} />
        <RoundButton icon="arrow-redo-outline" label={strings.historyRedo} colors={colors} onPress={redo} disabled={!canRedo} />
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={2}
          style={[styles.status, { color: status?.isProblem ? colors.danger : colors.inkSoft }]}
        >
          {status?.text ?? ''}
        </Text>
        <RoundButton
          icon={pen ? 'checkmark' : 'pencil-outline'}
          label={pen ? strings.drawDone : strings.drawLabel}
          colors={colors}
          onPress={() => {
            if (pen) stopDrawing();
            else {
              setSelectedId(null);
              setPen({ color: penColor, widthKey: 'medium' });
            }
          }}
        />
        <RoundButton icon="share-outline" label={strings.sharePageLabel} colors={colors} onPress={shareAsPicture} />
        {view.ready ? <ZoomControls colors={colors} zoomed={view.isZoomed} onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onFit={view.zoomFit} /> : null}
      </View>
      {/* Always there, so the page does not change size when the page has loaded. */}
      <View pointerEvents={canEdit ? 'auto' : 'none'} style={styles.toolbarWrap}>
      <Toolbar
        colors={colors}
        selectedColor={selected?.color ?? null}
        canRecolor={selected !== null && RECOLOR_KINDS.includes(selected.kind)}
        canDuplicate={selected !== null && canDuplicate(selected)}
        canEditText={selected !== null && EDIT_KINDS.includes(selected.kind)}
        onEdit={() => selected && onEdit(selected.id)}
        onAddText={() => setEditor({ mode: 'new', kind: 'text' })}
        onAddTodo={() => setEditor({ mode: 'new', kind: 'todo' })}
        onAddFocus={() => setEditor({ mode: 'new', kind: 'focus' })}
        onAddMood={() => setMoodOpen(true)}
        onAddSticker={() => setStickerOpen(true)}
        onAddPhoto={addPhoto}
        onAddTape={(roll) => spawn({ kind: 'tape', content: '', color: roll.color, pattern: roll.pattern === 'plain' ? undefined : roll.pattern })}
        onPickColor={(color) => selected && update(selected.id, { color })}
        onToFront={() => selected && bringToFront(selected.id)}
        onToBack={() => selected && sendToBack(selected.id)}
        onLock={lockSelected}
        onDuplicate={duplicateSelected}
      />
      {pen ? (
        <DrawBar
          colors={colors}
          color={pen.color}
          widthKey={pen.widthKey}
          canUndo={session !== null}
          onColor={(color) => setPen({ ...pen, color })}
          onWidth={(widthKey) => setPen({ ...pen, widthKey })}
          onUndo={undoStroke}
          onDone={stopDrawing}
        />
      ) : null}
      </View>
      <TextModal
        key={editor ? (editor.mode === 'edit' ? editor.id : `new-${editor.kind}`) : 'closed'}
        visible={editor !== null}
        initialText={editingText}
        initialStyle={editingStyle}
        styled={editorKind === 'text'}
        colorChoice={!isCaption}
        allowEmpty={isCaption}
        maxLength={isCaption ? MAX_CAPTION : undefined}
        placeholder={isCaption ? strings.captionPlaceholder : editorKind === 'todo' ? strings.todoPlaceholder : editorKind === 'focus' ? strings.focusPlaceholder : strings.textPlaceholder}
        colors={colors}
        goalNames={goals.map((g) => g.name)}
        notice={editor?.mode === 'edit' && !editedItem ? strings.deletedElsewhere : null}
        onSave={saveText}
        onCancel={() => setEditor(null)}
      />
      <DeletedWhileEditing text={orphan?.text ?? null} colors={colors} onAddAsNew={addOrphanAsNew} onDiscard={() => setOrphan(null)} />
      <MoodSheet
        visible={moodOpen}
        colors={colors}
        onClose={() => setMoodOpen(false)}
        onPick={(key) => {
          spawn({ kind: 'mood', content: key, color: penColor });
          setMoodOpen(false);
        }}
      />
      <TemplateSheet
        visible={templatesOpen}
        colors={colors}
        onClose={() => setTemplatesOpen(false)}
        onPick={(template) => {
          addMany(itemsFromTemplate(template, penColor, newId));
          setTemplatesOpen(false);
        }}
      />
      <StickerSheet
        visible={stickerOpen}
        colors={colors}
        onClose={() => setStickerOpen(false)}
        onPaste={pasteSticker}
        onPick={(content, aspect) => {
          spawn({ kind: 'sticker', content, color: penColor, aspect });
          setStickerOpen(false);
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  viewport: { flex: 1, overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' },
  templateButton: { position: 'absolute', bottom: 16, alignSelf: 'center', minHeight: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  templateText: { fontSize: 15, fontWeight: '700' },
  toolbarWrap: { position: 'relative' },
  strip: { height: STRIP_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: PAGE_PADDING, paddingRight: 8 },
  status: { flex: 1, fontSize: 12, lineHeight: 15 },
  emptyHint: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyHintText: { fontFamily: 'Caveat_700Bold', textAlign: 'center' },
});
