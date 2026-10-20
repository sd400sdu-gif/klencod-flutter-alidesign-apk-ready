import { describe, expect, it } from "vitest";
import { createDefaultDocument, normalizeEditorDocument } from "../features/editor/defaults";
import type { EditorDocument } from "../features/editor/model";

describe("persisted editor document validation", () => {
  it("accepts the current document and fills fields absent in older records", () => {
    const current = createDefaultDocument();
    expect(normalizeEditorDocument(current)).not.toBeNull();

    const legacy: Record<string, unknown> = { tracks: current.tracks, playhead: 0 };
    const restored = normalizeEditorDocument(legacy);
    expect(restored?.effects).toEqual([]);
    expect(restored?.audioSettings.voiceDuckingGain).toBeGreaterThan(0);
  });

  it("rejects invalid track and item shapes instead of rendering a default project", () => {
    const current = createDefaultDocument();
    expect(normalizeEditorDocument({ ...current, tracks: [null] })).toBeNull();

    const videoTrack = current.tracks.find((track) => track.kind === "video");
    expect(videoTrack).toBeDefined();
    expect(normalizeEditorDocument({
      ...current,
      tracks: [{ ...videoTrack, items: [null] }],
    })).toBeNull();
  });

  it("rejects invalid optional nested values and duplicate identifiers", () => {
    const current = createDefaultDocument();
    const malformedTransforms = { ...current, baseTransforms: { video: null } } as unknown as EditorDocument;
    expect(normalizeEditorDocument(malformedTransforms)).toBeNull();
    expect(normalizeEditorDocument({ ...current, keyframes: [null] })).toBeNull();

    const firstTrack = current.tracks[0];
    expect(normalizeEditorDocument({ ...current, tracks: [firstTrack, { ...firstTrack, items: [] }] })).toBeNull();
  });

  it("rejects incomplete saved color presets instead of restoring missing grade values", () => {
    const current = createDefaultDocument();
    expect(normalizeEditorDocument({
      ...current,
      favoriteColorPresets: [{ id: "partial", label: "Preset ناقص", values: { brightness: 1 } }],
    })).toBeNull();
  });
});
