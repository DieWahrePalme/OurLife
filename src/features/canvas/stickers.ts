export interface StickerGroup {
  title: string;
  glyphs: readonly string[];
}

// System emoji for now: licence-free to use, easy to swap for original art later.
export const STICKER_GROUPS: readonly StickerGroup[] = [
  { title: 'Hearts', glyphs: ['❤️', '🩷', '💜', '💙', '💛', '💕', '💌', '🫶'] },
  { title: 'Flowers', glyphs: ['🌸', '🌷', '🌻', '🌹', '🌼', '🪻', '💐', '🌺'] },
  { title: 'Plants', glyphs: ['🌿', '🪴', '🍀', '🌵', '🍃', '🌱', '🍄', '🌳'] },
  { title: 'Cats', glyphs: ['🐱', '😺', '😻', '🐈', '🐾', '🧶', '🐟', '🐈‍⬛'] },
  { title: 'Sparkle', glyphs: ['⭐', '✨', '🌙', '☀️', '🌈', '☁️', '🎀', '🫧'] },
  { title: 'Day to day', glyphs: ['☕', '🍰', '🍓', '🎬', '📷', '✈️', '🏖️', '🎶'] },
];
