import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PickedPhoto {
  uri: string;
  /** Width divided by height. */
  aspect: number;
}

const PHOTO_DIR = 'photos';
const PICK_QUALITY = 0.8;
const FALLBACK_EXTENSION = 'jpg';

function extensionOf(uri: string): string {
  const match = /\.([a-zA-Z0-9]{3,4})(?:\?|$)/.exec(uri);
  return match ? match[1].toLowerCase() : FALLBACK_EXTENSION;
}

/** Copies a picked photo into the app's own folder so it outlives the picker's cache (native only). */
async function keepPhoto(sourceUri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const folder = new Directory(Paths.document, PHOTO_DIR);
  folder.create({ idempotent: true });
  const target = new File(folder, `${id}.${extensionOf(sourceUri)}`);
  await new File(sourceUri).copy(target);
  return target.uri;
}

/** Opens the photo library. Returns null if the person cancels. Throws if the photo cannot be saved. */
export async function pickPhoto(id: string): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: PICK_QUALITY });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const uri = await keepPhoto(asset.uri, id);
  return { uri, aspect: asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1 };
}
