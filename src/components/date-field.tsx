import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { formatDay, parseIsoDate } from '@/lib/dates';

interface DateFieldProps {
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (next: string) => void;
  colors: PaletteColors;
  accessibilityLabel: string;
}

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDate(iso: string): Date {
  if (!ISO_PATTERN.test(iso)) return new Date();
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** A date picked from a calendar: the browser's own date input on the web, the system picker on a phone. */
export function DateField({ value, onChange, colors, accessibilityLabel }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const boxStyle = [styles.box, { borderColor: colors.line, backgroundColor: colors.page }];

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      'aria-label': accessibilityLabel,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      style: {
        minHeight: 48,
        boxSizing: 'border-box',
        width: '100%',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.line,
        borderRadius: 12,
        padding: '0 14px',
        fontSize: 16,
        color: colors.ink,
        backgroundColor: colors.page,
        fontFamily: 'inherit',
      },
    });
  }

  return (
    <View style={styles.native}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => setOpen((current) => !current)} style={boxStyle}>
        <Text style={[styles.text, { color: colors.ink }]}>{ISO_PATTERN.test(value) ? formatDay(parseIsoDate(value), true) : value}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          accentColor={colors.dotPast}
          onChange={(event, picked) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && picked) onChange(toIso(picked));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  native: { gap: 8 },
  box: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  text: { fontSize: 16 },
});
