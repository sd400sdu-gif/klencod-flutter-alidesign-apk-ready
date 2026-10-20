import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_CHROMA_KEY,
  DEFAULT_COLOR_GRADE,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_TRANSFORM,
  DEFAULT_TYPOGRAPHY,
  type EditorDocument,
} from "./model";
import { isValidEditorDocumentShape } from "./validation";
import { makeDefaultTracks } from "./timeline";

export function createDefaultDocument(): EditorDocument {
  return {
    id: "lumah-local-editor-v2",
    name: "مشروع لمعة",
    playhead: 0,
    duration: 0,
    zoom: 1,
    canvasRatio: "9:16",
    selectedItemId: null,
    baseTransforms: {
      video: { ...DEFAULT_TRANSFORM },
      image: { ...DEFAULT_TRANSFORM },
      text: { ...DEFAULT_TRANSFORM },
      sticker: { ...DEFAULT_TRANSFORM },
    },
    tracks: makeDefaultTracks(),
    effects: [],
    transitions: [],
    keyframes: [],
    speedPoints: [],
    typography: { ...DEFAULT_TYPOGRAPHY },
    subtitles: [],
    favoriteTextPresets: [],
    colorGrade: { ...DEFAULT_COLOR_GRADE },
    favoriteColorPresets: [],
    chromaKey: { ...DEFAULT_CHROMA_KEY },
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    templateId: null,
  };
}

export function normalizeEditorDocument(value: unknown): EditorDocument | null {
  if (!isValidEditorDocumentShape(value)) return null;
  const candidate = value;
  const defaults = createDefaultDocument();
  return {
    ...defaults,
    ...candidate,
    tracks: candidate.tracks,
    effects: Array.isArray(candidate.effects) ? candidate.effects : [],
    transitions: Array.isArray(candidate.transitions) ? candidate.transitions : [],
    keyframes: Array.isArray(candidate.keyframes) ? candidate.keyframes : [],
    speedPoints: Array.isArray(candidate.speedPoints) ? candidate.speedPoints : [],
    subtitles: Array.isArray(candidate.subtitles) ? candidate.subtitles : [],
    favoriteTextPresets: Array.isArray(candidate.favoriteTextPresets)
      ? candidate.favoriteTextPresets.map((preset) => ({ ...preset, values: { ...defaults.typography, ...preset.values } }))
      : [],
    baseTransforms: { ...defaults.baseTransforms, ...(candidate.baseTransforms ?? {}) },
    typography: { ...defaults.typography, ...(candidate.typography ?? {}) },
    colorGrade: { ...defaults.colorGrade, ...(candidate.colorGrade ?? {}) },
    favoriteColorPresets: Array.isArray(candidate.favoriteColorPresets) ? candidate.favoriteColorPresets : [],
    chromaKey: { ...defaults.chromaKey, ...(candidate.chromaKey ?? {}) },
    audioSettings: { ...defaults.audioSettings, ...(candidate.audioSettings ?? {}) },
    exportSettings: { ...defaults.exportSettings, ...(candidate.exportSettings ?? {}) },
    canvasRatio: candidate.canvasRatio ?? defaults.canvasRatio,
    templateId: candidate.templateId ?? null,
  };
}
