import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import type { Edition } from '@/constants/skins';
import { titleSize, type PaletteColors } from '@/constants/theme';

interface BookCoverProps {
  edition: Edition;
  colors: PaletteColors;
  spaceName: string | null;
  dayLabel: string;
  togetherLabel: string;
  /** One more line, for example the next milestone. */
  noteLabel: string | null;
}

const SPINE_WIDTH = 16;
const PAGE_EDGE_WIDTH = 6;
const COVER_RADIUS = 14;
const SPECKS = 46;

/** Repeatable "random" numbers: the kraft board always looks the same. */
function seeded(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function CoverTexture({ edition }: { edition: Edition['cover'] }) {
  const { texture, thread } = edition;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        {texture === 'linen' ? (
          <Pattern id="cover-linen" width={3} height={3} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0.75} x2={3} y2={0.75} stroke={thread} strokeWidth={0.7} opacity={0.5} />
            <Line x1={0.75} y1={0} x2={0.75} y2={3} stroke={thread} strokeWidth={0.7} opacity={0.35} />
          </Pattern>
        ) : null}
        {texture === 'kraft' ? (
          <Pattern id="cover-kraft" width={160} height={90} patternUnits="userSpaceOnUse">
            {Array.from({ length: SPECKS }, (_, i) => (
              <Circle key={i} cx={seeded(i) * 160} cy={seeded(i + 100) * 90} r={0.5 + seeded(i + 200) * 1.1} fill={thread} opacity={0.5} />
            ))}
            {Array.from({ length: 16 }, (_, i) => {
              const x = seeded(i + 300) * 150;
              const y = seeded(i + 400) * 85;
              return <Line key={i} x1={x} y1={y} x2={x + 6 + seeded(i + 500) * 8} y2={y + 1.5 - seeded(i + 600) * 3} stroke={thread} strokeWidth={0.6} opacity={0.35} />;
            })}
          </Pattern>
        ) : null}
        {texture === 'album' ? (
          <Pattern id="cover-album" width={5} height={5} patternUnits="userSpaceOnUse">
            <Circle cx={1.2} cy={1.2} r={0.7} fill={thread} />
            <Circle cx={3.7} cy={3.7} r={0.7} fill={thread} />
          </Pattern>
        ) : null}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#cover-${texture})`} />
    </Svg>
  );
}

/** The front of the book on Home: cloth or board with the name of the space on a label, and the day counter. */
export function BookCover({ edition, colors, spaceName, dayLabel, togetherLabel, noteLabel }: BookCoverProps) {
  const { cover } = edition;
  const foil = cover.foil;
  const ink = cover.labelInk;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${spaceName ?? ''} ${dayLabel} ${togetherLabel}`.trim()}>
      <View style={[styles.cover, { backgroundColor: cover.base }]}>
        <CoverTexture edition={cover} />
        <View style={[styles.spine, { backgroundColor: cover.spine }]} />
        {foil ? <View pointerEvents="none" style={[styles.foilFrame, { borderColor: foil }]} /> : null}
        <View style={[styles.label, foil ? { borderColor: foil, borderWidth: 1.5, backgroundColor: 'transparent' } : { backgroundColor: cover.label }]}>
          {spaceName ? (
            <Text numberOfLines={1} style={[styles.name, { color: ink, fontFamily: colors.fontDisplay, fontSize: titleSize(colors, 28), lineHeight: titleSize(colors, 38) }]}>
              {spaceName}
            </Text>
          ) : null}
          <Text accessibilityRole="header" style={[styles.day, { color: ink, fontFamily: colors.fontDisplay, fontSize: titleSize(colors, 48), lineHeight: titleSize(colors, 62) }]}>
            {dayLabel}
          </Text>
          <Text style={[styles.small, { color: ink }]}>{togetherLabel}</Text>
          {noteLabel ? <Text style={[styles.small, styles.note, { color: ink }]}>{noteLabel}</Text> : null}
        </View>
      </View>
      {/* The edge of the pages, seen from the front. */}
      <View style={styles.pageEdge}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.pageLine, { backgroundColor: i % 2 === 0 ? '#E4DCCB' : '#EFE8DA' }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cover: { flex: 1, overflow: 'hidden', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: COVER_RADIUS, borderBottomRightRadius: COVER_RADIUS, paddingVertical: 14, paddingLeft: SPINE_WIDTH + 14, paddingRight: 14, justifyContent: 'center' },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SPINE_WIDTH, opacity: 0.9 },
  foilFrame: { position: 'absolute', left: SPINE_WIDTH + 6, right: 6, top: 6, bottom: 6, borderWidth: 1, borderRadius: 8 },
  label: { alignItems: 'center', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 18, transform: [{ rotate: '-0.8deg' }], shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  name: { maxWidth: '100%' },
  day: { fontWeight: '700' },
  small: { fontSize: 13, opacity: 0.85, textAlign: 'center' },
  note: { fontWeight: '600', opacity: 1 },
  pageEdge: { width: PAGE_EDGE_WIDTH, marginLeft: -2, marginVertical: 5, justifyContent: 'space-evenly', borderTopRightRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden', backgroundColor: '#E4DCCB' },
  pageLine: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#CFC6B3' },
});
