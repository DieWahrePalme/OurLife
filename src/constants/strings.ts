// All UI text lives here so a German version can be added later.
export const strings = {
  appName: 'OurLife',
  dayTitle: (n: number) => `Day ${n}`,
  together: (date: string) => `together since ${date}`,
  dotLabel: (n: number, date: string) => `Day ${n}, ${date}`,
  addText: 'Text',
  addSticker: 'Sticker',
  addTape: 'Tape',
  textPlaceholder: 'Write something…',
  textSave: 'Save',
  textCancel: 'Cancel',
  stickerSheetTitle: 'Pick a sticker',
  close: 'Close',
  delete: 'Delete',
  toFront: 'Bring to front',
  colorLabel: (name: string) => `Colour ${name}`,
} as const;
