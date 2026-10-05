export type MoodKey = 'happy' | 'sad' | 'anxious' | 'angry' | 'stressed';

export interface Mood {
  key: MoodKey;
  label: string;
  face: string;
  color: string;
}

export const MOODS: readonly Mood[] = [
  { key: 'happy', label: 'Happy', face: '😊', color: '#F6CF57' },
  { key: 'sad', label: 'Sad', face: '😢', color: '#7FB0E8' },
  { key: 'anxious', label: 'Anxious', face: '😟', color: '#B79BE0' },
  { key: 'angry', label: 'Angry', face: '😠', color: '#E86A5E' },
  { key: 'stressed', label: 'Stressed', face: '😣', color: '#F2A15C' },
];

export function moodFor(key: string): Mood {
  return MOODS.find((m) => m.key === key) ?? MOODS[0];
}
