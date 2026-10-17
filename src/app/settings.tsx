import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { useColors, useSkin } from '@/lib/use-theme';
import { SkinPicker } from '@/features/settings/skin-picker';
import { strings } from '@/constants/strings';
import { PEN_COLORS } from '@/features/canvas/types';
import { SpaceSection } from '@/features/space/space-section';
import { useSpaceStore } from '@/features/space/space-store';
import { APPEARANCES, isValidStartDate, useSettingsStore, type Appearance } from '@/features/settings/settings-store';

const APPEARANCE_LABEL: Readonly<Record<Appearance, string>> = {
  system: strings.appearanceSystem,
  light: strings.appearanceLight,
  dark: strings.appearanceDark,
};

export default function SettingsScreen() {
  const colors = useColors();
  const skin = useSkin();
  const { penColor, startDate, appearance, update } = useSettingsStore();
  const inSpace = useSpaceStore((state) => state.status === 'ready');
  const [draftDate, setDraftDate] = useState(startDate);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const saveDate = async () => {
    if (!isValidStartDate(draftDate)) {
      setMessage({ text: strings.settingsStartInvalid, isError: true });
      return;
    }
    await update({ startDate: draftDate });
    setMessage({ text: strings.settingsStartSaved, isError: false });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: colors.fontDisplay }]}>{strings.settingsSkinTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsSkinHint}</Text>
      <SkinPicker colors={colors} selected={skin.id} onSelect={(id) => update({ skin: id })} />

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink, fontFamily: colors.fontDisplay }]}>{strings.settingsAppearanceTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{skin.followsAppearance ? strings.settingsAppearanceHint : strings.appearanceFixedHint}</Text>
      {skin.followsAppearance ? (
        <View style={styles.segments} accessibilityRole="radiogroup">
        {APPEARANCES.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: option === appearance }}
            onPress={() => update({ appearance: option })}
            style={[styles.segment, { borderColor: colors.line, backgroundColor: option === appearance ? colors.dotPast : colors.page }]}
          >
            <Text style={{ color: option === appearance ? colors.onAccent : colors.ink, fontWeight: '600' }}>{APPEARANCE_LABEL[option]}</Text>
          </Pressable>
        ))}
        </View>
      ) : null}

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink, fontFamily: colors.fontDisplay }]}>{strings.settingsColorTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsColorHint}</Text>
      <View style={styles.swatches}>
        {PEN_COLORS.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={strings.colorLabel(color)}
            accessibilityState={{ selected: color === penColor }}
            onPress={() => update({ penColor: color })}
            style={styles.swatchHit}
          >
            <View style={[styles.swatch, { backgroundColor: color, borderColor: color === penColor ? colors.ink : 'transparent' }]} />
          </Pressable>
        ))}
      </View>

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink, fontFamily: colors.fontDisplay }]}>{strings.settingsStartTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsStartHint}</Text>
      <DateField
        value={draftDate}
        onChange={(next) => {
          setDraftDate(next);
          setMessage(null);
        }}
        colors={colors}
        accessibilityLabel={strings.settingsStartTitle}
      />
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: message.isError ? colors.danger : colors.inkSoft, fontSize: 14 }}>
          {message.text}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={saveDate} style={[styles.button, { backgroundColor: colors.dotPast }]}>
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{strings.settingsStartSave}</Text>
      </Pressable>

      {inSpace ? <SpaceSection colors={colors} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42 },
  spaced: { marginTop: 24 },
  hint: { fontSize: 14 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap' },
  swatchHit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  code: { paddingVertical: 12, lineHeight: 24 },
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
