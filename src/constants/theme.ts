export const DEFAULT_START_DATE = '2025-10-12';
export const COLUMNS = 7;
export const FUTURE_WEEKS = 3;

export const Palette = {
  light: {
    paper: '#FAF6F0',
    page: '#FFFFFF',
    ink: '#2E2B3A',
    inkSoft: '#6F6A7A',
    dotPast: '#A8405A',
    dotFuture: '#948B7F',
    today: '#CF5A0C',
    danger: '#B42318',
    onAccent: '#FFFFFF',
    line: '#E7DED3',
    track: '#CFC2B2',
  },
  dark: {
    paper: '#1B1A1F',
    page: '#24222A',
    ink: '#F3EEE8',
    inkSoft: '#A39DAD',
    dotPast: '#E48AA2',
    dotFuture: '#7A7586',
    today: '#FF8F45',
    danger: '#FF8A80',
    onAccent: '#1B1A1F',
    line: '#2C2A33',
    track: '#58536A',
  },
} as const;

export type PaletteColors = (typeof Palette)[keyof typeof Palette];
