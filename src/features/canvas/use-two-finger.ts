import { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';

/**
 * Two fingers anywhere on the page act on the selected item (like Instagram Stories): the page writes what the fingers
 * do here, the selected item reads it and follows. With nothing selected the same fingers zoom the page instead.
 *
 * `selectedId` is the id of the item to move, '' for none (a locked item can not be moved).
 */
export function useTwoFingerTarget(selectedId: string) {
  const target = useSharedValue('');
  /** 1 while two fingers are down on the selected item's behalf. */
  const active = useSharedValue(0);
  /** Pinch factor since the fingers went down. */
  const scale = useSharedValue(1);
  /** Turn in radians since the fingers went down. */
  const rotation = useSharedValue(0);

  useEffect(() => {
    target.value = selectedId;
  }, [selectedId, target]);

  return { selectedId: target, active, scale, rotation };
}

export type TwoFingerTarget = ReturnType<typeof useTwoFingerTarget>;
