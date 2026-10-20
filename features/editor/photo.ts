import { DEFAULT_COLOR_GRADE, type PhotoEditState, type PhotoCropRatio } from "./model";
import { isValidPhotoEditShape } from "./validation";

export function createDefaultPhotoEditState(): PhotoEditState {
  return {
    sourceUri: null,
    sourcePersistent: false,
    processedUri: null,
    sourceWidth: 0,
    sourceHeight: 0,
    cropRatio: "original",
    rotation: 0,
    resizeLongEdge: 1080,
    format: "jpeg",
    caption: "",
    captionColor: "#FFFFFF",
    sticker: "",
    frame: "none",
    gradient: "none",
    colorGrade: { ...DEFAULT_COLOR_GRADE },
    colorPresetId: "original",
  };
}

export function normalizePhotoEditState(value: unknown): PhotoEditState | null {
  if (!isValidPhotoEditShape(value)) return null;
  const saved = value;
  const defaults = createDefaultPhotoEditState();
  const validRatio: PhotoCropRatio[] = ["original", "1:1", "4:5", "9:16", "16:9"];
  const validLongEdges = [720, 1080, 1440, 2160] as const;
  return {
    ...defaults,
    ...saved,
    sourceUri: typeof saved.sourceUri === "string" ? saved.sourceUri : null,
    processedUri: typeof saved.processedUri === "string" ? saved.processedUri : null,
    sourcePersistent: Boolean(saved.sourcePersistent),
    sourceWidth: Number.isFinite(saved.sourceWidth) ? Math.max(0, saved.sourceWidth ?? 0) : 0,
    sourceHeight: Number.isFinite(saved.sourceHeight) ? Math.max(0, saved.sourceHeight ?? 0) : 0,
    cropRatio: validRatio.includes(saved.cropRatio as PhotoCropRatio) ? saved.cropRatio as PhotoCropRatio : defaults.cropRatio,
    rotation: Number.isFinite(saved.rotation) ? saved.rotation ?? 0 : 0,
    resizeLongEdge: validLongEdges.includes(saved.resizeLongEdge as (typeof validLongEdges)[number]) ? saved.resizeLongEdge as PhotoEditState["resizeLongEdge"] : defaults.resizeLongEdge,
    format: saved.format === "png" ? "png" : "jpeg",
    caption: typeof saved.caption === "string" ? saved.caption : "",
    captionColor: typeof saved.captionColor === "string" ? saved.captionColor : defaults.captionColor,
    sticker: typeof saved.sticker === "string" ? saved.sticker : "",
    frame: saved.frame === "thin" || saved.frame === "glow" || saved.frame === "shadow" ? saved.frame : "none",
    gradient: saved.gradient === "sunset" || saved.gradient === "ocean" || saved.gradient === "violet" ? saved.gradient : "none",
    colorGrade: { ...DEFAULT_COLOR_GRADE, ...(saved.colorGrade ?? {}) },
    colorPresetId: typeof saved.colorPresetId === "string" ? saved.colorPresetId : "original",
  };
}

export function centeredCrop(width: number, height: number, ratio: PhotoCropRatio) {
  if (ratio === "original" || width <= 0 || height <= 0) return null;
  const target = ratio.split(":").map(Number);
  const targetRatio = target[0] / target[1];
  let cropWidth = width;
  let cropHeight = height;
  if (width / height > targetRatio) cropWidth = height * targetRatio;
  else cropHeight = width / targetRatio;
  return {
    originX: Math.max(0, Math.round((width - cropWidth) / 2)),
    originY: Math.max(0, Math.round((height - cropHeight) / 2)),
    width: Math.max(1, Math.round(cropWidth)),
    height: Math.max(1, Math.round(cropHeight)),
  };
}
