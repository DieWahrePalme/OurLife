import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface CodeActionsProps {
  code: string;
  colors: PaletteColors;
}

const COPIED_MS = 2000;

/** Copy and share buttons for the pairing code, so it does not have to be typed or selected by hand. */
export function CodeActions({ code, colors }: CodeActionsProps) {
  const [copied, setCopied] = useState(false);
  const canShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };
  const share = async () => {
    const message = strings.shareCodeMessage(code);
    if (Platform.OS === 'web') await navigator.share({ text: message }).catch(() => undefined);
    else await Share.share({ message }).catch(() => undefined);
  };

  return (
    <View style={styles.row}>
      <View style={styles.button}>
        <PillButton colors={colors} label={copied ? strings.codeCopied : strings.codeCopy} onPress={copy} />
      </View>
      {canShare ? (
        <View style={styles.button}>
          <PillButton colors={colors} label={strings.codeShare} onPress={share} />
        </View>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={styles.hidden}>
        {copied ? strings.codeCopied : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
