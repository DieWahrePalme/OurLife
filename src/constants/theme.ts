export const DEFAULT_START_DATE = '2025-10-12';
export const COLUMNS = 7;
export const FUTURE_WEEKS = 3;

/** All the colours (and the title font) a skin gives the app. Layout and behaviour never depend on it. */
export interface PaletteColors {
  /** The backdrop behind everything. */
  paper: string;
  /** Cards, inputs and sheets that sit on the backdrop. */
  page: string;
  /** The day page itself. Items are drawn on it in pen colours, so it stays light in every skin. */
  sheet: string;
  sheetInkSoft: string;
  ink: string;
  inkSoft: string;
  /** Main accent: past days, buttons, links. */
  dotPast: string;
  dotFuture: string;
  today: string;
  danger: string;
  /** Text on top of dotPast / today. */
  onAccent: string;
  line: string;
  track: string;
  /** Font for titles. Notes written on a day page keep their own handwriting in every skin. */
  fontDisplay: string;
  /** Sizes of the big titles are multiplied by this, because fonts are different widths. */
  titleScale: number;
}

export function titleSize(colors: PaletteColors, size: number): number {
  return Math.round(size * colors.titleScale);
}

export const Palette: Readonly<Record<'light' | 'dark', PaletteColors>> = {
  light: {
    paper: '#FAF6F0',
    page: '#FFFFFF',
    sheet: '#FFFFFF',
    sheetInkSoft: '#6F6A7A',
    ink: '#2E2B3A',
    inkSoft: '#6F6A7A',
    dotPast: '#A8405A',
    dotFuture: '#948B7F',
    today: '#CF5A0C',
    danger: '#B42318',
    onAccent: '#FFFFFF',
    line: '#E7DED3',
    track: '#CFC2B2',
    fontDisplay: 'Caveat_700Bold',
    titleScale: 1,
  },
  dark: {
    paper: '#1B1A1F',
    page: '#24222A',
    sheet: '#24222A',
    sheetInkSoft: '#A39DAD',
    ink: '#F3EEE8',
    inkSoft: '#A39DAD',
    dotPast: '#E48AA2',
    dotFuture: '#7A7586',
    today: '#FF8F45',
    danger: '#FF8A80',
    onAccent: '#1B1A1F',
    line: '#2C2A33',
    track: '#58536A',
    fontDisplay: 'Caveat_700Bold',
    titleScale: 1,
  },
};
