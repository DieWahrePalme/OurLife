import { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import type { CanvasItem } from './types';

const DEG_PER_RAD = 180 / Math.PI;

/**
 * The animated values of one item: its position, turn and the extra enlargement while a finger is on it.
 * A finger moves them directly (smooth, on the UI thread). When the saved item changes (the other phone moved it,
 * or this phone's own change came back) they follow the saved values.
 */
export function useItemMotion(item: CanvasItem) {
  const x = useSharedValue(item.x);
  const y = useSharedValue(item.y);
  const rotation = useSharedValue(item.rotation / DEG_PER_RAD);
  /** Once the finger is let go this becomes part of `item.scale` and returns to 1. */
  const ratio = useSharedValue(1);

  useEffect(() => {
    x.value = item.x;
    y.value = item.y;
    rotation.value = item.rotation / DEG_PER_RAD;
    ratio.value = 1;
  }, [item.x, item.y, item.rotation, item.scale, x, y, rotation, ratio]);

  return { x, y, rotation, ratio };
}
