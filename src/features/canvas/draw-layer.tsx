/* eslint-disable react-hooks/refs -- the gesture callbacks run later, on events; the points live in a ref so that no render is needed per point. */
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { type Point } from './drawing';

interface DrawLayerProps {
  /** Pen colour and width on screen (pixels), for the line while it is being drawn. */
  color: string;
  previewWidth: number;
  /** A screen position as a point of the page. */
  toPage: (screenX: number, screenY: number) => Point;
  /** A finished stroke, in page coordinates. */
  onStroke: (points: Point[]) => void;
}

/** Covers the page while drawing: one finger draws. The line is shown at once and handed over when the finger lifts. */
export function DrawLayer({ color, previewWidth, toPage, onStroke }: DrawLayerProps) {
  const [live, setLive] = useState<readonly Point[]>([]);
  const screenPoints = useRef<Point[]>([]);

  const begin = (x: number, y: number) => {
    screenPoints.current = [{ x, y }];
    setLive([{ x, y }]);
  };
  const extend = (x: number, y: number) => {
    screenPoints.current = [...screenPoints.current, { x, y }];
    setLive(screenPoints.current);
  };
  const finish = () => {
    const points = screenPoints.current.map((point) => toPage(point.x, point.y));
    screenPoints.current = [];
    setLive([]);
    if (points.length > 0) onStroke(points);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onStart((e) => scheduleOnRN(begin, e.x, e.y))
    .onUpdate((e) => scheduleOnRN(extend, e.x, e.y))
    .onEnd(() => scheduleOnRN(finish));

  const path =
    live.length === 0
      ? ''
      : `M${live[0].x} ${live[0].y}${live.length === 1 ? ` L${live[0].x + 0.1} ${live[0].y}` : ''}${live
          .slice(1)
          .map((p) => `L${p.x} ${p.y}`)
          .join('')}`;

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={styles.layer} accessibilityLabel="Drawing area">
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
          {path ? <Path d={path} stroke={color} strokeWidth={previewWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
        </Svg>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});
