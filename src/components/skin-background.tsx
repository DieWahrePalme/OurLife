import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import type { PatternSpec } from '@/constants/skins';

const DOT_TILE = 80;
const LATTICE_TILE = 44;
const PETALS = 5;
const PETAL_DISTANCE = 4.2;

/** A five-petal flower made of little circles. */
function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <>
      {Array.from({ length: PETALS }, (_, i) => {
        const angle = (i / PETALS) * Math.PI * 2;
        return <Circle key={i} cx={x + Math.cos(angle) * PETAL_DISTANCE} cy={y + Math.sin(angle) * PETAL_DISTANCE} r={2.6} fill={color} />;
      })}
      <Circle cx={x} cy={y} r={1.8} fill="#FFFFFF" />
    </>
  );
}

function DotsTile({ spec }: { spec: PatternSpec }) {
  const half = DOT_TILE / 2;
  return (
    <>
      <Circle cx={half / 2} cy={half / 2} r={3} fill={spec.color} />
      <Circle cx={half + half / 2} cy={half + half / 2} r={3} fill={spec.color} />
      <Flower x={half + half / 2} y={half / 2} color={spec.accent} />
      <Circle cx={half / 2} cy={half + half / 2} r={1.6} fill={spec.accent} />
    </>
  );
}

function LatticeTile({ spec }: { spec: PatternSpec }) {
  const half = LATTICE_TILE / 2;
  const stroke = { stroke: spec.color, strokeWidth: 1 };
  return (
    <>
      <Line x1={0} y1={half} x2={half} y2={0} {...stroke} />
      <Line x1={half} y1={0} x2={LATTICE_TILE} y2={half} {...stroke} />
      <Line x1={LATTICE_TILE} y1={half} x2={half} y2={LATTICE_TILE} {...stroke} />
      <Line x1={half} y1={LATTICE_TILE} x2={0} y2={half} {...stroke} />
      <Circle cx={half} cy={half} r={1.8} fill={spec.accent} />
    </>
  );
}

/** The repeating backdrop of a skin, drawn behind every screen. */
export function SkinBackground({ pattern }: { pattern: PatternSpec }) {
  const size = pattern.kind === 'dots' ? DOT_TILE : LATTICE_TILE;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="skin-pattern" width={size} height={size} patternUnits="userSpaceOnUse">
          {pattern.kind === 'dots' ? <DotsTile spec={pattern} /> : <LatticeTile spec={pattern} />}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#skin-pattern)" opacity={pattern.opacity} />
    </Svg>
  );
}
