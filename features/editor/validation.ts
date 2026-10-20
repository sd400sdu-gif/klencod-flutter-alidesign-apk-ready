import type {
  AudioRole,
  CanvasRatio,
  ColorGrade,
  EditorDocument,
  Easing,
  ExportFormat,
  ExportFrameRate,
  ExportResolution,
  PhotoCropRatio,
  PhotoEditState,
  PhotoGradient,
  TimelineItem,
  TimelineTrack,
  TrackKind,
  TransformValue,
} from "./model";

const TRACK_KINDS: readonly TrackKind[] = ["video", "image", "text", "music", "voice", "sfx", "sticker", "effect"];
const EASINGS: readonly Easing[] = ["linear", "ease-in", "ease-out", "ease-in-out"];
const CANVAS_RATIOS: readonly CanvasRatio[] = ["9:16", "16:9", "1:1"];
const PHOTO_RATIOS: readonly PhotoCropRatio[] = ["original", "1:1", "4:5", "9:16", "16:9"];
const PHOTO_GRADIENTS: readonly PhotoGradient[] = ["none", "sunset", "ocean", "violet"];
const AUDIO_ROLES: readonly AudioRole[] = ["music", "voice", "sfx"];
const RESOLUTIONS: readonly ExportResolution[] = [720, 1080, 1440, 2160];
const FRAME_RATES: readonly ExportFrameRate[] = [24, 30, 60];
const EXPORT_FORMATS: readonly ExportFormat[] = ["mp4", "mov"];
const COLOR_GRADE_KEYS: readonly (keyof ColorGrade)[] = ["brightness", "contrast", "saturation", "temperature", "tint", "sharpness", "shadows", "highlights"];
type ValidEditorDocumentShape = Partial<EditorDocument> & Pick<EditorDocument, "tracks">;
type ValidPhotoEditShape = Partial<PhotoEditState> & Pick<PhotoEditState, "sourceUri">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isOneOf<T extends string | number>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function optional(record: Record<string, unknown>, key: string, predicate: (value: unknown) => boolean): boolean {
  return !(key in record) || predicate(record[key]);
}

function isTransform(value: unknown): value is TransformValue {
  if (!isRecord(value)) return false;
  return isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isNonNegativeNumber(value.scale)
    && isFiniteNumber(value.rotation)
    && isFiniteNumber(value.opacity)
    && value.opacity >= 0
    && value.opacity <= 1;
}

function isColorGrade(value: unknown): value is Partial<ColorGrade> {
  if (!isRecord(value)) return false;
  return COLOR_GRADE_KEYS.every((key) => optional(value, key, isFiniteNumber));
}

function isCompleteColorGrade(value: unknown): value is ColorGrade {
  return isColorGrade(value)
    && COLOR_GRADE_KEYS.every((key) => isFiniteNumber((value as Record<string, unknown>)[key]));
}

function isTimelineItem(value: unknown, expectedKind: unknown): value is TimelineItem {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isOneOf(value.kind, TRACK_KINDS) || value.kind !== expectedKind) return false;
  if (!isNonEmptyString(value.label) || !isNonNegativeNumber(value.start) || !isFiniteNumber(value.duration) || value.duration <= 0) return false;
  if (!isNonNegativeNumber(value.inPoint) || !isNonNegativeNumber(value.outPoint) || value.outPoint < value.inPoint) return false;
  return optional(value, "uri", isNonEmptyString)
    && optional(value, "persistentUri", (entry) => typeof entry === "boolean")
    && optional(value, "audioRole", (entry) => isOneOf(entry, AUDIO_ROLES))
    && optional(value, "audioGain", (entry) => isFiniteNumber(entry) && entry >= 0 && entry <= 1)
    && optional(value, "fadeInDuration", isNonNegativeNumber)
    && optional(value, "fadeOutDuration", isNonNegativeNumber)
    && optional(value, "locked", (entry) => typeof entry === "boolean");
}

