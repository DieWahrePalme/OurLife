import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { TapePattern } from './types';

/** Washi tape drawn with torn (zigzag) ends and a print on it. It stays a little see-through, like real tape. */
export const TAPE_WIDTH = 120;
export const TAPE_HEIGHT = 34;
const TOOTH = 3.2;
const TAPE_OPACITY = 0.82;
const PRINT = '#FFFFFF';
const PRINT_OPACITY = 0.62;

/** Outline of a strip with zigzag short sides. */
function stripPath(width: number, height: number, tooth: number): string {
  const steps = Math.max(Math.round(height / (tooth * 2)), 2);
  const stepHeight = height / steps;
  let d = `M ${tooth} 0 L ${width - tooth} 0`;
  for (let i = 0; i < steps; i += 1) {
    d += ` L ${width} ${i * stepHeight + stepHeight / 2} L ${width - tooth} ${(i + 1) * stepHeight}`;
  }
  d += ` L ${tooth} ${height}`;
  for (let i = steps - 1; i >= 0; i -= 1) {
    d += ` L 0 ${i * stepHeight + stepHeight / 2} L ${tooth} ${i * stepHeight}`;
  }
  return `${d} Z`;
}

function PatternTile({ pattern, unit }: { pattern: Exclude<TapePattern, 'plain'>; unit: number }) {
  switch (pattern) {
    case 'dots':
      return <Circle cx={unit * 3} cy={unit * 3} r={unit * 1.3} fill={PRINT} />;
    case 'stripes':
      return <Rect x={0} y={0} width={unit * 3} height={unit * 12} fill={PRINT} />;
    case 'grid':
      return (
        <>
          <Line x1={0} y1={0} x2={unit * 8} y2={0} stroke={PRINT} strokeWidth={unit * 0.9} />
          <Line x1={0} y1={0} x2={0} y2={unit * 8} stroke={PRINT} strokeWidth={unit * 0.9} />
        </>
      );
    default:
      // floral: five petals and a heart
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2;
            return <Circle key={i} cx={unit * 7 + Math.cos(angle) * unit * 2.1} cy={unit * 7 + Math.sin(angle) * unit * 2.1} r={unit * 1.4} fill={PRINT} />;
          })}
          <Circle cx={unit * 7} cy={unit * 7} r={unit * 0.9} fill="#F2B544" />
        </>
      );
  }
}

function tileSize(pattern: Exclude<TapePattern, 'plain'>, unit: number): { w: number; h: number } {
  if (pattern === 'dots') return { w: unit * 6, h: unit * 6 };
  if (pattern === 'stripes') return { w: unit * 6, h: unit * 12 };
  if (pattern === 'grid') return { w: unit * 8, h: unit * 8 };
  return { w: unit * 14, h: unit * 14 };
}

interface TapeShapeProps {
  color: string;
  pattern: TapePattern;
  /** Size of the strip in pixels as drawn. */
  width: number;
  height: number;
}

export function TapeShape({ color, pattern, width, height }: TapeShapeProps) {
  const unit = height / TAPE_HEIGHT;
  const outline = stripPath(width, height, TOOTH * unit);
  const id = `tape-${pattern}-${Math.round(width)}`;
  const tile = pattern === 'plain' ? null : tileSize(pattern, unit);
  return (
    <Svg width={width} height={height} pointerEvents="none">
      {tile && pattern !== 'plain' ? (
        <Defs>
          <Pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" patternTransform={pattern === 'stripes' ? 'rotate(35)' : undefined}>
            <PatternTile pattern={pattern} unit={unit} />
          </Pattern>
        </Defs>
      ) : null}
      <Path d={outline} fill={color} opacity={TAPE_OPACITY} />
      {tile ? <Path d={outline} fill={`url(#${id})`} opacity={PRINT_OPACITY} /> : null}
    </Svg>
  );
}

/** A roll of tape seen from the side, for the pencil case. */
export function TapeRollIcon({ color, pattern, size }: { color: string; pattern: TapePattern; size: number }) {
  const unit = size / 40;
  const id = `roll-${pattern}-${size}`;
  const tile = pattern === 'plain' ? null : tileSize(pattern, unit * 0.9);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none">
      {tile && pattern !== 'plain' ? (
        <Defs>
          <Pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" patternTransform={pattern === 'stripes' ? 'rotate(35)' : undefined}>
            <PatternTile pattern={pattern} unit={unit * 0.9} />
          </Pattern>
        </Defs>
      ) : null}
      <Circle cx={size / 2} cy={size / 2} r={size * 0.46} fill={color} opacity={TAPE_OPACITY} />
      {tile ? <Circle cx={size / 2} cy={size / 2} r={size * 0.46} fill={`url(#${id})`} opacity={PRINT_OPACITY} /> : null}
      <Circle cx={size / 2} cy={size / 2} r={size * 0.17} fill="#FBF8F1" stroke="#CFC6B3" strokeWidth={1} />
      <Circle cx={size / 2} cy={size / 2} r={size * 0.46} fill="none" stroke="#00000022" strokeWidth={1} />
    </Svg>
  );
}
