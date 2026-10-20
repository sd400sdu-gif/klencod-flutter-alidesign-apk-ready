import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FONT_LIBRARY_STORAGE_KEY = "alidesign.font-library.v1";
export const FONT_LIBRARY_VERSION = 1 as const;
export const MAX_FONT_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const SUPPORTED_FONT_EXTENSIONS = ["ttf", "otf"] as const;

export type FontExtension = (typeof SUPPORTED_FONT_EXTENSIONS)[number];

export type FontLibraryErrorCode =
  | "cancelled"
  | "unsupported-extension"
  | "missing-size"
  | "file-too-large"
  | "document-storage-unavailable"
  | "source-file-unavailable"
  | "copy-failed"
  | "font-load-failed"
  | "unsupported-font"
  | "storage-read-failed"
  | "storage-write-failed"
  | "storage-invalid"
  | "font-not-found"
  | "invalid-record";

/** Errors exposed by this module have a stable code and user-safe message. */
export class FontLibraryError extends Error {
  readonly code: FontLibraryErrorCode;
  readonly cause?: unknown;

  constructor(code: FontLibraryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "FontLibraryError";
    this.code = code;
    this.cause = cause;
  }
}

export function isFontLibraryError(error: unknown): error is FontLibraryError {
  return error instanceof FontLibraryError;
}

/** Metadata persisted for one copied font. The URI always points into app document storage. */
export type FontRecord = {
  id: string;
  name: string;
  extension: FontExtension;
  size: number;
  uri: string;
  family: string;
  addedAt: number;
};

type StoredFontLibrary = {
  version: typeof FONT_LIBRARY_VERSION;
  fonts: unknown[];
};

type StorageRead = {
  library: StoredFontLibrary | null;
  malformed: boolean;
};

function extensionFor(name: string): FontExtension | null {
  const withoutQuery = name.split(/[?#]/, 1)[0] ?? name;
  const dot = withoutQuery.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = withoutQuery.slice(dot + 1).toLowerCase();
  return (SUPPORTED_FONT_EXTENSIONS as readonly string[]).includes(extension)
    ? (extension as FontExtension)
    : null;
}

function decodeFontRecord(value: unknown): FontRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const extension = candidate.extension;
  const id = candidate.id;
  const name = candidate.name;
  const uri = candidate.uri;
  const family = candidate.family;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof uri !== "string" ||
    typeof family !== "string" ||
    (extension !== "ttf" && extension !== "otf") ||
    typeof candidate.size !== "number" ||
    !Number.isFinite(candidate.size) ||
    candidate.size < 0 ||
    candidate.size > MAX_FONT_FILE_SIZE_BYTES ||
    typeof candidate.addedAt !== "number" ||
    !Number.isFinite(candidate.addedAt) ||
    candidate.addedAt < 0 ||
    !uri.startsWith("file://") ||
    !family.startsWith("alidesign-font-")
  ) {
    return null;
  }

  return {
    id,
    name,
    extension,
    size: candidate.size,
    uri,
    family,
    addedAt: candidate.addedAt,
  };
}

function decodeStoredLibrary(value: unknown): StoredFontLibrary | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== FONT_LIBRARY_VERSION || !Array.isArray(candidate.fonts)) return null;
  return { version: FONT_LIBRARY_VERSION, fonts: candidate.fonts };
}

async function readStorage(): Promise<StorageRead> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(FONT_LIBRARY_STORAGE_KEY);
  } catch (error) {
    throw new FontLibraryError("storage-read-failed", "Unable to read the saved font library.", error);
  }
  if (raw === null) return { library: null, malformed: false };

  try {
    const library = decodeStoredLibrary(JSON.parse(raw) as unknown);
    return { library, malformed: library === null };
  } catch {
    // listFonts deliberately treats malformed storage as an empty readable view. It never
    // writes or removes it, so a later migration/recovery can still inspect the original data.
    return { library: null, malformed: true };
  }
}

function validRecords(library: StoredFontLibrary | null): FontRecord[] {
  if (!library) return [];
  return library.fonts.map(decodeFontRecord).filter((record): record is FontRecord => record !== null);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureRecord(record: FontRecord): FontRecord {
  if (decodeFontRecord(record) === null) {
    throw new FontLibraryError("invalid-record", "The saved font record is invalid and cannot be loaded.");
  }
  return record;
}

async function fileSize(uri: string, pickedSize: number | undefined): Promise<number> {
  if (typeof pickedSize === "number" && Number.isFinite(pickedSize) && pickedSize >= 0) return pickedSize;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && !info.isDirectory && typeof info.size === "number" && Number.isFinite(info.size)) return info.size;
  } catch (error) {
    throw new FontLibraryError("source-file-unavailable", "The selected font file could not be inspected.", error);
  }
  throw new FontLibraryError("missing-size", "The selected font file size is unavailable.");
}

