import { describe, expect, it } from "vitest";
import { copyItem, getTimelineEnd, moveItem, splitItem, trimItemEnd, trimItemStart } from "../features/editor/timeline";
import type { TimelineItem } from "../features/editor/model";

const sample: TimelineItem = {
  id: "a", kind: "video", label: "لقطة", start: 2, duration: 8, inPoint: 0, outPoint: 8,
};

describe("timeline edit operations", () => {
  it("moves clips without allowing negative timeline positions", () => {
    expect(moveItem(sample, -4).start).toBe(0);
    expect(moveItem(sample, 5).start).toBe(5);
  });
  it("trims either edge while retaining a positive visible range", () => {
    expect(trimItemStart(sample, 2)).toMatchObject({ start: 4, inPoint: 2, duration: 6 });
    expect(trimItemEnd(sample, -3)).toMatchObject({ outPoint: 5, duration: 5 });
    expect(trimItemEnd(sample, -99).duration).toBeGreaterThan(0);
  });
  it("splits a clip into adjacent pieces retaining source in/out points", () => {
    const split = splitItem(sample, 3, ["left", "right"]);
    expect(split?.[0]).toMatchObject({ id: "left", start: 2, inPoint: 0, outPoint: 3, duration: 3 });
    expect(split?.[1]).toMatchObject({ id: "right", start: 5, inPoint: 3, outPoint: 8, duration: 5 });
    expect(splitItem(sample, 0.01)).toBeNull();
  });
  it("copies a clip to a new id without changing the source", () => {
    const clone = copyItem(sample, 10);
    expect(clone).toMatchObject({ label: "لقطة · نسخة", start: 10, duration: 8 });
    expect(clone.id).not.toBe(sample.id);
    expect(sample.start).toBe(2);
  });
  it("extends the project timeline to the end of a moved or lengthened audio track", () => {
    const tracks = [
      { id: "video", kind: "video" as const, label: "فيديو", items: [sample] },
      { id: "music", kind: "music" as const, label: "موسيقى", items: [{ ...sample, id: "music-1", kind: "music" as const, start: 17, duration: 28 }] },
    ];
    expect(getTimelineEnd(tracks, 10)).toBe(45);
    expect(getTimelineEnd(tracks, 60)).toBe(60);
  });
});
