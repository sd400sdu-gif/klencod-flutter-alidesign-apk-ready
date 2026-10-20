import { makeId, type TimelineItem, type TimelineTrack } from "./model";

const MIN_DURATION = 0.15;

export function getTimelineEnd(tracks: TimelineTrack[], minimum = 0): number {
  let end = Number.isFinite(minimum) ? Math.max(0, minimum) : 0;
  for (const track of tracks) {
    for (const item of track.items) {
      const itemEnd = item.start + item.duration;
      if (Number.isFinite(itemEnd)) end = Math.max(end, itemEnd);
    }
  }
  return end;
}

export function moveItem(item: TimelineItem, newStart: number): TimelineItem {
  return { ...item, start: Math.max(0, newStart) };
}

export function trimItemStart(item: TimelineItem, delta: number): TimelineItem {
  const nextIn = Math.max(0, Math.min(item.outPoint - MIN_DURATION, item.inPoint + delta));
  const consumed = nextIn - item.inPoint;
  return { ...item, start: Math.max(0, item.start + consumed), inPoint: nextIn, duration: Math.max(MIN_DURATION, item.outPoint - nextIn) };
}

export function trimItemEnd(item: TimelineItem, delta: number, maximum = Number.POSITIVE_INFINITY): TimelineItem {
  const nextOut = Math.max(item.inPoint + MIN_DURATION, Math.min(maximum, item.outPoint + delta));
  return { ...item, outPoint: nextOut, duration: Math.max(MIN_DURATION, nextOut - item.inPoint) };
}

export function splitItem(item: TimelineItem, localTime: number, ids: [string, string] = [makeId("clip"), makeId("clip")]): [TimelineItem, TimelineItem] | null {
  if (localTime < MIN_DURATION || localTime > item.duration - MIN_DURATION) return null;
  const cutPoint = item.inPoint + localTime;
  const left = { ...item, id: ids[0], outPoint: cutPoint, duration: cutPoint - item.inPoint };
  const right = { ...item, id: ids[1], start: item.start + localTime, inPoint: cutPoint, duration: item.outPoint - cutPoint };
  return [left, right];
}

export function copyItem(item: TimelineItem, start = item.start + item.duration): TimelineItem {
  return { ...item, id: makeId(item.kind), label: `${item.label} · نسخة`, start: Math.max(0, start) };
}

export function reorderItems(items: TimelineItem[], fromIndex: number, toIndex: number): TimelineItem[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  let cursor = 0;
  return next.map((entry) => {
    const positioned = { ...entry, start: Math.max(entry.start, cursor) };
    cursor = positioned.start + positioned.duration;
    return positioned;
  });
}

export function replaceTrackItems(tracks: TimelineTrack[], trackId: string, items: TimelineItem[]): TimelineTrack[] {
  return tracks.map((track) => track.id === trackId ? { ...track, items: items.slice().sort((a, b) => a.start - b.start) } : track);
}

export function removeItem(tracks: TimelineTrack[], itemId: string): TimelineTrack[] {
  return tracks.map((track) => ({ ...track, items: track.items.filter((item) => item.id !== itemId) }));
}

export function moveItemToTrack(tracks: TimelineTrack[], itemId: string, destinationTrackId: string): TimelineTrack[] {
  const source = tracks.find((track) => track.items.some((item) => item.id === itemId));
  const item = source?.items.find((candidate) => candidate.id === itemId);
  if (!item || !tracks.some((track) => track.id === destinationTrackId)) return tracks;
  return tracks.map((track) => {
    if (track.id === source?.id) return { ...track, items: track.items.filter((candidate) => candidate.id !== itemId) };
    if (track.id === destinationTrackId) return { ...track, items: [...track.items, { ...item, kind: track.kind }].sort((a, b) => a.start - b.start) };
    return track;
  });
}

export function makeDefaultTracks(): TimelineTrack[] {
  const kinds: [TimelineTrack["kind"], string][] = [
    ["video", "فيديو"], ["image", "صور"], ["text", "نصوص"], ["music", "موسيقى"], ["voice", "تعليق صوتي"], ["sfx", "مؤثرات صوتية"], ["sticker", "ملصقات"], ["effect", "مؤثرات بصرية"],
  ];
  return kinds.map(([kind, label]) => ({ id: `track-${kind}`, kind, label, items: [] }));
}
