import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { isGoalCommand } from '@/features/goals/command';
import { PenSwatch } from './pen-swatch';
import {
  FONT_FAMILY,
  FONT_LABEL,
  FONT_LINE_HEIGHT,
  HIGHLIGHT_COLOR,
  PEN_COLORS,
  SIZE_PIXELS,
  TEXT_FONTS,
  TEXT_SIZES,
  penInk,
  type TextFont,
  type TextSize,
} from './types';

/** How a text is written: what the dialog lets you choose and shows live. */
export interface TextStyleChoice {
  font: TextFont;
  textSize: TextSize;
  mark: boolean;
  color: string;
}

interface TextModalProps {
  visible: boolean;
  initialText: string;
  initialStyle: TextStyleChoice;
  /** Offer font, size and highlighter (text items only; to-do and focus keep their handwriting). */
  styled: boolean;
  placeholder: string;
  colors: PaletteColors;
  /** Goal names offered while typing a /goal command. */
  goalNames: readonly string[];
  /** False for a caption: no pen colours. */
  colorChoice?: boolean;
  /** True when saving an empty text is fine (clears a caption). */
  allowEmpty?: boolean;
  /** Longest text, or no limit. */
  maxLength?: number;
  /** A note shown above the text (for example: the item was deleted on another phone). */
  notice?: string | null;
  /** Returns an error message to show, or null when saved. */
  onSave: (text: string, style: TextStyleChoice) => string | null;
  onCancel: () => void;
}

const SIZE_LABEL: Readonly<Record<TextSize, string>> = { s: 'Small', m: 'Medium', l: 'Large' };
/** The writing field shows the text a little smaller than on the page when the page text is big. */
const PREVIEW_MAX_PIXELS = 38;

export function TextModal({ visible, initialText, initialStyle, styled, placeholder, colors, goalNames, colorChoice = true, allowEmpty = false, maxLength, notice = null, onSave, onCancel }: TextModalProps) {
  const [text, setText] = useState(initialText);
  const [style, setStyle] = useState(initialStyle);
  const [error, setError] = useState<string | null>(null);

  const canSave = allowEmpty || text.trim().length > 0;
  const ink = penInk(style.color);
  const pixels = Math.min(SIZE_PIXELS[style.textSize], PREVIEW_MAX_PIXELS);

  // A phone's browser scrolls the window to the keyboard; after the dialog closes the page must be back at the top.
  useEffect(() => {
    if (!visible && Platform.OS === 'web') window.scrollTo(0, 0);
  }, [visible]);

  const suggestions = useMemo(() => {
    if (!isGoalCommand(text)) return [];
    const typed = text.trim().replace(/^\/goal\s*/i, '');
    if (/\d/.test(typed)) return [];
    return goalNames.filter((name) => name.toLowerCase().includes(typed.trim().toLowerCase()));
  }, [text, goalNames]);

  const chip = (selected: boolean) => [styles.chip, { borderColor: selected ? colors.dotPast : colors.line, backgroundColor: selected ? colors.dotPast : colors.sheet }];
  const chipText = (selected: boolean) => ({ color: selected ? colors.onAccent : '#2E2B3A' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={[styles.paper, { backgroundColor: colors.sheet, borderColor: colors.line }]}>
            {notice ? (
              <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.danger }]}>
                {notice}
              </Text>
            ) : null}
            <TextInput
              autoFocus
              multiline={maxLength === undefined}
              maxLength={maxLength}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.sheetInkSoft}
              style={[
                styles.input,
                {
                  color: ink,
                  fontFamily: styled ? FONT_FAMILY[style.font] : FONT_FAMILY.hand,
                  fontSize: styled ? pixels : SIZE_PIXELS.m,
                  lineHeight: (styled ? pixels : SIZE_PIXELS.m) * (styled ? FONT_LINE_HEIGHT[style.font] : FONT_LINE_HEIGHT.hand),
                  borderColor: colors.line,
                },
                styled && style.mark ? { backgroundColor: HIGHLIGHT_COLOR } : null,
              ]}
              accessibilityLabel={placeholder}
            />
            {suggestions.length > 0 ? (
              <View style={styles.row}>
                {suggestions.map((name) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={strings.goalSuggestionLabel(name)}
                    onPress={() => setText(`/goal ${name} `)}
                    style={[styles.chip, { borderColor: colors.dotPast, backgroundColor: colors.sheet }]}
                  >
                    <Text style={[styles.chipText, { color: colors.dotPast }]}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {styled ? (
              <>
                <View style={styles.row} accessibilityRole="radiogroup">
                  {TEXT_FONTS.map((font) => (
                    <Pressable
                      key={font}
                      accessibilityRole="radio"
                      accessibilityLabel={FONT_LABEL[font]}
                      accessibilityState={{ selected: style.font === font }}
                      onPress={() => setStyle({ ...style, font })}
                      style={chip(style.font === font)}
                    >
                      <Text style={[styles.chipText, chipText(style.font === font), { fontFamily: FONT_FAMILY[font] }]}>{FONT_LABEL[font]}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.row} accessibilityRole="radiogroup">
                  {TEXT_SIZES.map((size) => (
                    <Pressable
                      key={size}
                      accessibilityRole="radio"
                      accessibilityLabel={SIZE_LABEL[size]}
                      accessibilityState={{ selected: style.textSize === size }}
                      onPress={() => setStyle({ ...style, textSize: size })}
                      style={chip(style.textSize === size)}
                    >
                      <Text style={[chipText(style.textSize === size), { fontSize: 12 + TEXT_SIZES.indexOf(size) * 5, fontWeight: '700' }]}>A</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={strings.highlightLabel}
                    accessibilityState={{ checked: style.mark }}
                    onPress={() => setStyle({ ...style, mark: !style.mark })}
                    style={chip(style.mark)}
                  >
                    <Text style={[styles.chipText, chipText(style.mark)]}>{strings.highlightLabel}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {colorChoice ? (
            <View style={styles.row}>
              {PEN_COLORS.map((color) => (
                <PenSwatch key={color} color={color} label={strings.colorLabel(color)} selected={penInk(style.color) === color} onPress={() => setStyle({ ...style, color })} />
              ))}
            </View>
            ) : null}

            {error ? (
              <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}>
                <Text style={[styles.buttonText, { color: colors.sheetInkSoft }]}>{strings.textCancel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                onPress={() => setError(onSave(text.trim(), style))}
                style={[styles.button, { backgroundColor: colors.dotPast, opacity: canSave ? 1 : 0.4 }]}
              >
                <Text style={[styles.buttonText, { color: colors.onAccent }]}>{strings.textSave}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  scroll: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 72, paddingHorizontal: 16, paddingBottom: 24 },
  paper: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  input: { minHeight: 120, borderBottomWidth: 1, paddingHorizontal: 4, paddingTop: 6, paddingBottom: 10, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, fontWeight: '600' },
  notice: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
