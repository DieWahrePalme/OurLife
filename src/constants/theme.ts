export const START_DATE = '2025-10-12';
export const COLUMNS = 7;
export const FUTURE_WEEKS = 3;

export const Palette = {
  light: {
    paper: '#FAF6F0',
    ink: '#2E2B3A',
    inkSoft: '#6F6A7A',
    dotPast: '#B9566F',
    dotFuture: '#D9CFC4',
    today: '#F07A2A',
    line: '#E7DED3',
  },
  dark: {
    paper: '#1B1A1F',
    ink: '#F3EEE8',
    inkSoft: '#A39DAD',
    dotPast: '#E48AA2',
    dotFuture: '#47434F',
    today: '#FF8F45',
    line: '#2C2A33',
  },
} as const;

export type PaletteColors = (typeof Palette)[keyof typeof Palette];
