import { describe, expect, it } from "vitest";
import { centeredCrop, createDefaultPhotoEditState, normalizePhotoEditState } from "../features/editor/photo";

describe("photo editor state", () => {
  it("creates a clean editable image project without replacing the source", () => {
    const state = createDefaultPhotoEditState();
    expect(state.sourceUri).toBeNull();
    expect(state.processedUri).toBeNull();
    expect(state.cropRatio).toBe("original");
    expect(state.format).toBe("jpeg");
  });

  it("calculates a centered 16:9 crop for a landscape image", () => {
    expect(centeredCrop(4000, 3000, "16:9")).toEqual({
      originX: 0,
      originY: 375,
      width: 4000,
      height: 2250,
    });
  });

  it("calculates a centered square crop for a portrait image", () => {
    expect(centeredCrop(1080, 1920, "1:1")).toEqual({
      originX: 0,
      originY: 420,
      width: 1080,
      height: 1080,
    });
  });

  it("keeps original bounds for the original ratio or invalid dimensions", () => {
    expect(centeredCrop(4000, 3000, "original")).toBeNull();
    expect(centeredCrop(0, 3000, "9:16")).toBeNull();
  });

  it("migrates partial stored photo data while preserving new optional fields", () => {
    const state = normalizePhotoEditState({
      sourceUri: "file:///photo.jpg",
      sourcePersistent: true,
      sourceWidth: 1920,
      sourceHeight: 1080,
      cropRatio: "16:9",
      format: "png",
      frame: "shadow",
      colorGrade: { brightness: 15 },
    });
    expect(state?.sourceUri).toBe("file:///photo.jpg");
    expect(state?.format).toBe("png");
    expect(state?.frame).toBe("shadow");
    expect(state?.captionColor).toBe("#FFFFFF");
    expect(state?.colorGrade).toMatchObject({ brightness: 15, contrast: 0, saturation: 0 });
  });
  it("rejects missing source markers and malformed persisted photo fields", () => {
    expect(normalizePhotoEditState({})).toBeNull();
    expect(normalizePhotoEditState({ sourceUri: null, sourceWidth: "wide" })).toBeNull();
    expect(normalizePhotoEditState({ sourceUri: null, format: "webp" })).toBeNull();
  });
});
