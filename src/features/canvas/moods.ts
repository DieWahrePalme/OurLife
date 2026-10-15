export type MoodKey = 'happy' | 'sad' | 'anxious' | 'angry' | 'stressed' | 'inlove' | 'calm' | 'tired' | 'excited';

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
  { key: 'inlove', label: 'In love', face: '🥰', color: '#F5A0BE' },
  { key: 'calm', label: 'Calm', face: '😌', color: '#8ED3B5' },
  { key: 'tired', label: 'Tired', face: '😴', color: '#A9B6CC' },
  { key: 'excited', label: 'Excited', face: '🤩', color: '#6FD0E0' },
];

export function moodFor(key: string): Mood {
  return MOODS.find((m) => m.key === key) ?? MOODS[0];
}
