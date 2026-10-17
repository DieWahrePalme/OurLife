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

/** The book of one skin: its cover and the paper of its day pages. The paper is always light, so every pen colour reads. */
export interface Edition {
  cover: {
    /** Cloth / board colour and the thread colour woven into it. */
    base: string;
    thread: string;
    texture: 'linen' | 'kraft' | 'album';
    /** Colour of the book's spine band, a little darker than the cover. */
    spine: string;
    /** The label on the cover, and the ink on it. */
    label: string;
    labelInk: string;
    /** Gold foil lettering and frame (luxury), or null. */
    foil: string | null;
  };
  paper: {
    /** Faint print on the paper, below everything the people put on it. */
    grain: 'dots' | 'lines' | 'none';
    ink: string;
    opacity: number;
  };
}

export interface Skin {
  id: SkinId;
  name: string;
  blurb: string;
  /** True when light / dark from Settings changes the colours; false for skins with one fixed look. */
  followsAppearance: boolean;
  palettes: Readonly<Record<'light' | 'dark', PaletteColors>>;
  pattern: PatternSpec | null;
  edition: Edition;
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
    blurb: 'Blue linen cover, cream paper. Follows light and dark.',
    followsAppearance: true,
    palettes: Palette,
    pattern: null,
    edition: {
      cover: { base: '#5F7690', thread: '#7C93AB', texture: 'linen', spine: '#4A5F77', label: '#FBF8F1', labelInk: '#2E2B3A', foil: null },
      paper: { grain: 'dots', ink: '#8A8794', opacity: 0.22 },
    },
    statusBar: { light: 'dark', dark: 'light' },
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    blurb: 'Kraft cover, mint desk, rose and little flowers.',
    followsAppearance: false,
    palettes: { light: scrapbookColors, dark: scrapbookColors },
    pattern: { kind: 'dots', color: '#FFFFFF', accent: '#C9708C', opacity: 0.28 },
    edition: {
      cover: { base: '#B88B5C', thread: '#8F6A41', texture: 'kraft', spine: '#9A7249', label: '#FFFBF4', labelInk: '#43343A', foil: null },
      paper: { grain: 'lines', ink: '#C9708C', opacity: 0.22 },
    },
    statusBar: { light: 'dark', dark: 'dark' },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    blurb: 'Black album with gold foil, ivory paper.',
    followsAppearance: false,
    palettes: { light: luxuryColors, dark: luxuryColors },
    pattern: { kind: 'lattice', color: '#C9A24A', accent: '#C9A24A', opacity: 0.12 },
    edition: {
      cover: { base: '#14120D', thread: '#2A261B', texture: 'album', spine: '#0A0907', label: '#14120D', labelInk: '#D9B85F', foil: '#D9B85F' },
      paper: { grain: 'none', ink: '#6B6250', opacity: 0.1 },
    },
    statusBar: { light: 'light', dark: 'light' },
  },
];

export const DEFAULT_SKIN: SkinId = 'original';

export function skinFor(id: SkinId): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}
