import { Palette, type PaletteColors } from './theme';

export type SkinId = 'original' | 'scrapbook' | 'luxury';

/** A repeating pattern drawn on the backdrop. Plain shapes, so it is sharp at any size and weighs nothing. */
export type PatternKind = 'dots' | 'lattice';

export interface PatternSpec {
  kind: PatternKind;
  color: string;
  /** Second colour (flowers in the scrapbook skin). */
  accent: string;
  opacity: number;
}

export interface Skin {
  id: SkinId;
  name: string;
  blurb: string;
  /** True when light / dark from Settings changes the colours; false for skins with one fixed look. */
  followsAppearance: boolean;
  palettes: Readonly<Record<'light' | 'dark', PaletteColors>>;
  pattern: PatternSpec | null;
  /** Colour of the status bar icons on this skin's backdrop. */
  statusBar: Readonly<Record<'light' | 'dark', 'light' | 'dark'>>;
}

const scrapbookColors: PaletteColors = {
  paper: '#DCE8E0',
  page: '#FFFBF4',
  sheet: '#FFFBF4',
  sheetInkSoft: '#6B5A5F',
  ink: '#43343A',
  inkSoft: '#65565B',
  dotPast: '#A63D5F',
  dotFuture: '#6F7F75',
  today: '#BF5F0C',
  danger: '#B3261E',
  onAccent: '#FFFFFF',
  line: '#BFD0C5',
  track: '#C0CFC4',
  fontDisplay: 'Kalam_700Bold',
  titleScale: 0.78,
};

const luxuryColors: PaletteColors = {
  paper: '#0F0E0C',
  page: '#1C1A14',
  sheet: '#F6F0E0',
  sheetInkSoft: '#6B6250',
  ink: '#F2E8CF',
  inkSoft: '#BBAE8A',
  dotPast: '#C9A24A',
  dotFuture: '#7A6F4C',
  today: '#FFF3CC',
  danger: '#FF8F7E',
  onAccent: '#14120D',
  line: '#3B3525',
  track: '#4A422C',
  fontDisplay: 'CormorantGaramond_700Bold',
  titleScale: 1,
};

export const SKINS: readonly Skin[] = [
  {
    id: 'original',
    name: 'Original',
    blurb: 'Simple and calm. Follows light and dark.',
    followsAppearance: true,
    palettes: Palette,
    pattern: null,
    statusBar: { light: 'dark', dark: 'light' },
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    blurb: 'Soft mint paper, rose and little flowers.',
    followsAppearance: false,
    palettes: { light: scrapbookColors, dark: scrapbookColors },
    pattern: { kind: 'dots', color: '#FFFFFF', accent: '#C9708C', opacity: 0.28 },
    statusBar: { light: 'dark', dark: 'dark' },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    blurb: 'Black and gold, quiet and fine.',
    followsAppearance: false,
    palettes: { light: luxuryColors, dark: luxuryColors },
    pattern: { kind: 'lattice', color: '#C9A24A', accent: '#C9A24A', opacity: 0.12 },
    statusBar: { light: 'light', dark: 'light' },
  },
];

export const DEFAULT_SKIN: SkinId = 'original';

export function skinFor(id: SkinId): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}
