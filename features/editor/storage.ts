import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { normalizeEditorDocument } from "./defaults";
import { normalizePhotoEditState } from "./photo";
import type { EditorDocument, PhotoEditState } from "./model";

export const LEGACY_EDITOR_STORAGE_KEY = "alidesign.editor-document.v1";
const PROJECT_STORAGE_PREFIX = "lumah.editor-project.v2:";
const PHOTO_PROJECT_STORAGE_PREFIX = "lumah.photo-project.v1:";

export function editorProjectStorageKey(projectId: string) {
  return `${PROJECT_STORAGE_PREFIX}${encodeURIComponent(projectId)}`;
}

function decodeEditorDocument(serialized: string): EditorDocument {
  const parsed = normalizeEditorDocument(JSON.parse(serialized) as unknown);
  if (!parsed) throw new Error("Saved editor project has an invalid shape.");
  return parsed;
}

function decodePhotoProject(serialized: string): PhotoEditState {
  const parsed = normalizePhotoEditState(JSON.parse(serialized) as unknown);
  if (!parsed) throw new Error("Saved photo project has an invalid shape.");
  return parsed;
}

/** Returns null only for a genuinely absent project. Read/parse errors are propagated so callers can block autosave. */
export async function loadEditorProject(projectId: string): Promise<EditorDocument | null> {
  const stored = await AsyncStorage.getItem(editorProjectStorageKey(projectId));
  if (stored !== null) return decodeEditorDocument(stored);
  if (projectId === "quick-edit") {
    const legacy = await AsyncStorage.getItem(LEGACY_EDITOR_STORAGE_KEY);
    if (legacy !== null) return decodeEditorDocument(legacy);
  }
  return null;
}

export async function saveEditorProject(projectId: string, document: EditorDocument) {
  await AsyncStorage.setItem(editorProjectStorageKey(projectId), JSON.stringify(document));
  if (projectId === "quick-edit") {
    await AsyncStorage.setItem(LEGACY_EDITOR_STORAGE_KEY, JSON.stringify(document));
  }
}

/** Returns null only when no photo project exists; corrupt JSON/read errors must be handled by the caller. */
export async function loadPhotoProject(projectId: string): Promise<PhotoEditState | null> {
  const stored = await AsyncStorage.getItem(`${PHOTO_PROJECT_STORAGE_PREFIX}${encodeURIComponent(projectId)}`);
  return stored === null ? null : decodePhotoProject(stored);
}

export async function savePhotoProject(projectId: string, photo: PhotoEditState) {
  await AsyncStorage.setItem(`${PHOTO_PROJECT_STORAGE_PREFIX}${encodeURIComponent(projectId)}`, JSON.stringify(photo));
}

export async function persistMediaUri(
  uri: string,
  fileName: string,
  options: { maxCopyBytes?: number } = {},
): Promise<{ uri: string; persistent: boolean; reason?: "temporary-platform" | "uri-not-copyable" | "large-file" | "copy-failed" }> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory || !uri.startsWith("file://")) {
    return { uri, persistent: false, reason: Platform.OS === "web" ? "temporary-platform" : "uri-not-copyable" };
  }
  try {
    const source = await FileSystem.getInfoAsync(uri);
    const size = "size" in source && typeof source.size === "number" ? source.size : undefined;
    if (options.maxCopyBytes && size !== undefined && size > options.maxCopyBytes) {
      return { uri, persistent: false, reason: "large-file" };
    }
    const folder = `${FileSystem.documentDirectory}lumah-media/`;
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const destination = `${folder}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return { uri: destination, persistent: true };
  } catch {
    return { uri, persistent: false, reason: "copy-failed" };
  }
}
