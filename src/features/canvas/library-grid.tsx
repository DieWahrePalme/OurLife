import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { strings } from '@/constants/strings';
import type { PaletteColors } from '@/constants/theme';

import type { LibraryItem, LibraryKind } from './klipy';
import { useLibrary } from './use-library';

const COLUMNS = 3;
const END_REACHED_THRESHOLD = 0.6;

interface LibraryGridProps {
  kind: LibraryKind;
  colors: PaletteColors;
  onPick: (url: string, aspect: number) => void;
}

/** Search box plus a grid of KLIPY stickers or GIFs. */
export function LibraryGrid({ kind, colors, onPick }: LibraryGridProps) {
  const [query, setQuery] = useState('');
  const { items, loading, failed, hasNext, loadMore, retry } = useLibrary(kind, query, true);

  const renderItem = ({ item }: { item: LibraryItem }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.libraryUseLabel(item.title)}
      onPress={() => onPick(item.url, item.aspect)}
      style={[styles.cell, { backgroundColor: colors.page, borderColor: colors.line }]}
    >
      <Image source={{ uri: item.previewUrl }} style={styles.image} contentFit="contain" />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={strings.librarySearchPlaceholder}
        placeholderTextColor={colors.inkSoft}
        accessibilityLabel={strings.librarySearchPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.page }]}
      />
      <FlatList
        key={kind}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReached={hasNext ? loadMore : undefined}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        ListEmptyComponent={
          loading ? null : failed ? (
            <Pressable accessibilityRole="button" onPress={retry}>
              <Text accessibilityLiveRegion="polite" style={{ color: colors.today, textAlign: 'center', fontSize: 14 }}>
                {strings.libraryLoadFailed}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.inkSoft, textAlign: 'center', fontSize: 14 }}>{strings.libraryEmpty}</Text>
          )
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.spinner} color={colors.inkSoft} />
          ) : failed && items.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={loadMore}>
              <Text style={{ color: colors.today, textAlign: 'center', fontSize: 14 }}>{strings.libraryLoadFailed}</Text>
            </Pressable>
          ) : null
        }
      />
      <Text style={[styles.powered, { color: colors.inkSoft }]}>{strings.libraryPowered}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 8, paddingHorizontal: 12 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  list: { gap: 6, paddingBottom: 8 },
  row: { gap: 6 },
  cell: { flex: 1 / COLUMNS, aspectRatio: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 6, maxWidth: '33%' },
  image: { flex: 1 },
  spinner: { paddingVertical: 12 },
  powered: { fontSize: 11, textAlign: 'center', paddingBottom: 6 },
});
