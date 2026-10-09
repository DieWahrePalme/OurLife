import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette, type PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useSettingsStore } from '@/features/settings/settings-store';
import { formatDay, parseIsoDate } from '@/lib/dates';

import { useSpaceStore } from './space-store';

/** Shown instead of the app until this phone is in a space. */
export function PairScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { status, error, pairCode, notice, init, createSpace, joinSpace, confirmCreated } = useSpaceStore();
  const startDate = useSettingsStore((state) => state.startDate);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    await action();
    setBusy(false);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {status === 'created' ? strings.pairCreatedTitle : strings.pairTitle}
        </Text>

        {status === 'created' ? (
          <>
            <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairCreatedHint}</Text>
            <Text selectable accessibilityLabel={`Code ${pairCode}`} style={[styles.code, { color: colors.ink, backgroundColor: colors.page, borderColor: colors.line }]}>
              {pairCode}
            </Text>
            {notice ? <Text style={{ color: colors.today, fontSize: 14 }}>{notice}</Text> : null}
            <Button colors={colors} label={strings.pairContinue} onPress={confirmCreated} />
          </>
        ) : status === 'error' ? (
          <>
            <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 15 }}>{error}</Text>
            <Button colors={colors} label={strings.pairRetry} onPress={() => run(init)} disabled={busy} />
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairIntro}</Text>

            <View style={[styles.card, { backgroundColor: colors.page, borderColor: colors.line }]}>
              <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.ink }]}>{strings.pairCreateTitle}</Text>
              <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairCreateHint(formatDay(parseIsoDate(startDate)))}</Text>
              <Button colors={colors} label={busy ? strings.pairBusy : strings.pairCreateButton} onPress={() => run(() => createSpace(startDate))} disabled={busy} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.page, borderColor: colors.line }]}>
              <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.ink }]}>{strings.pairJoinTitle}</Text>
              <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairJoinHint}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={strings.pairJoinPlaceholder}
                placeholderTextColor={colors.inkSoft}
                accessibilityLabel={strings.pairJoinPlaceholder}
                style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.paper }]}
              />
              <Button colors={colors} label={busy ? strings.pairBusy : strings.pairJoinButton} onPress={() => run(() => joinSpace(code))} disabled={busy || code.trim().length === 0} />
            </View>

            {error ? (
              <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 14 }}>
                {error}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ButtonProps {
  colors: PaletteColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function Button({ colors, label, onPress, disabled = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.dotPast, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 56, lineHeight: 76, textAlign: 'center', paddingTop: 12 },
  hint: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 40 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  code: { fontSize: 20, lineHeight: 30, textAlign: 'center', borderWidth: 1, borderRadius: 16, padding: 16, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
