import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import type { Edition } from '@/constants/skins';
import type { PaletteColors } from '@/constants/theme';

interface PaperProps {
  edition: Edition;
  colors: PaletteColors;
  /** Size of the page at the scale it is laid out at. */
  width: number;
  height: number;
  /** The scale the page is laid out at: every size below is a page pixel times this. */
  scale: number;
  radius: number;
  pageLabel: string;
  /** The paper itself, for taking a picture of the page. */
  sheetRef?: Ref<View>;
  /** What is on the page (clipped to the page). */
  children: ReactNode;
}

const GRAIN_TILE = 20;
/** The pages underneath: how far each sticks out (page pixels) and how much it is turned (degrees). */
const STACK = [
  { dx: 3, dy: 5, turn: 0.7 },
  { dx: -2, dy: 9, turn: -0.5 },
] as const;

/** Faint print on the paper. It lies below everything on the page and is too light to cost any contrast. */
function Grain({ edition, scale }: { edition: Edition['paper']; scale: number }) {
  if (edition.grain === 'none') return null;
  const tile = GRAIN_TILE * scale;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="paper-grain" width={tile} height={tile} patternUnits="userSpaceOnUse">
          {edition.grain === 'dots' ? (
            <Circle cx={tile / 2} cy={tile / 2} r={0.9 * scale} fill={edition.ink} />
          ) : (
            <Line x1={0} y1={tile - 0.5 * scale} x2={tile} y2={tile - 0.5 * scale} stroke={edition.ink} strokeWidth={0.7 * scale} />
          )}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#paper-grain)" opacity={edition.opacity} />
    </Svg>
  );
}

/** The day page as a sheet of paper in a stack: a soft shadow, two pages peeking out below, grain, and the page number. */
export function Paper({ edition, colors, width, height, scale, radius, pageLabel, sheetRef, children }: PaperProps) {
  return (
    <View pointerEvents="box-none" style={{ width, height }}>
      {STACK.map((page, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.under,
            {
              width,
              height,
              borderRadius: radius,
              left: page.dx * scale,
              top: page.dy * scale,
              backgroundColor: index === 0 ? '#F7F2E8' : '#EEE7D8',
              borderColor: colors.line,
              transform: [{ rotate: `${page.turn}deg` }],
            },
          ]}
        />
      ))}
      <View
        ref={sheetRef}
        collapsable={false}
        pointerEvents="box-none"
        style={[
          styles.sheet,
          {
            width,
            height,
            borderRadius: radius,
            backgroundColor: colors.sheet,
            borderColor: colors.line,
            shadowRadius: 10 * scale,
            shadowOffset: { width: 0, height: 4 * scale },
          },
        ]}
      >
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
          <Grain edition={edition.paper} scale={scale} />
          {children}
          <Text pointerEvents="none" style={[styles.pageNumber, { color: colors.sheetInkSoft, fontFamily: colors.fontDisplay, fontSize: 15 * scale, lineHeight: 20 * scale, bottom: 8 * scale }]}>
            {pageLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth },
  sheet: { borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, elevation: 3 },
  clip: { overflow: 'hidden' },
  pageNumber: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
