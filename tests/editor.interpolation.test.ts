import { describe, expect, it } from "vitest";
import { interpolateKeyframes, speedAt } from "../features/editor/interpolation";
import type { Keyframe, SpeedPoint } from "../features/editor/model";

const frames: Keyframe[] = [
  { id: "a", targetId: "video", time: 0, value: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, easing: "linear" },
  { id: "b", targetId: "video", time: 10, value: { x: 100, y: 20, scale: 2, rotation: 90, opacity: 0.5 }, easing: "linear" },
];

describe("editor animation previews", () => {
  it("interpolates keyframed media transforms at the playhead", () => {
    expect(interpolateKeyframes(frames, 5, "video")).toEqual({ x: 50, y: 10, scale: 1.5, rotation: 45, opacity: 0.75 });
    expect(interpolateKeyframes(frames, -1, "video").x).toBe(0);
    expect(interpolateKeyframes(frames, 20, "video").scale).toBe(2);
  });
  it("returns a default transform when no matching target is keyed", () => {
    expect(interpolateKeyframes(frames, 5, "text")).toEqual({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
  });
  it("interpolates speed ramps without claiming generated frames", () => {
    const points: SpeedPoint[] = [
      { id: "a", time: 0, speed: 0.5, easing: "linear" },
      { id: "b", time: 10, speed: 2, easing: "linear" },
    ];
    expect(speedAt(points, 5)).toBe(1.25);
    expect(speedAt(points, 1)).toBeCloseTo(0.65);
    expect(speedAt([], 5, 1.5)).toBe(1.5);
  });
});
