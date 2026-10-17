import { Platform } from 'react-native';

/**
 * Small browser-only fixes, installed once at start:
 * - a picture can not be dragged out of the page by the browser (it would start a native image drag instead of moving the item)
 * - selecting text by accident while moving things around is off for pictures
 */
export function installWebFixes(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = 'img { -webkit-user-drag: none; user-select: none; -webkit-user-select: none; }';
  document.head.appendChild(style);
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
}