async function saveRecord(record: FontRecord): Promise<void> {
  const stored = await readStorage();
  if (stored.malformed) {
    // Do not replace an unknown/corrupt library with a new one. This preserves any records
    // that a future migration may be able to recover.
    throw new FontLibraryError("storage-invalid", "The saved font library has an invalid format and was not changed.");
  }
  const fonts = [...validRecords(stored.library), record];
  try {
    await AsyncStorage.setItem(
      FONT_LIBRARY_STORAGE_KEY,
      JSON.stringify({ version: FONT_LIBRARY_VERSION, fonts }),
    );
  } catch (error) {
    throw new FontLibraryError("storage-write-failed", "Unable to save the font in the library.", error);
  }
}

async function loadCopiedFont(record: FontRecord): Promise<FontRecord> {
  ensureRecord(record);

  try {
    if (Font.isLoaded(record.family)) return record;
  } catch (error) {
    throw new FontLibraryError("font-load-failed", "The font loader is unavailable.", error);
  }

  let info: Awaited<ReturnType<typeof FileSystem.getInfoAsync>>;
  try {
    info = await FileSystem.getInfoAsync(record.uri);
  } catch (error) {
    throw new FontLibraryError("source-file-unavailable", "The copied font file could not be inspected.", error);
  }
  if (!info.exists || info.isDirectory) {
    throw new FontLibraryError("source-file-unavailable", "The copied font file is no longer available.");
  }

  try {
    // Expo SDK 57 accepts a string FontSource. Internally it resolves the URI through
    // expo-asset and passes the resulting local URI to ExpoFontLoader.loadAsync.
    await Font.loadAsync(record.family, record.uri);
  } catch (error) {
    throw new FontLibraryError(
      "unsupported-font",
      `The selected file could not be loaded as a supported ${record.extension.toUpperCase()} font.`,
      error,
    );
  }

  // Do not report success merely because loadAsync resolved: native/web font loaders must
  // confirm that the unique family is actually registered.
  let loaded = false;
  try {
    loaded = Font.isLoaded(record.family);
  } catch (error) {
    throw new FontLibraryError("font-load-failed", "The font load could not be verified.", error);
  }
  if (!loaded) {
    throw new FontLibraryError(
      "unsupported-font",
      `The selected file is not a supported ${record.extension.toUpperCase()} font.`,
    );
  }
  return record;
}

/**
 * Lists valid records without mutating storage. Invalid records are ignored so one bad
 * entry cannot erase or hide the rest of the library.
 */
export async function listFonts(): Promise<FontRecord[]> {
  const stored = await readStorage();
  return validRecords(stored.library);
}

/** Loads a stored record (or a record returned by pickFont) and verifies registration. */
export async function loadFont(recordOrId: FontRecord | string): Promise<FontRecord> {
  const record = typeof recordOrId === "string"
    ? (await listFonts()).find((candidate) => candidate.id === recordOrId)
    : recordOrId;
  if (!record) throw new FontLibraryError("font-not-found", "The requested font is not in the library.");
  return loadCopiedFont(record);
}

/** Opens the system picker, copies one validated font into document storage, loads it, and saves metadata. */
export async function pickFont(): Promise<FontRecord> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: ["font/ttf", "font/otf", "application/x-font-ttf", "application/vnd.ms-opentype", "*/*"],
      multiple: false,
      // The source may be temporary, but this makes it readable long enough to copy to documents.
      copyToCacheDirectory: true,
    });
  } catch (error) {
    throw new FontLibraryError("source-file-unavailable", "The font picker could not be opened.", error);
  }
  if (result.canceled || !result.assets?.length) {
    throw new FontLibraryError("cancelled", "Font selection was cancelled.");
  }

  const asset = result.assets[0];
  const extension = extensionFor(asset.name);
  if (!extension) {
    throw new FontLibraryError("unsupported-extension", "Choose a TrueType (.ttf) or OpenType (.otf) font file.");
  }
  const size = await fileSize(asset.uri, asset.size);
  if (size > MAX_FONT_FILE_SIZE_BYTES) {
    throw new FontLibraryError("file-too-large", "Font files must be 20 MiB or smaller.");
  }
  if (!FileSystem.documentDirectory) {
    throw new FontLibraryError("document-storage-unavailable", "App document storage is unavailable on this device.");
  }

  const id = newId();
  const family = `alidesign-font-${id}`;
  const directory = `${FileSystem.documentDirectory}alidesign-fonts/`;
  const destination = `${directory}${id}.${extension}`;
  try {
    const directoryInfo = await FileSystem.getInfoAsync(directory);
    if (!directoryInfo.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    const copied = await FileSystem.getInfoAsync(destination);
    if (!copied.exists || copied.isDirectory) throw new Error("copy did not create a file");
  } catch (error) {
    throw new FontLibraryError("copy-failed", "The font could not be copied into app document storage.", error);
  }

  const record: FontRecord = {
    id,
    name: asset.name,
    extension,
    size,
    uri: destination,
    family,
    addedAt: Date.now(),
  };
  await loadCopiedFont(record);
  await saveRecord(record);
  return record;
}

/** Explicit alias for callers that want the full pick/copy/load/save operation named as such. */
export const pickAndLoadFont = pickFont;
