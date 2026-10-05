import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { PEN_COLORS } from '@/features/canvas/types';
import { isValidStartDate, useSettingsStore } from '@/features/settings/settings-store';

export default function SettingsScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { penColor, startDate, update } = useSettingsStore();
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
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{strings.settingsColorTitle}</Text>
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

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink }]}>{strings.settingsStartTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsStartHint}</Text>
      <TextInput
        value={draftDate}
        onChangeText={(text) => {
          setDraftDate(text);
          setMessage(null);
        }}
        autoCapitalize="none"
        accessibilityLabel={strings.settingsStartTitle}
        style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.page }]}
      />
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: message.isError ? colors.today : colors.inkSoft, fontSize: 14 }}>
          {message.text}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={saveDate} style={[styles.button, { backgroundColor: colors.dotPast }]}>
        <Text style={styles.buttonText}>{strings.settingsStartSave}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42 },
  spaced: { marginTop: 24 },
  hint: { fontSize: 14 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap' },
  swatchHit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
