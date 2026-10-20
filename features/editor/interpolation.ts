import { DEFAULT_TRANSFORM, type Easing, type Keyframe, type SpeedPoint, type TransformValue } from "./model";

export function easeProgress(value: number, easing: Easing) {
  const t = Math.max(0, Math.min(1, value));
  switch (easing) {
    case "ease-in": return t * t;
    case "ease-out": return 1 - (1 - t) * (1 - t);
    case "ease-in-out": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default: return t;
  }
}

export function interpolateKeyframes(keyframes: Keyframe[], time: number, targetId?: string): TransformValue {
  const ordered = keyframes
    .filter((frame) => !targetId || frame.targetId === targetId)
    .slice()
    .sort((a, b) => a.time - b.time);
  if (ordered.length === 0) return DEFAULT_TRANSFORM;
  if (time <= ordered[0].time) return ordered[0].value;
  if (time >= ordered[ordered.length - 1].time) return ordered[ordered.length - 1].value;
  const afterIndex = ordered.findIndex((frame) => frame.time >= time);
  const before = ordered[afterIndex - 1];
  const after = ordered[afterIndex];
  const span = Math.max(0.0001, after.time - before.time);
  const t = easeProgress((time - before.time) / span, after.easing);
  return {
    x: mix(before.value.x, after.value.x, t),
    y: mix(before.value.y, after.value.y, t),
    scale: mix(before.value.scale, after.value.scale, t),
    rotation: mix(before.value.rotation, after.value.rotation, t),
    opacity: mix(before.value.opacity, after.value.opacity, t),
  };
}

export function speedAt(points: SpeedPoint[], time: number, fallback = 1) {
  const ordered = points.slice().sort((a, b) => a.time - b.time);
  if (!ordered.length) return fallback;
  if (time <= ordered[0].time) return ordered[0].speed;
  if (time >= ordered[ordered.length - 1].time) return ordered[ordered.length - 1].speed;
  const index = ordered.findIndex((point) => point.time >= time);
  const before = ordered[index - 1];
  const after = ordered[index];
  const t = easeProgress((time - before.time) / Math.max(0.0001, after.time - before.time), after.easing);
  return Math.max(0.25, Math.min(4, mix(before.speed, after.speed, t)));
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}