function isTimelineTrack(value: unknown): value is TimelineTrack {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isOneOf(value.kind, TRACK_KINDS) || !isNonEmptyString(value.label)) return false;
  if (!Array.isArray(value.items) || !value.items.every((item) => isTimelineItem(item, value.kind))) return false;
  return optional(value, "muted", (entry) => typeof entry === "boolean")
    && optional(value, "hidden", (entry) => typeof entry === "boolean");
}

function isKeyframe(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.targetId)
    && isNonNegativeNumber(value.time)
    && isTransform(value.value)
    && isOneOf(value.easing, EASINGS);
}

function isEffect(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.presetId)
    && isNonEmptyString(value.targetId)
    && isOneOf(value.scope, ["clip", "project"] as const)
    && isNonNegativeNumber(value.start)
    && isFiniteNumber(value.duration)
    && value.duration > 0
    && isFiniteNumber(value.intensity)
    && value.intensity >= 0
    && value.intensity <= 100;
}

function isTransition(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.presetId)
    && isNonEmptyString(value.fromItemId)
    && isNonEmptyString(value.toItemId)
    && isFiniteNumber(value.duration)
    && value.duration > 0;
}

function isSpeedPoint(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonNegativeNumber(value.time)
    && isFiniteNumber(value.speed)
    && value.speed > 0
    && isOneOf(value.easing, EASINGS);
}

function isTypography(value: unknown): boolean {
  return isRecord(value)
    && optional(value, "text", (entry) => typeof entry === "string")
    && optional(value, "size", (entry) => isFiniteNumber(entry) && entry > 0)
    && optional(value, "color", (entry) => typeof entry === "string")
    && optional(value, "bold", (entry) => typeof entry === "boolean")
    && optional(value, "align", (entry) => isOneOf(entry, ["right", "center", "left"] as const))
    && optional(value, "background", (entry) => typeof entry === "string")
    && optional(value, "outline", (entry) => typeof entry === "boolean")
    && optional(value, "fontFamily", (entry) => entry === null || typeof entry === "string")
    && optional(value, "letterSpacing", isFiniteNumber)
    && optional(value, "textShadowColor", (entry) => typeof entry === "string")
    && optional(value, "textShadowRadius", (entry) => isFiniteNumber(entry) && entry >= 0 && entry <= 40)
    && optional(value, "glowColor", (entry) => entry === null || typeof entry === "string");
}

function isSubtitleCue(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonNegativeNumber(value.start)
    && isFiniteNumber(value.end)
    && value.end > value.start
    && typeof value.text === "string"
    && value.text.trim().length > 0
    && value.text.length <= 4000;
}

function isSavedTypographyPreset(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isTypography(value.values);
}

function isChromaKey(value: unknown): boolean {
  return isRecord(value)
    && optional(value, "enabled", (entry) => typeof entry === "boolean")
    && optional(value, "keyColor", (entry) => typeof entry === "string")
    && optional(value, "sensitivity", isFiniteNumber)
    && optional(value, "edgeSoftness", isFiniteNumber)
    && optional(value, "backgroundColor", (entry) => typeof entry === "string")
    && optional(value, "backgroundUri", isStringOrNull)
    && optional(value, "personRemovalEnabled", (entry) => typeof entry === "boolean");
}

function isAudioSettings(value: unknown): boolean {
  return isRecord(value)
    && optional(value, "duckMusicUnderVoice", (entry) => typeof entry === "boolean")
    && optional(value, "voiceDuckingGain", (entry) => isFiniteNumber(entry) && entry >= 0 && entry <= 1);
}

function isExportSettings(value: unknown): boolean {
  return isRecord(value)
    && optional(value, "resolution", (entry) => isOneOf(entry, RESOLUTIONS))
    && optional(value, "frameRate", (entry) => isOneOf(entry, FRAME_RATES))
    && optional(value, "bitrateMbps", (entry) => isFiniteNumber(entry) && entry > 0)
    && optional(value, "format", (entry) => isOneOf(entry, EXPORT_FORMATS));
}

function isSavedColorPreset(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isCompleteColorGrade(value.values);
}

