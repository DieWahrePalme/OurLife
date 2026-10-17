import { Pressable, StyleSheet, Text } from 'react-native';

import { strings } from '@/constants/strings';

interface NewThingsNoteProps {
  total: number;
  day: number;
  /** On how many days. */
  days: number;
  onPress: () => void;
}

/** A yellow sticky note on Home: something was added on another phone since the last visit. Tap to open that day. */
export function NewThingsNote({ total, day, days, onPress }: NewThingsNoteProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={strings.newThings(total, day, days)} onPress={onPress} style={styles.note}>
      <Text style={styles.text}>{strings.newThings(total, day, days)}</Text>
      <Text style={styles.open}>{strings.newThingsOpen}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    alignSelf: 'center',
    minHeight: 48,
    maxWidth: 360,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#FFE98A',
    borderRadius: 3,
    transform: [{ rotate: '-1.2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },
  text: { fontSize: 16, fontWeight: '700', color: '#3A3320', textAlign: 'center' },
  open: { fontSize: 12, color: '#5C5230' },
});
