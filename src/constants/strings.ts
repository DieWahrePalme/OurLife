// All UI text lives here so a German version can be added later.
export const strings = {
  appName: 'OurLife',
  dayTitle: (n: number) => `Day ${n}`,
  together: (date: string) => `together since ${date}`,
  dotLabel: (n: number, date: string) => `Day ${n}, ${date}`,
  emptyDay: 'Nothing here yet.',
  emptyDayHint: 'This page is yours to fill.',
  futureDay: 'Still ahead of you.',
} as const;