/** Rejects malformed persisted records before the normalizer can turn them into a blank project. */
export function isValidEditorDocumentShape(value: unknown): value is ValidEditorDocumentShape {
  if (!isRecord(value) || !Array.isArray(value.tracks) || !value.tracks.every(isTimelineTrack)) return false;
  const trackIds = value.tracks.map((track) => (track as TimelineTrack).id);
  if (new Set(trackIds).size !== trackIds.length) return false;
  const itemIds = value.tracks.flatMap((track) => (track as TimelineTrack).items.map((item) => item.id));
  if (new Set(itemIds).size !== itemIds.length) return false;

  if (!optional(value, "id", isNonEmptyString)
    || !optional(value, "name", isNonEmptyString)
    || !optional(value, "playhead", isNonNegativeNumber)
    || !optional(value, "duration", isNonNegativeNumber)
    || !optional(value, "zoom", (entry) => isFiniteNumber(entry) && entry > 0)
    || !optional(value, "canvasRatio", (entry) => isOneOf(entry, CANVAS_RATIOS))
    || !optional(value, "selectedItemId", isStringOrNull)
    || !optional(value, "templateId", isStringOrNull)) return false;

  if (!optional(value, "effects", (entry) => Array.isArray(entry) && entry.every(isEffect))
    || !optional(value, "transitions", (entry) => Array.isArray(entry) && entry.every(isTransition))
    || !optional(value, "keyframes", (entry) => Array.isArray(entry) && entry.every(isKeyframe))
    || !optional(value, "speedPoints", (entry) => Array.isArray(entry) && entry.every(isSpeedPoint))
    || !optional(value, "favoriteColorPresets", (entry) => Array.isArray(entry) && entry.every(isSavedColorPreset))
    || !optional(value, "subtitles", (entry) => Array.isArray(entry) && entry.every(isSubtitleCue))
    || !optional(value, "favoriteTextPresets", (entry) => Array.isArray(entry) && entry.length <= 12 && entry.every(isSavedTypographyPreset))) return false;

  const transformsValid = optional(value, "baseTransforms", (entry) => isRecord(entry) && Object.values(entry).every(isTransform));
  return transformsValid
    && optional(value, "typography", isTypography)
    && optional(value, "colorGrade", isColorGrade)
    && optional(value, "chromaKey", isChromaKey)
    && optional(value, "audioSettings", isAudioSettings)
    && optional(value, "exportSettings", isExportSettings);
}

/** A persisted photo record must retain its sourceUri field; an empty object is not a new project. */
export function isValidPhotoEditShape(value: unknown): value is ValidPhotoEditShape {
  if (!isRecord(value) || !("sourceUri" in value) || !isStringOrNull(value.sourceUri)) return false;
  if (typeof value.sourceUri === "string" && !isNonEmptyString(value.sourceUri)) return false;
  return optional(value, "sourcePersistent", (entry) => typeof entry === "boolean")
    && optional(value, "processedUri", (entry) => entry === null || isNonEmptyString(entry))
    && optional(value, "sourceWidth", isNonNegativeNumber)
    && optional(value, "sourceHeight", isNonNegativeNumber)
    && optional(value, "cropRatio", (entry) => isOneOf(entry, PHOTO_RATIOS))
    && optional(value, "rotation", isFiniteNumber)
    && optional(value, "resizeLongEdge", (entry) => isOneOf(entry, RESOLUTIONS))
    && optional(value, "format", (entry) => isOneOf(entry, ["png", "jpeg"] as const))
    && optional(value, "caption", (entry) => typeof entry === "string")
    && optional(value, "captionColor", (entry) => typeof entry === "string")
    && optional(value, "sticker", (entry) => typeof entry === "string")
    && optional(value, "frame", (entry) => isOneOf(entry, ["none", "thin", "glow", "shadow"] as const))
    && optional(value, "gradient", (entry) => isOneOf(entry, PHOTO_GRADIENTS))
    && optional(value, "colorGrade", isColorGrade)
    && optional(value, "colorPresetId", (entry) => typeof entry === "string");
}
