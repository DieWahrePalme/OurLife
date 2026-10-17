import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ShareResult = 'shared' | 'saved' | 'unavailable';

/**
 * The page as a picture (PNG), shared through the phone's share sheet. In a browser the picture is downloaded instead.
 * Only the paper is captured: no handles, no buttons.
 */
export async function sharePage(sheet: RefObject<View | null>, dayNumber: number): Promise<ShareResult> {
  const node = sheet.current;
  if (!node) return 'unavailable';
  if (Platform.OS === 'web') {
    const dataUri = await captureRef(node, { format: 'png', quality: 1, result: 'data-uri' });
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `ourlife-day-${dayNumber}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return 'saved';
  }
  const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
  return 'shared';
}
