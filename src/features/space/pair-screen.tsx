import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { Palette } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useSettingsStore } from '@/features/settings/settings-store';

import { CreateSpaceForm } from './create-space-form';
import { useSpaceStore } from './space-store';

/** Shown instead of the app until this phone is in a space. */
export function PairScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { status, error, pairCode, notice, init, createSpace, joinSpace, confirmCreated } = useSpaceStore();
  const startDate = useSettingsStore((state) => state.startDate);
  const [code, setCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [creating, setCreating] = useState(false);
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
            <PillButton colors={colors} label={strings.pairContinue} onPress={confirmCreated} />
          </>
        ) : status === 'error' ? (
          <>
            <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 15 }}>{error}</Text>
            <PillButton colors={colors} label={strings.pairRetry} onPress={() => run(init)} disabled={busy} />
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairIntro}</Text>

            {creating ? (
              <CreateSpaceForm
                colors={colors}
                initialStartDate={startDate}
                busy={busy}
                onSubmit={(setup, goals) => run(() => createSpace(setup, goals))}
                onBack={() => setCreating(false)}
              />
            ) : (
              <View style={[styles.card, { backgroundColor: colors.page, borderColor: colors.line }]}>
                <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.ink }]}>{strings.pairCreateTitle}</Text>
                <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.pairCreateHint}</Text>
                <PillButton colors={colors} label={strings.pairCreateButton} onPress={() => setCreating(true)} />
              </View>
            )}

            {creating ? null : (
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
              <TextInput
                value={joinName}
                onChangeText={setJoinName}
                maxLength={40}
                placeholder={strings.joinYourName}
                placeholderTextColor={colors.inkSoft}
                accessibilityLabel={strings.joinYourName}
                style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.paper }]}
              />
              <PillButton
                colors={colors}
                label={busy ? strings.pairBusy : strings.pairJoinButton}
                onPress={() => run(() => joinSpace(code, joinName))}
                disabled={busy || code.trim().length === 0 || joinName.trim().length === 0}
              />
            </View>
            )}

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 56, lineHeight: 76, textAlign: 'center', paddingTop: 12 },
  hint: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 40 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  code: { fontSize: 20, lineHeight: 30, textAlign: 'center', borderWidth: 1, borderRadius: 16, padding: 16, letterSpacing: 1, fontVariant: ['tabular-nums'] },
});
