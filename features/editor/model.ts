export type TrackKind = "video" | "image" | "text" | "music" | "voice" | "sfx" | "sticker" | "effect";
export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export type EffectScope = "clip" | "project";
export type CanvasRatio = "9:16" | "16:9" | "1:1";
export type AudioRole = "music" | "voice" | "sfx";
export type ExportResolution = 720 | 1080 | 1440 | 2160;
export type ExportFrameRate = 24 | 30 | 60;
export type ExportFormat = "mp4" | "mov";
export type PhotoCropRatio = "original" | "1:1" | "4:5" | "9:16" | "16:9";
export type PhotoGradient = "none" | "sunset" | "ocean" | "violet";

export type TransformValue = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type Keyframe = {
  id: string;
  targetId: string;
  time: number;
  value: TransformValue;
  easing: Easing;
};

export type TimelineItem = {
  id: string;
  kind: TrackKind;
  label: string;
  start: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  uri?: string;
  persistentUri?: boolean;
  audioRole?: AudioRole;
  audioGain?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  locked?: boolean;
};

export type TimelineTrack = {
  id: string;
  kind: TrackKind;
  label: string;
  muted?: boolean;
  hidden?: boolean;
  items: TimelineItem[];
};

export type EffectInstance = {
  id: string;
  presetId: string;
  targetId: string | "project";
  scope: EffectScope;
  start: number;
  duration: number;
  intensity: number;
};

export type TransitionInstance = {
  id: string;
  presetId: string;
  fromItemId: string;
  toItemId: string;
  duration: number;
};

export type SpeedPoint = { id: string; time: number; speed: number; easing: Easing };

export type Typography = {
  text: string;
  size: number;
  color: string;
  bold: boolean;
  align: "right" | "center" | "left";
  background: string;
  outline: boolean;
  fontFamily: string | null;
  letterSpacing: number;
  textShadowColor: string;
  textShadowRadius: number;
  glowColor: string | null;
};

export type SubtitleCue = { id: string; start: number; end: number; text: string };
export type SavedTypographyPreset = { id: string; label: string; values: Typography };

export type ColorGrade = {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  sharpness: number;
  shadows: number;
  highlights: number;
};
export type SavedColorPreset = { id: string; label: string; values: ColorGrade };

export type ChromaKeySettings = {
  enabled: boolean;
  keyColor: string;
  sensitivity: number;
  edgeSoftness: number;
  backgroundColor: string;
  backgroundUri: string | null;
  personRemovalEnabled: boolean;
};

export type AudioSettings = {
  duckMusicUnderVoice: boolean;
  voiceDuckingGain: number;
};

export type ExportSettings = {
  resolution: ExportResolution;
  frameRate: ExportFrameRate;
  bitrateMbps: number;
  format: ExportFormat;
};

export type EditorDocument = {
  id: string;
  name: string;
  playhead: number;
  duration: number;
  zoom: number;
  canvasRatio: CanvasRatio;
  selectedItemId: string | null;
  baseTransforms: Record<string, TransformValue>;
  tracks: TimelineTrack[];
  effects: EffectInstance[];
  transitions: TransitionInstance[];
  keyframes: Keyframe[];
  speedPoints: SpeedPoint[];
  typography: Typography;
  subtitles: SubtitleCue[];
  favoriteTextPresets: SavedTypographyPreset[];
  colorGrade: ColorGrade;
  favoriteColorPresets: SavedColorPreset[];
  chromaKey: ChromaKeySettings;
  audioSettings: AudioSettings;
  exportSettings: ExportSettings;
  templateId: string | null;
};

export type PhotoEditState = {
  sourceUri: string | null;
  sourcePersistent: boolean;
  processedUri: string | null;
  sourceWidth: number;
  sourceHeight: number;
  cropRatio: PhotoCropRatio;
  rotation: number;
  resizeLongEdge: ExportResolution;
  format: "png" | "jpeg";
  caption: string;
  captionColor: string;
  sticker: string;
  frame: "none" | "thin" | "glow" | "shadow";
  gradient: PhotoGradient;
  colorGrade: ColorGrade;
  colorPresetId: string;
};

export const DEFAULT_TRANSFORM: TransformValue = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
export const DEFAULT_TYPOGRAPHY: Typography = {
  text: "",
  size: 24,
  color: "#FFFFFF",
  bold: true,
  align: "center",
  background: "rgba(0,0,0,0.48)",
  outline: false,
  fontFamily: null,
  letterSpacing: 0,
  textShadowColor: "#000000",
  textShadowRadius: 0,
  glowColor: null,
};
export const DEFAULT_COLOR_GRADE: ColorGrade = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  shadows: 0,
  highlights: 0,
};
export const DEFAULT_CHROMA_KEY: ChromaKeySettings = {
  enabled: false,
  keyColor: "#00FF00",
  sensitivity: 35,
  edgeSoftness: 12,
  backgroundColor: "#101218",
  backgroundUri: null,
  personRemovalEnabled: false,
};
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { duckMusicUnderVoice: true, voiceDuckingGain: 0.25 };
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = { resolution: 1080, frameRate: 30, bitrateMbps: 8, format: "mp4" };

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
